import { describe, expect, test } from "bun:test";

import type { AnswerScriptRepository } from "@/repositories/answer-script-repository";
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
}

interface OptionSpec {
  id: string;
  isCorrect: boolean;
  questionId: string;
}

interface SubmissionHistoryRecord {
  createdAt: Date;
  id: string;
  status: string;
  userEmail: string;
  userId: string;
  userName: string;
}

interface Overrides {
  completedAttempts?: number;
  testType?: "MCQ" | "WRITTEN";
  isPublished?: boolean;
  latestSubmissionStatus?: string | null;
  lockAnswerOnSelect?: boolean;
  maxAttempts?: number | null;
  options?: readonly OptionSpec[];
  passingScore?: number | null;
  questions?: readonly QuestionSpec[];
  submissionHistory?: readonly SubmissionHistoryRecord[];
}

interface Calls {
  createdSubmissions: number;
  promotionChecks: number;
  submissionUpdates: Record<string, unknown>[];
  testUpdates: Record<string, unknown>[];
}

const defaultQuestions: readonly QuestionSpec[] = [
  { id: "q1", marks: 5 },
  { id: "q2", marks: 5 }
];

const defaultOptions: readonly OptionSpec[] = [
  { id: "o1a", isCorrect: true, questionId: "q1" },
  { id: "o1b", isCorrect: false, questionId: "q1" },
  { id: "o2a", isCorrect: true, questionId: "q2" },
  { id: "o2b", isCorrect: false, questionId: "q2" }
];

