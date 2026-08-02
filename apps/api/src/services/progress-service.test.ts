import { describe, expect, test } from "bun:test";

import type { ContentRepository } from "@/repositories/content-repository";
import type { EnrollmentRecord, EnrollmentRepository } from "@/repositories/enrollment-repository";
import { ProgressService } from "@/services/progress-service";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

/**
 * Characterisation tests for completion. ADR-0005 changes three things here:
 * completion will require passing every published Test as well as watching
 * every Lecture, the `totalLectures > 0` guard goes away so exam-only courses
 * can complete, and promotion moves out of the read path entirely. Every test
 * below marked CURRENT BEHAVIOUR is expected to change in Stage 2.
 */

interface Overrides {
  completedLectureIds?: readonly string[];
  enrollmentStatus?: EnrollmentRecord["status"];
  hasAccess?: boolean;
  lectureIds?: readonly string[];
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

  return { calls, service: new ProgressService(enrollmentRepository, contentRepository) };
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

  test("CURRENT BEHAVIOUR: merely reading progress can promote to COMPLETED", async () => {
    // ADR-0005 moves promotion out of the read path. After Stage 2 this read
    // must record zero status updates.
    const { calls, service } = buildService({ completedLectureIds: ["lec-1", "lec-2"] });
    const result = await service.getCourseProgress("course-1", "user-1");

    expect(calls.statusUpdates).toEqual([{ id: "enrol-1", status: "COMPLETED" }]);
    expect(result.enrollmentStatus).toBe("COMPLETED");
    expect(result.nextLectureId).toBeNull();
  });

  test("an already-complete enrolment is not promoted twice", async () => {
    const { calls, service } = buildService({
      completedLectureIds: ["lec-1", "lec-2"],
      enrollmentStatus: "COMPLETED"
    });

    await service.getCourseProgress("course-1", "user-1");

    expect(calls.statusUpdates).toHaveLength(0);
  });

  test("CURRENT BEHAVIOUR: a course with no lectures can never complete", async () => {
    // This is the `totalLectures > 0` guard, and it is why an Exam-Only Course
    // can never be completed today. ADR-0005 removes it.
    const { calls, service } = buildService({ lectureIds: [] });
    const result = await service.getCourseProgress("course-1", "user-1");

    expect(result.totalLectures).toBe(0);
    expect(result.completionPercentage).toBe(0);
    expect(result.enrollmentStatus).toBe("ACTIVE");
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
    const { calls, service } = buildService({ completedLectureIds: ["lec-1", "lec-2"] });
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
