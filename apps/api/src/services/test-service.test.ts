import { describe, expect, test } from "bun:test";

import type { ContentRepository } from "@/repositories/content-repository";
import type { CourseRepository } from "@/repositories/course-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { TestRepository } from "@/repositories/test-repository";
import type { ProgressService } from "@/services/progress-service";
import { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import { TestService } from "@/services/test-service";
import { ForbiddenError, ValidationError } from "@/utils/errors";

/**
 * Characterisation tests for grading and submission state. ADR-0005 builds on
 * these: "passing" a Test becomes a real concept scored against
 * tests.passingScore, which today is stored and never evaluated. Grading itself
 * is not expected to change.
 */

interface QuestionSpec {
  id: string;
  marks: number;
  type: "MCQ" | "WRITTEN";
}

interface OptionSpec {
  id: string;
  isCorrect: boolean;
  questionId: string;
}

interface Overrides {
  isPublished?: boolean;
  latestSubmissionStatus?: string | null;
  options?: readonly OptionSpec[];
  passingScore?: number | null;
  questions?: readonly QuestionSpec[];
}

interface Calls {
  createdSubmissions: number;
  promotionChecks: number;
  submissionUpdates: Record<string, unknown>[];
}

const defaultQuestions: readonly QuestionSpec[] = [
  { id: "q1", marks: 5, type: "MCQ" },
  { id: "q2", marks: 5, type: "MCQ" }
];

const defaultOptions: readonly OptionSpec[] = [
  { id: "o1a", isCorrect: true, questionId: "q1" },
  { id: "o1b", isCorrect: false, questionId: "q1" },
  { id: "o2a", isCorrect: true, questionId: "q2" },
  { id: "o2b", isCorrect: false, questionId: "q2" }
];

function buildService(overrides: Overrides = {}): { calls: Calls; service: TestService } {
  const calls: Calls = { createdSubmissions: 0, promotionChecks: 0, submissionUpdates: [] };
  const questions = overrides.questions ?? defaultQuestions;
  const options = overrides.options ?? defaultOptions;

  const submission = {
    createdAt: new Date("2026-01-01T00:00:00Z"),
    feedback: null,
    gradedAt: null,
    id: "sub-1",
    maxScore: null,
    score: null,
    startedAt: new Date("2026-01-01T00:00:00Z"),
    status: overrides.latestSubmissionStatus ?? "STARTED",
    submittedAt: null,
    testId: "test-1",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    userId: "user-1"
  };

  const testRepository = {
    createSubmission: async () => {
      calls.createdSubmissions += 1;

      return { ...submission, status: "STARTED" };
    },
    findLatestSubmissionByTestAndUser: async () =>
      overrides.latestSubmissionStatus === null ? null : submission,
    findTestById: async () => ({
      chapterId: "chap-1",
      id: "test-1",
      isPublished: overrides.isPublished ?? true,
      passingScore: overrides.passingScore ?? null,
      title: "Chapter 1 Test"
    }),
    listAnswersBySubmissionIds: async () => [],
    listOptionsByQuestionIds: async () => options,
    listQuestionsByTestId: async () => questions,
    replaceSubmissionAnswers: async () => undefined,
    updateSubmission: async (_id: string, patch: Record<string, unknown>) => {
      calls.submissionUpdates.push(patch);

      return { ...submission, ...patch };
    }
  } as unknown as TestRepository;

  const contentRepository = {
    findChapterById: async () => ({ courseId: "course-1", id: "chap-1" })
  } as unknown as ContentRepository;

  const courseRepository = {
    findById: async () => ({ id: "course-1", status: "PUBLISHED", title: "HSC Physics" })
  } as unknown as CourseRepository;

  const enrollmentRepository = {
    findByUserAndCourse: async () => ({
      cancelledAt: null,
      courseId: "course-1",
      id: "enrol-1",
      status: "ACTIVE",
      userId: "user-1"
    }),
    hasCourseAccess: async () => true
  } as unknown as EnrollmentRepository;

  const progressService = {
    promoteIfFinished: async () => {
      calls.promotionChecks += 1;

      return { id: "enrol-1", status: "ACTIVE" };
    }
  } as unknown as ProgressService;

  // The guards are the real ones over the stub repositories: the access rules
  // are part of what these tests exercise.
  const access = new AssessmentAccessGuards(
    testRepository,
    contentRepository,
    courseRepository,
    enrollmentRepository
  );

  return {
    calls,
    service: new TestService(
      testRepository,
      contentRepository,
      enrollmentRepository,
      access,
      progressService
    )
  };
}

describe("TestService.submitTest — MCQ auto-grading", () => {
  test("all correct scores full marks and grades immediately", async () => {
    const { calls, service } = buildService();

    await service.submitTest(
      "test-1",
      { answers: [
        { questionId: "q1", selectedOptionId: "o1a" },
        { questionId: "q2", selectedOptionId: "o2a" }
      ] },
      "user-1",
      "STUDENT"
    );

    const patch = calls.submissionUpdates[0];

    expect(patch?.score).toBe(10);
    expect(patch?.maxScore).toBe(10);
    expect(patch?.status).toBe("GRADED");
  });

  test("a wrong option scores zero for that question", async () => {
    const { calls, service } = buildService();

    await service.submitTest(
      "test-1",
      { answers: [
        { questionId: "q1", selectedOptionId: "o1a" },
        { questionId: "q2", selectedOptionId: "o2b" }
      ] },
      "user-1",
      "STUDENT"
    );

    expect(calls.submissionUpdates[0]?.score).toBe(5);
    expect(calls.submissionUpdates[0]?.maxScore).toBe(10);
  });

  test("an option belonging to another question is rejected", async () => {
    const { service } = buildService();

    await expect(
      service.submitTest(
        "test-1",
        { answers: [{ questionId: "q1", selectedOptionId: "o2a" }] },
        "user-1",
        "STUDENT"
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("an answer for an unknown question is rejected", async () => {
    const { service } = buildService();

    await expect(
      service.submitTest(
        "test-1",
        { answers: [{ questionId: "ghost", selectedOptionId: "o1a" }] },
        "user-1",
        "STUDENT"
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("TestService.submitTest — SUBMITTED vs GRADED", () => {
  test("a written question leaves the submission awaiting a teacher", async () => {
    const { calls, service } = buildService({
      options: [
        { id: "o1a", isCorrect: true, questionId: "q1" },
        { id: "o1b", isCorrect: false, questionId: "q1" }
      ],
      questions: [
        { id: "q1", marks: 5, type: "MCQ" },
        { id: "q2", marks: 10, type: "WRITTEN" }
      ]
    });

    await service.submitTest(
      "test-1",
      { answers: [
        { questionId: "q1", selectedOptionId: "o1a" },
        { questionId: "q2", writtenAnswer: "Because force equals mass times acceleration." }
      ] },
      "user-1",
      "STUDENT"
    );

    const patch = calls.submissionUpdates[0];

    expect(patch?.status).toBe("SUBMITTED");
    expect(patch?.score).toBe(5);
    expect(patch?.maxScore).toBe(15);
  });

  test("a pure-MCQ test needs no teacher and lands GRADED", async () => {
    const { calls, service } = buildService();

    await service.submitTest(
      "test-1",
      { answers: [
        { questionId: "q1", selectedOptionId: "o1a" },
        { questionId: "q2", selectedOptionId: "o2a" }
      ] },
      "user-1",
      "STUDENT"
    );

    expect(calls.submissionUpdates[0]?.status).toBe("GRADED");
  });
});

describe("TestService.submitTest — retakes and access", () => {
  test("CURRENT BEHAVIOUR: retakes are unlimited", async () => {
    // A prior GRADED submission does not block a fresh attempt; a new one is
    // created. ADR-0005 keeps this and takes the best attempt when deciding
    // whether the Test is passed.
    const { calls, service } = buildService({ latestSubmissionStatus: "GRADED" });

    await service.submitTest(
      "test-1",
      { answers: [
        { questionId: "q1", selectedOptionId: "o1a" },
        { questionId: "q2", selectedOptionId: "o2a" }
      ] },
      "user-1",
      "STUDENT"
    );

    expect(calls.createdSubmissions).toBe(1);
  });

  test("a student cannot sit an unpublished test", async () => {
    const { service } = buildService({ isPublished: false });

    await expect(
      service.submitTest(
        "test-1",
        { answers: [{ questionId: "q1", selectedOptionId: "o1a" }] },
        "user-1",
        "STUDENT"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("GAP: passingScore is stored but never evaluated", async () => {
    // The service records a score and nothing compares it to passingScore, so
    // "passed" cannot be expressed today. ADR-0005 makes it load-bearing.
    const { calls, service } = buildService({ passingScore: 8 });

    await service.submitTest(
      "test-1",
      { answers: [
        { questionId: "q1", selectedOptionId: "o1a" },
        { questionId: "q2", selectedOptionId: "o2b" }
      ] },
      "user-1",
      "STUDENT"
    );

    const patch = calls.submissionUpdates[0];

    expect(patch?.score).toBe(5);
    expect(patch).not.toHaveProperty("isPassed");
    expect(patch?.status).toBe("GRADED");
  });
});
