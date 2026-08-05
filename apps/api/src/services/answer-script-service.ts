import { maxScriptPagesPerAnswer, type UserRole } from "@genex/shared";
import type { z } from "zod";
import type { addScriptPageSchema, reorderScriptPagesSchema } from "@genex/shared";

import type { AnswerScriptRepository } from "@/repositories/answer-script-repository";
import type { TestRepository } from "@/repositories/test-repository";
import type { UploadRepository } from "@/repositories/upload-repository";
import { mapScriptPageView, type ScriptPageView } from "@/services/assessment-views";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type AddScriptPageInput = z.infer<typeof addScriptPageSchema>;
type ReorderScriptPagesInput = z.infer<typeof reorderScriptPagesSchema>;

/**
 * The student's side of a written paper: the photographed pages they hand in,
 * their order, and taking one back before the attempt is closed.
 *
 * Pages can only move while the attempt is `STARTED`. Once submitted, the
 * Answer Script is what the teacher marks and the student cannot reach it.
 */
export class AnswerScriptService {
  public constructor(
    private readonly testRepository: TestRepository,
    private readonly answerScriptRepository: AnswerScriptRepository,
    private readonly uploadRepository: UploadRepository
  ) {}

  private async requireOpenAttempt(
    submissionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ submissionId: string; testId: string }> {
    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    if (submission.userId !== currentUserId && currentUserRole !== "ADMIN") {
      throw new ForbiddenError("You do not have permission to edit this submission");
    }

    if (submission.status !== "STARTED") {
      throw new ValidationError("This attempt has already been handed in", [
        {
          field: "status",
          message: "Pages can only be added or removed before you submit"
        }
      ]);
    }

    const test = await this.testRepository.findTestById(submission.testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    if (test.type !== "WRITTEN") {
      throw new ValidationError("This test is not answered on paper", [
        {
          field: "testId",
          message: "Only a written paper takes uploaded pages"
        }
      ]);
    }

    return { submissionId: submission.id, testId: submission.testId };
  }

  private async listPageViews(answerId: string): Promise<readonly ScriptPageView[]> {
    const pages = await this.answerScriptRepository.listScriptPagesByAnswerIds([answerId]);

    // A student never sees Marking on their own attempt — there is none yet,
    // and after submission this path is closed to them anyway.
    return pages.map((page) => mapScriptPageView(page, false));
  }

  public async addPage(
    submissionId: string,
    input: AddScriptPageInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly ScriptPageView[]> {
    const attempt = await this.requireOpenAttempt(submissionId, currentUserId, currentUserRole);
    const question = await this.testRepository.findQuestionById(input.questionId);

    if (!question || question.testId !== attempt.testId) {
      throw new ValidationError("That question is not on this paper", [
        {
          field: "questionId",
          message: "Question does not belong to this test"
        }
      ]);
    }

    const upload = await this.uploadRepository.findUploadById(input.uploadId);

    if (!upload) {
      throw new NotFoundError("Upload was not found");
    }

    if (upload.userId !== currentUserId) {
      throw new ForbiddenError("You do not have access to this upload");
    }

    if (upload.purpose !== "ANSWER_SCRIPT_PAGE" || upload.status !== "READY") {
      throw new ValidationError("That file is not a finished answer page", [
        {
          field: "uploadId",
          message: "Upload the page again"
        }
      ]);
    }

    const answer = await this.testRepository.findOrCreateSubmissionAnswer(
      attempt.submissionId,
      input.questionId
    );
    const pageCount = await this.answerScriptRepository.countScriptPagesByAnswerId(answer.id);

    if (pageCount >= maxScriptPagesPerAnswer) {
      throw new ValidationError("That is as many pages as one answer can hold", [
        {
          field: "uploadId",
          message: `A single answer takes at most ${maxScriptPagesPerAnswer} pages`
        }
      ]);
    }

    await this.answerScriptRepository.appendScriptPage({
      sortOrder: pageCount,
      submissionAnswerId: answer.id,
      uploadId: input.uploadId
    });

    return this.listPageViews(answer.id);
  }

  public async removePage(
    pageId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    const page = await this.answerScriptRepository.findScriptPageById(pageId);

    if (!page) {
      throw new NotFoundError("Page not found");
    }

    const answer = await this.testRepository.findSubmissionAnswerById(page.submissionAnswerId);

    if (!answer) {
      throw new NotFoundError("Page not found");
    }

    await this.requireOpenAttempt(answer.submissionId, currentUserId, currentUserRole);
    await this.answerScriptRepository.deleteScriptPage(pageId);

    const remaining = await this.answerScriptRepository.listScriptPagesByAnswerIds([answer.id]);
    await this.answerScriptRepository.reorderScriptPages(
      remaining.map((item, index) => ({ id: item.id, sortOrder: index }))
    );

    return { id: pageId };
  }

  public async reorderPages(
    submissionId: string,
    input: ReorderScriptPagesInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly ScriptPageView[]> {
    const attempt = await this.requireOpenAttempt(submissionId, currentUserId, currentUserRole);
    const answer = await this.testRepository.findOrCreateSubmissionAnswer(
      attempt.submissionId,
      input.questionId
    );
    const pages = await this.answerScriptRepository.listScriptPagesByAnswerIds([answer.id]);
    const pageIds = new Set(pages.map((page) => page.id));

    if (
      input.pageIds.length !== pages.length ||
      !input.pageIds.every((pageId) => pageIds.has(pageId))
    ) {
      throw new ValidationError("Page order is invalid", [
        {
          field: "pageIds",
          message: "Send every page of this answer, once each"
        }
      ]);
    }

    await this.answerScriptRepository.reorderScriptPages(
      input.pageIds.map((id, index) => ({ id, sortOrder: index }))
    );

    return this.listPageViews(answer.id);
  }
}
