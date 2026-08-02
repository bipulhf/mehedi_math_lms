import { describe, expect, test } from "bun:test";

import type { ContentRepository } from "@/repositories/content-repository";
import type { EnrollmentRecord, EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { CourseTestResultRecord, TestRepository } from "@/repositories/test-repository";
import { ProgressService } from "@/services/progress-service";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

/**
 * Completion under ADR-0005: every Lecture watched and every published Test
 * passed, caused by a student action and never by a read, and latching once
 * reached. An Exam-Only Course has no lectures, so only its Tests decide.
 */

interface Overrides {
  completedLectureIds?: readonly string[];
  enrollmentStatus?: EnrollmentRecord["status"];
  hasAccess?: boolean;
  lectureIds?: readonly string[];
  testResults?: readonly CourseTestResultRecord[];
}

interface Calls {
  statusUpdates: { id: string; status: string }[];
}

function buildService(overrides: Overrides = {}): { calls: Calls; service: ProgressService } {
  const calls: Calls = { statusUpdates: [] };
  const lectureIds = overrides.lectureIds ?? ["lec-1", "lec-2"];
  const completedLectureIds = overrides.completedLectureIds ?? [];
  const enrollment = {
    courseId: "course-1",
    id: "enrol-1",
    status: overrides.enrollmentStatus ?? "ACTIVE",
    userId: "user-1"
  } as unknown as EnrollmentRecord;

  const enrollmentRepository = {
    createProgress: async () => ({ id: "prog-new" }),
    findByUserAndCourse: async () => enrollment,
    findProgressByEnrollmentAndLecture: async () => null,
    hasCourseAccess: async () => overrides.hasAccess ?? true,
    listProgressByEnrollment: async () =>
      completedLectureIds.map((lectureId) => ({
        completedAt: new Date("2026-01-01T00:00:00Z"),
        enrollmentId: "enrol-1",
        id: `prog-${lectureId}`,
        isCompleted: true,
        lastViewedAt: new Date("2026-01-01T00:00:00Z"),
        lectureId
      })),
    updateProgress: async () => ({ id: "prog-1" }),
    updateStatus: async (id: string, status: string) => {
      calls.statusUpdates.push({ id, status });

      return { ...enrollment, status } as EnrollmentRecord;
    }
  } as unknown as EnrollmentRepository;

  const contentRepository = {
    findLectureById: async (lectureId: string) =>
      lectureIds.includes(lectureId)
        ? { chapterId: "chap-1", courseId: "course-1", id: lectureId }
        : null,
    listCourseChapters: async () => [{ id: "chap-1" }],
    listLecturesByChapterIds: async () =>
      lectureIds.map((id) => ({ chapterId: "chap-1", id }))
  } as unknown as ContentRepository;

  const testRepository = {
    listCourseTestResults: async () => overrides.testResults ?? []
  } as unknown as TestRepository;

  return {
    calls,
    service: new ProgressService(enrollmentRepository, contentRepository, testRepository)
  };
}

describe("ProgressService.getCourseProgress", () => {
  test("no access is refused", async () => {
    const { service } = buildService({ hasAccess: false });

    await expect(service.getCourseProgress("course-1", "user-1")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  test("reports percentage and the next unwatched lecture", async () => {
    const { service } = buildService({ completedLectureIds: ["lec-1"] });
    const result = await service.getCourseProgress("course-1", "user-1");

    expect(result.totalLectures).toBe(2);
    expect(result.completedLectures).toBe(1);
    expect(result.completionPercentage).toBe(50);
    expect(result.nextLectureId).toBe("lec-2");
  });

  test("reading progress never promotes", async () => {
    // ADR-0005. A read must not write, which is also what stops a lecture
    // deletion from silently graduating whoever was waiting on it.
    const { calls, service } = buildService({ completedLectureIds: ["lec-1", "lec-2"] });
    const result = await service.getCourseProgress("course-1", "user-1");

    expect(calls.statusUpdates).toHaveLength(0);
    expect(result.enrollmentStatus).toBe("ACTIVE");
    expect(result.nextLectureId).toBeNull();
  });

  test("REGRESSION: deleting the last unwatched lecture does not complete anybody", async () => {
    // The student watched lec-1; lec-2 has since been deleted, so the course
    // now contains only what they finished. Before ADR-0005 the next read
    // promoted them and issued a certificate. It must not.
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1"],
      lectureIds: ["lec-1"]
    });
    const result = await service.getCourseProgress("course-1", "user-1");

    expect(result.completionPercentage).toBe(100);
    expect(calls.statusUpdates).toHaveLength(0);
    expect(result.enrollmentStatus).toBe("ACTIVE");
  });

  test("an already-complete enrolment is not promoted twice", async () => {
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1", "lec-2"],
      enrollmentStatus: "COMPLETED"
    });

    await service.getCourseProgress("course-1", "user-1");

    expect(calls.statusUpdates).toHaveLength(0);
  });

  test("a course with no lectures reports zero progress", async () => {
    const { service } = buildService({ lectureIds: [] });
    const result = await service.getCourseProgress("course-1", "user-1");

    expect(result.totalLectures).toBe(0);
    expect(result.completionPercentage).toBe(0);
  });
});