function buildService(overrides: Overrides = {}): { calls: Calls; service: TestService } {
  const calls: Calls = {
    createdSubmissions: 0,
    promotionChecks: 0,
    submissionUpdates: [],
    testUpdates: []
  };
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
    countCompletedSubmissionsByTestIds: async () =>
      new Map(overrides.completedAttempts !== undefined ? [["test-1", overrides.completedAttempts]] : []),
    findLatestSubmissionByTestAndUser: async () =>
      overrides.latestSubmissionStatus === null ? null : submission,
    findSubmissionById: async () => submission,
    findTestById: async () => ({
      chapterId: "chap-1",
      id: "test-1",
      isPublished: overrides.isPublished ?? true,
      lockAnswerOnSelect: overrides.lockAnswerOnSelect ?? false,
      maxAttempts: overrides.maxAttempts ?? null,
      passingScore: overrides.passingScore ?? null,
      title: "Chapter 1 Test",
      type: overrides.testType ?? "MCQ"
    }),
    listAnswersBySubmissionIds: async () =>
      overrides.lockAnswerOnSelect
        ? [{ questionId: "q1", selectedOptionId: "o1a" }]
        : [],
    listOptionsByQuestionIds: async () => options,
    listQuestionImagesByQuestionIds: async () => [],
    listQuestionsByTestId: async () => questions,
    listSubmissionsByTestAndUser: async (_testId: string, userId: string) =>
      (
        overrides.submissionHistory ?? [
          { ...submission, userEmail: "student@example.com", userName: "Student" }
        ]
      ).filter((record) => record.userId === userId),
    listSubmissionsByTestId: async () =>
      overrides.submissionHistory ?? [
        { ...submission, userEmail: "student@example.com", userName: "Student" }
      ],
    upsertSubmissionAnswers: async () => undefined,
    updateSubmission: async (_id: string, patch: Record<string, unknown>) => {
      calls.submissionUpdates.push(patch);

      return { ...submission, ...patch };
    },
    updateTest: async (_id: string, patch: Record<string, unknown>) => {
      calls.testUpdates.push(patch);

      return {
        chapterId: "chap-1",
        description: null,
        durationInMinutes: null,
        id: "test-1",
        isPublished: true,
        lockAnswerOnSelect: false,
        maxAttempts: null,
        passingScore: null,
        sortOrder: 0,
        title: "Chapter 1 Test",
        type: "MCQ",
        ...patch
      };
    }
  } as unknown as TestRepository;

  const contentRepository = {
    findChapterById: async () => ({ courseId: "course-1", id: "chap-1" })
  } as unknown as ContentRepository;

  const courseRepository = {
    findById: async () => ({
      creator: { id: "teacher-1", name: "Teacher", role: "TEACHER" },
      id: "course-1",
      status: "PUBLISHED",
      teachers: [],
      title: "HSC Physics"
    })
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

  const answerScriptRepository = {
    listScriptPagesByAnswerIds: async () => []
  } as unknown as AnswerScriptRepository;

  return {
    calls,
    service: new TestService(
      testRepository,
      answerScriptRepository,
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
  test("a written paper waits for a teacher and carries no score yet", async () => {
    const { calls, service } = buildService({
      questions: [
        { id: "q1", marks: 5 },
        { id: "q2", marks: 10 }
      ],
      testType: "WRITTEN"
    });

    await service.submitTest("test-1", { answers: [] }, "user-1", "STUDENT");

    const patch = calls.submissionUpdates[0];

    expect(patch?.status).toBe("SUBMITTED");
    expect(patch?.score).toBeNull();
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

  test("passingScore is evaluated into a passed verdict on the response", async () => {
    const { service } = buildService({ passingScore: 8 });

    const detail = await service.submitTest(
      "test-1",
      { answers: [
        { questionId: "q1", selectedOptionId: "o1a" },
        { questionId: "q2", selectedOptionId: "o2b" }
      ] },
      "user-1",
      "STUDENT"
    );

    expect(detail.score).toBe(5);
    expect(detail.passed).toBe(false);
  });
});

describe("TestService — max attempts", () => {
  test("starting a new attempt beyond maxAttempts is rejected", async () => {
    const { service } = buildService({
      completedAttempts: 2,
      latestSubmissionStatus: null,
      maxAttempts: 2
    });

    await expect(service.startSubmission("test-1", "user-1", "STUDENT")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  test("resuming a STARTED submission does not consume an attempt", async () => {
    const { calls, service } = buildService({
      completedAttempts: 2,
      latestSubmissionStatus: "STARTED",
      maxAttempts: 2
    });

    const detail = await service.startSubmission("test-1", "user-1", "STUDENT");

    expect(detail.id).toBe("sub-1");
    expect(calls.createdSubmissions).toBe(0);
  });

  test("an attempt within the cap is allowed", async () => {
    const { calls, service } = buildService({
      completedAttempts: 1,
      latestSubmissionStatus: null,
      maxAttempts: 2
    });

    await service.startSubmission("test-1", "user-1", "STUDENT");

    expect(calls.createdSubmissions).toBe(1);
  });
});

describe("TestService.saveSubmissionAnswers — lock answer on select", () => {
  test("changing a previously selected option is rejected when locked", async () => {
    const { service } = buildService({ lockAnswerOnSelect: true });

    await expect(
      service.saveSubmissionAnswers(
        "sub-1",
        { answers: [{ questionId: "q1", selectedOptionId: "o1b" }] },
        "user-1",
        "STUDENT"
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("resubmitting the same selection is allowed when locked", async () => {
    const { service } = buildService({ lockAnswerOnSelect: true });

    await expect(
      service.saveSubmissionAnswers(
        "sub-1",
        { answers: [{ questionId: "q1", selectedOptionId: "o1a" }] },
        "user-1",
        "STUDENT"
      )
    ).resolves.toBeDefined();
  });

  test("answering an unanswered question is allowed when locked", async () => {
    const { service } = buildService({ lockAnswerOnSelect: true });

    await expect(
      service.saveSubmissionAnswers(
        "sub-1",
        { answers: [{ questionId: "q2", selectedOptionId: "o2a" }] },
        "user-1",
        "STUDENT"
      )
    ).resolves.toBeDefined();
  });
});

describe("TestService.updateTest — maxAttempts", () => {
  test("an explicit null clears a previously set cap", async () => {
    const { calls, service } = buildService({ maxAttempts: 3 });

    await service.updateTest("test-1", { maxAttempts: null }, "admin-1", "ADMIN");

    expect(calls.testUpdates[0]?.maxAttempts).toBeNull();
  });
});

describe("TestService — attempt history", () => {
  const twoAttemptsByOneStudent: readonly SubmissionHistoryRecord[] = [
    {
      createdAt: new Date("2026-01-05T00:00:00Z"),
      id: "sub-2",
      status: "GRADED",
      userEmail: "student@example.com",
      userId: "user-1",
      userName: "Student"
    },
    {
      createdAt: new Date("2026-01-01T00:00:00Z"),
      id: "sub-1",
      status: "GRADED",
      userEmail: "student@example.com",
      userId: "user-1",
      userName: "Student"
    }
  ];

  test("listMySubmissions numbers attempts oldest-first regardless of input order", async () => {
    const { service } = buildService({ submissionHistory: twoAttemptsByOneStudent });

    const submissions = await service.listMySubmissions("test-1", "user-1", "STUDENT");
    const byId = new Map(submissions.map((submission) => [submission.id, submission.attemptNumber]));

    expect(byId.get("sub-1")).toBe(1);
    expect(byId.get("sub-2")).toBe(2);
  });

  test("listSubmissions numbers attempts per student, not globally", async () => {
    const bothStudents: readonly SubmissionHistoryRecord[] = [
      ...twoAttemptsByOneStudent,
      {
        createdAt: new Date("2026-01-03T00:00:00Z"),
        id: "sub-3",
        status: "GRADED",
        userEmail: "other@example.com",
        userId: "user-2",
        userName: "Other Student"
      }
    ];
    const { service } = buildService({ submissionHistory: bothStudents });

    const submissions = await service.listSubmissions("test-1", "teacher-1", "TEACHER");
    const byId = new Map(submissions.map((submission) => [submission.id, submission.attemptNumber]));

    expect(byId.get("sub-1")).toBe(1);
    expect(byId.get("sub-2")).toBe(2);
    expect(byId.get("sub-3")).toBe(1);
  });
});

describe("TestService.getTestDetail — answer reveal", () => {
  test("a student with no completed submission never sees the correct answers", async () => {
    const { service } = buildService({ completedAttempts: 0 });

    const detail = await service.getTestDetail("test-1", "user-1", "STUDENT", true);

    expect(detail.questions[0]?.options[0]?.isCorrect).toBeNull();
    expect(detail.questions[0]?.markingGuide).toBeNull();
  });

  test("a student gets answers only after a completed submission", async () => {
    const { service } = buildService({ completedAttempts: 1 });

    const detail = await service.getTestDetail("test-1", "user-1", "STUDENT", true);

    expect(detail.questions[0]?.options[0]?.isCorrect).toBe(true);
  });

  test("a student gets answers only when they ask to reveal them", async () => {
    const { service } = buildService({ completedAttempts: 1 });

    const detail = await service.getTestDetail("test-1", "user-1", "STUDENT", false);

    expect(detail.questions[0]?.options[0]?.isCorrect).toBeNull();
  });

  test("a teacher always sees correct answers without a submission", async () => {
    const { service } = buildService();

    const detail = await service.getTestDetail("test-1", "teacher-1", "TEACHER", false);

    expect(detail.questions[0]?.options[0]?.isCorrect).toBe(true);
  });
});
