import { describe, expect, test } from "bun:test";

import type { AnswerScriptRepository } from "@/repositories/answer-script-repository";
import type { TestRepository } from "@/repositories/test-repository";
import type { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import type { NotificationService } from "@/services/notification-service";
import { PaperMarkingService } from "@/services/paper-marking-service";
import type { TestSubmissionService } from "@/services/test-submission-service";
import { ConflictError, ForbiddenError, ValidationError } from "@/utils/errors";

interface AnswerSpec {
  awardedMarks: number | null;
  id: string;
  pageCount: number;
  questionId: string;
}

interface Overrides {
  answers?: readonly AnswerSpec[];
  lockHeldByOther?: boolean;
  status?: "STARTED" | "SUBMITTED" | "GRADED";
  testType?: "MCQ" | "WRITTEN";
}

interface Calls {
  notified: string[];
  submissionUpdates: Record<string, unknown>[];
  upserts: Record<string, unknown>[][];
}

const questions = [
  { id: "q1", markingGuide: null, marks: 5, questionText: "One", sortOrder: 0, testId: "test-1" },
  { id: "q2", markingGuide: null, marks: 10, questionText: "Two", sortOrder: 1, testId: "test-1" }
];

function buildService(overrides: Overrides = {}): { calls: Calls; service: PaperMarkingService } {
  const calls: Calls = { notified: [], submissionUpdates: [], upserts: [] };
  const answers = overrides.answers ?? [
    { awardedMarks: 3, id: "a1", pageCount: 2, questionId: "q1" },
    { awardedMarks: 8, id: "a2", pageCount: 1, questionId: "q2" }
  ];
  const submission = {
    id: "sub-1",
    status: overrides.status ?? "SUBMITTED",
    testId: "test-1",
    userId: "student-1"
  };

  const testRepository = {
    findQuestionById: async (id: string) => questions.find((question) => question.id === id) ?? null,
    findSubmissionAnswerById: async (id: string) => {
      const answer = answers.find((item) => item.id === id);

      return answer
        ? {
            awardedMarks: answer.awardedMarks,
            id: answer.id,
            isCorrect: null,
            questionId: answer.questionId,
            selectedOptionId: null,
            submissionId: "sub-1"
          }
        : null;
    },
    findSubmissionById: async () => submission,
    listAnswersBySubmissionIds: async () =>
      answers.map((answer) => ({
        awardedMarks: answer.awardedMarks,
        id: answer.id,
        isCorrect: null,
        questionId: answer.questionId,
        selectedOptionId: null,
        submissionId: "sub-1"
      })),
    listQuestionsByTestId: async () => questions,
    updateSubmission: async (_id: string, patch: Record<string, unknown>) => {
      calls.submissionUpdates.push(patch);

      return { ...submission, ...patch };
    },
    updateSubmissionAnswer: async (id: string, patch: Record<string, unknown>) => ({
      awardedMarks: patch.awardedMarks as number,
      id
    }),
    upsertSubmissionAnswers: async (input: { answers: Record<string, unknown>[] }) => {
      calls.upserts.push(input.answers);
    }
  } as unknown as TestRepository;

  const answerScriptRepository = {
    acquireMarkingLock: async () => !overrides.lockHeldByOther,
    listMarkingLocksByAnswerIds: async () =>
      overrides.lockHeldByOther
        ? [
            {
              expiresAt: new Date("2026-01-01T00:02:00Z"),
              lockedById: "teacher-2",
              lockedByName: "Nadia",
              submissionAnswerId: "a1"
            }
          ]
        : [],
    listScriptPagesByAnswerIds: async () =>
      answers.flatMap((answer) =>
        Array.from({ length: answer.pageCount }, (_unused, index) => ({
          createdAt: new Date("2026-01-01T00:00:00Z"),
          fileUrl: "https://cdn.example.com/page.jpg",
          height: 1400,
          id: `${answer.id}-p${index}`,
          markedAt: null,
          marking: null,
          sortOrder: index,
          submissionAnswerId: answer.id,
          uploadId: `${answer.id}-u${index}`,
          width: 1000
        }))
      )
  } as unknown as AnswerScriptRepository;

  const access = {
    requireManageableTest: async () => ({
      chapterId: "chap-1",
      id: "test-1",
      passingScore: null,
      title: "Weekly paper",
      type: overrides.testType ?? "WRITTEN"
    })
  } as unknown as AssessmentAccessGuards;

  const submissions = {
    promoteEnrollmentIfFinished: async () => undefined
  } as unknown as TestSubmissionService;

  const notificationService = {
    notifyUsers: async (userIds: readonly string[]) => {
      calls.notified.push(...userIds);
    }
  } as unknown as NotificationService;

  return {
    calls,
    service: new PaperMarkingService(
      testRepository,
      answerScriptRepository,
      access,
      submissions,
      notificationService
    )
  };
}

describe("PaperMarkingService.submitPaper — the marking gate", () => {
  test("an unmarked answered question blocks the paper", async () => {
    const { service } = buildService({
      answers: [
        { awardedMarks: 3, id: "a1", pageCount: 2, questionId: "q1" },
        { awardedMarks: null, id: "a2", pageCount: 1, questionId: "q2" }
      ]
    });

    await expect(
      service.submitPaper("sub-1", { feedback: undefined }, "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("a question with no pages scores zero without anyone clicking", async () => {
    const { calls, service } = buildService({
      answers: [{ awardedMarks: 4, id: "a1", pageCount: 2, questionId: "q1" }]
    });

    await service.submitPaper("sub-1", { feedback: undefined }, "teacher-1", "TEACHER");

    expect(calls.upserts[0]).toEqual([{ awardedMarks: 0, isCorrect: null, questionId: "q2" }]);
  });

  test("a fully marked paper grades, scores and tells the student", async () => {
    const { calls, service } = buildService();

    const result = await service.submitPaper(
      "sub-1",
      { feedback: undefined },
      "teacher-1",
      "TEACHER"
    );

    expect(result.score).toBe(11);
    expect(calls.submissionUpdates[0]?.status).toBe("GRADED");
    expect(calls.submissionUpdates[0]?.maxScore).toBe(15);
    expect(calls.notified).toEqual(["student-1"]);
  });

  test("half marks survive the total", async () => {
    const { service } = buildService({
      answers: [
        { awardedMarks: 2.5, id: "a1", pageCount: 1, questionId: "q1" },
        { awardedMarks: 7.25, id: "a2", pageCount: 1, questionId: "q2" }
      ]
    });

    const result = await service.submitPaper(
      "sub-1",
      { feedback: undefined },
      "teacher-1",
      "TEACHER"
    );

    expect(result.score).toBe(9.75);
  });

  test("a paper that has already been submitted cannot be submitted again", async () => {
    const { service } = buildService({ status: "GRADED" });

    await expect(
      service.submitPaper("sub-1", { feedback: undefined }, "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("PaperMarkingService.setAnswerMark", () => {
  test("marks above the question's own value are refused", async () => {
    const { service } = buildService();

    await expect(
      service.setAnswerMark("a1", { awardedMarks: 6 }, "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("another teacher's live claim blocks the write", async () => {
    const { service } = buildService({ lockHeldByOther: true });

    await expect(
      service.setAnswerMark("a1", { awardedMarks: 4 }, "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("a graded paper is locked to marking", async () => {
    const { service } = buildService({ status: "GRADED" });

    await expect(
      service.setAnswerMark("a1", { awardedMarks: 4 }, "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("PaperMarkingService.reopenPaper", () => {
  test("a teacher cannot reopen a submitted paper", async () => {
    const { service } = buildService({ status: "GRADED" });

    await expect(service.reopenPaper("sub-1", "teacher-1", "TEACHER")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  test("an admin puts it back to SUBMITTED, keeping the marks already on it", async () => {
    const { calls, service } = buildService({ status: "GRADED" });

    await service.reopenPaper("sub-1", "admin-1", "ADMIN");

    expect(calls.submissionUpdates[0]).toEqual({ gradedAt: null, status: "SUBMITTED" });
  });
});
