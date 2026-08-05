import { describe, expect, test } from "bun:test";

import type { AnswerScriptRepository } from "@/repositories/answer-script-repository";
import type { TestRepository } from "@/repositories/test-repository";
import type { UploadRepository } from "@/repositories/upload-repository";
import { AnswerScriptService } from "@/services/answer-script-service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

interface Overrides {
  pageCount?: number;
  status?: "STARTED" | "SUBMITTED" | "GRADED";
  testType?: "MCQ" | "WRITTEN";
  uploadOwnerId?: string;
  uploadPurpose?: string;
  uploadStatus?: string;
}

interface Calls {
  appended: { sortOrder: number; submissionAnswerId: string; uploadId: string }[];
}

function buildService(overrides: Overrides = {}): { calls: Calls; service: AnswerScriptService } {
  const calls: Calls = { appended: [] };

  const testRepository = {
    findOrCreateSubmissionAnswer: async (submissionId: string, questionId: string) => ({
      awardedMarks: null,
      createdAt: new Date(),
      id: "answer-1",
      isCorrect: null,
      questionId,
      selectedOptionId: null,
      submissionId,
      updatedAt: new Date()
    }),
    findQuestionById: async (id: string) =>
      id === "q1" ? { id: "q1", marks: 5, testId: "test-1" } : null,
    findSubmissionById: async () => ({
      id: "sub-1",
      status: overrides.status ?? "STARTED",
      testId: "test-1",
      userId: "student-1"
    }),
    findTestById: async () => ({ id: "test-1", type: overrides.testType ?? "WRITTEN" })
  } as unknown as TestRepository;

  const answerScriptRepository = {
    appendScriptPage: async (input: {
      sortOrder: number;
      submissionAnswerId: string;
      uploadId: string;
    }) => {
      calls.appended.push(input);

      return { id: "page-1" };
    },
    countScriptPagesByAnswerId: async () => overrides.pageCount ?? 0,
    findScriptPageById: async () => null,
    listScriptPagesByAnswerIds: async () => []
  } as unknown as AnswerScriptRepository;

  const uploadRepository = {
    findUploadById: async () => ({
      id: "upload-1",
      purpose: overrides.uploadPurpose ?? "ANSWER_SCRIPT_PAGE",
      status: overrides.uploadStatus ?? "READY",
      userId: overrides.uploadOwnerId ?? "student-1"
    })
  } as unknown as UploadRepository;

  return {
    calls,
    service: new AnswerScriptService(testRepository, answerScriptRepository, uploadRepository)
  };
}

const page = { questionId: "q1", uploadId: "upload-1" };

describe("AnswerScriptService.addPage", () => {
  test("a page joins the answer at the end of it", async () => {
    const { calls, service } = buildService({ pageCount: 2 });

    await service.addPage("sub-1", page, "student-1", "STUDENT");

    expect(calls.appended[0]).toEqual({
      sortOrder: 2,
      submissionAnswerId: "answer-1",
      uploadId: "upload-1"
    });
  });

  test("a handed-in attempt takes no more pages", async () => {
    const { service } = buildService({ status: "SUBMITTED" });

    await expect(
      service.addPage("sub-1", page, "student-1", "STUDENT")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("an MCQ test has no Answer Script to add to", async () => {
    const { service } = buildService({ testType: "MCQ" });

    await expect(
      service.addPage("sub-1", page, "student-1", "STUDENT")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("another student cannot add a page to this attempt", async () => {
    const { service } = buildService();

    await expect(
      service.addPage("sub-1", page, "student-2", "STUDENT")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("an upload belonging to someone else is refused", async () => {
    const { service } = buildService({ uploadOwnerId: "student-2" });

    await expect(
      service.addPage("sub-1", page, "student-1", "STUDENT")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("an upload made for something other than a page is refused", async () => {
    const { service } = buildService({ uploadPurpose: "COURSE_COVER" });

    await expect(
      service.addPage("sub-1", page, "student-1", "STUDENT")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("an upload that never finished is refused", async () => {
    const { service } = buildService({ uploadStatus: "PENDING" });

    await expect(
      service.addPage("sub-1", page, "student-1", "STUDENT")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("the page cap is enforced", async () => {
    const { service } = buildService({ pageCount: 30 });

    await expect(
      service.addPage("sub-1", page, "student-1", "STUDENT")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("a question that is not on this paper is refused", async () => {
    const { service } = buildService();

    await expect(
      service.addPage("sub-1", { questionId: "q-other", uploadId: "upload-1" }, "student-1", "STUDENT")
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("AnswerScriptService.removePage", () => {
  test("a page that does not exist is a 404, not a silent success", async () => {
    const { service } = buildService();

    await expect(service.removePage("page-1", "student-1", "STUDENT")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
