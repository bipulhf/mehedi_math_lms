import type { Context } from "hono";
import type { MarkingReviewMode, UserRole } from "@mma/shared";

import type { AnswerScriptService } from "@/services/answer-script-service";
import type { PaperMarkingService } from "@/services/paper-marking-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

/**
 * The written-paper endpoints: a student's Answer Script pages, and a teacher's
 * pass over them.
 */
export class AnswerScriptController {
  public constructor(
    private readonly answerScriptService: AnswerScriptService,
    private readonly paperMarkingService: PaperMarkingService
  ) {}

  public async addPage(
    context: Context<AppBindings>,
    submissionId: string,
    input: Parameters<AnswerScriptService["addPage"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.answerScriptService.addPage(
      submissionId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 201, "Page added successfully");
  }

  public async removePage(
    context: Context<AppBindings>,
    pageId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.answerScriptService.removePage(pageId, currentUserId, currentUserRole);

    return success(context, data, 200, "Page removed successfully");
  }

  public async reorderPages(
    context: Context<AppBindings>,
    submissionId: string,
    input: Parameters<AnswerScriptService["reorderPages"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.answerScriptService.reorderPages(
      submissionId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Page order updated successfully");
  }

  public async getQueue(
    context: Context<AppBindings>,
    testId: string,
    mode: MarkingReviewMode,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.paperMarkingService.getQueue(
      testId,
      mode,
      currentUserId,
      currentUserRole
    );

    return success(context, data);
  }

  public async openAnswer(
    context: Context<AppBindings>,
    answerId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.paperMarkingService.openAnswer(
      answerId,
      currentUserId,
      currentUserRole
    );

    return success(context, data);
  }

  public async renewClaim(
    context: Context<AppBindings>,
    answerId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.paperMarkingService.renewClaim(
      answerId,
      currentUserId,
      currentUserRole
    );

    return success(context, data);
  }

  public async releaseClaim(
    context: Context<AppBindings>,
    answerId: string,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.paperMarkingService.releaseClaim(answerId, currentUserId);

    return success(context, data);
  }

  public async setAnswerMark(
    context: Context<AppBindings>,
    answerId: string,
    input: Parameters<PaperMarkingService["setAnswerMark"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.paperMarkingService.setAnswerMark(
      answerId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Mark saved successfully");
  }

  public async saveMarking(
    context: Context<AppBindings>,
    pageId: string,
    input: Parameters<PaperMarkingService["saveMarking"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.paperMarkingService.saveMarking(
      pageId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Marking saved successfully");
  }

  public async submitPaper(
    context: Context<AppBindings>,
    submissionId: string,
    input: Parameters<PaperMarkingService["submitPaper"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.paperMarkingService.submitPaper(
      submissionId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Paper submitted successfully");
  }

  public async reopenPaper(
    context: Context<AppBindings>,
    submissionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.paperMarkingService.reopenPaper(
      submissionId,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Paper reopened successfully");
  }
}