describe("ProgressService.promoteIfFinished", () => {
  const enrollment = {
    cancelledAt: null,
    courseId: "course-1",
    id: "enrol-1",
    status: "ACTIVE",
    userId: "user-1"
  } as unknown as EnrollmentRecord;

  test("an Exam-Only Course completes on passing its tests alone", async () => {
    // No lectures at all. Before ADR-0005 the totalLectures > 0 guard made this
    // impossible, so exam-only courses could never be completed or certified.
    const { calls, service } = buildService({
      lectureIds: [],
      testResults: [{ bestGradedScore: 9, passingScore: 8, testId: "test-1" }]
    });

    await service.promoteIfFinished("course-1", enrollment);

    expect(calls.statusUpdates).toEqual([{ id: "enrol-1", status: "COMPLETED" }]);
  });

  test("a failed test blocks completion even with every lecture watched", async () => {
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1", "lec-2"],
      testResults: [{ bestGradedScore: 3, passingScore: 8, testId: "test-1" }]
    });

    await service.promoteIfFinished("course-1", enrollment);

    expect(calls.statusUpdates).toHaveLength(0);
  });

  test("the best attempt is what counts across retakes", async () => {
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1", "lec-2"],
      testResults: [{ bestGradedScore: 8, passingScore: 8, testId: "test-1" }]
    });

    await service.promoteIfFinished("course-1", enrollment);

    expect(calls.statusUpdates).toEqual([{ id: "enrol-1", status: "COMPLETED" }]);
  });

  test("an ungraded written test blocks completion", async () => {
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1", "lec-2"],
      testResults: [{ bestGradedScore: null, passingScore: null, testId: "test-1" }]
    });

    await service.promoteIfFinished("course-1", enrollment);

    expect(calls.statusUpdates).toHaveLength(0);
  });

  test("a null passing score is cleared by any graded attempt", async () => {
    // The threshold is opt-in. Tests written before passingScore meant anything
    // must not become impossible to pass.
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1", "lec-2"],
      testResults: [{ bestGradedScore: 0, passingScore: null, testId: "test-1" }]
    });

    await service.promoteIfFinished("course-1", enrollment);

    expect(calls.statusUpdates).toEqual([{ id: "enrol-1", status: "COMPLETED" }]);
  });

  test("completion latches: an already-complete enrolment is left alone", async () => {
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1"],
      lectureIds: ["lec-1", "lec-2"],
      testResults: []
    });

    await service.promoteIfFinished("course-1", {
      ...enrollment,
      status: "COMPLETED"
    } as EnrollmentRecord);

    expect(calls.statusUpdates).toHaveLength(0);
  });
});

describe("ProgressService.markLectureComplete", () => {
  test("an unknown lecture is rejected", async () => {
    const { service } = buildService();

    await expect(service.markLectureComplete("nope", "user-1")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("completing the final lecture promotes the enrolment", async () => {
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1", "lec-2"],
      testResults: []
    });
    const result = await service.markLectureComplete("lec-2", "user-1");

    expect(result.completionPercentage).toBe(100);
    expect(calls.statusUpdates).toEqual([{ id: "enrol-1", status: "COMPLETED" }]);
  });

  test("completing a middle lecture does not promote", async () => {
    const { calls, service } = buildService({ completedLectureIds: ["lec-1"] });

    await service.markLectureComplete("lec-1", "user-1");

    expect(calls.statusUpdates).toHaveLength(0);
  });
});
