import { Hono } from "hono";
import {
  addScriptPageSchema,
  markingQueueQuerySchema,
  reorderScriptPagesSchema,
  saveMarkingSchema,
  scriptPageIdParamsSchema,
  setAnswerMarkSchema,
  submissionAnswerIdParamsSchema,
  submissionIdParamsSchema,
  submitPaperSchema,
  testIdParamsSchema
} from "@genex/shared";
import type { UserRole } from "@genex/shared";

import { answerScriptController, auditLogService } from "@/lib/container";
import { requireAuth, requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const answerScriptRoutes = new Hono<AppBindings>();

answerScriptRoutes.post("/submissions/:id/pages", requireAuth(), async (context) => {
  const params = submissionIdParamsSchema.parse(context.req.param());
  const payload = addScriptPageSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await answerScriptController.addPage(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "script_page.added",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "test_submission",
    metadata: { questionId: payload.questionId, uploadId: payload.uploadId }
  });

  return response;
});

answerScriptRoutes.patch("/submissions/:id/pages/order", requireAuth(), async (context) => {
  const params = submissionIdParamsSchema.parse(context.req.param());
  const payload = reorderScriptPagesSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await answerScriptController.reorderPages(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "script_page.reordered",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "test_submission",
    metadata: { pages: payload.pageIds.length, questionId: payload.questionId }
  });

  return response;
});

answerScriptRoutes.delete("/pages/:id", requireAuth(), async (context) => {
  const params = scriptPageIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await answerScriptController.removePage(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "script_page.removed",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "script_page"
  });

  return response;
});

answerScriptRoutes.get("/tests/:id/marking", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const query = markingQueueQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return answerScriptController.getQueue(
    context,
    params.id,
    query.mode,
    authUser!.id,
    authSession!.role as UserRole
  );
});

answerScriptRoutes.post("/answers/:id/claim", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = submissionAnswerIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await answerScriptController.openAnswer(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "answer.opened_for_marking",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "submission_answer"
  });

  return response;
});

answerScriptRoutes.patch("/answers/:id/claim", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = submissionAnswerIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return answerScriptController.renewClaim(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

answerScriptRoutes.delete("/answers/:id/claim", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = submissionAnswerIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  const response = await answerScriptController.releaseClaim(context, params.id, authUser!.id);

  auditLogService.log({
    action: "answer.marking_released",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "submission_answer"
  });

  return response;
});

answerScriptRoutes.put("/answers/:id/mark", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = submissionAnswerIdParamsSchema.parse(context.req.param());
  const payload = setAnswerMarkSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await answerScriptController.setAnswerMark(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  // The mark itself is in the entry: a changed mark is the thing anybody would
  // come to this log to ask about.
  auditLogService.log({
    action: "answer.marked",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "submission_answer",
    metadata: { awardedMarks: payload.awardedMarks }
  });

  return response;
});

answerScriptRoutes.put("/pages/:id/marking", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = scriptPageIdParamsSchema.parse(context.req.param());
  const payload = saveMarkingSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await answerScriptController.saveMarking(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "script_page.marking_saved",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "script_page",
    metadata: { elements: payload.marking.elements.length }
  });

  return response;
});

answerScriptRoutes.post(
  "/submissions/:id/marking/submit",
  requireRole("ADMIN", "TEACHER"),
  async (context) => {
    const params = submissionIdParamsSchema.parse(context.req.param());
    const payload = submitPaperSchema.parse(await context.req.json());
    const authUser = context.get("authUser");
    const authSession = context.get("authSession");

    const response = await answerScriptController.submitPaper(
      context,
      params.id,
      payload,
      authUser!.id,
      authSession!.role as UserRole
    );

    auditLogService.log({
      action: "test_submission.paper_submitted",
      actorId: authUser!.id,
      entityId: params.id,
      entityType: "test_submission"
    });

    return response;
  }
);

/**
 * Reopening is the one way past a submitted paper being final, so it is
 * recorded whoever does it. Admin only — the service refuses anyone else.
 */
answerScriptRoutes.post("/submissions/:id/marking/reopen", requireRole("ADMIN"), async (context) => {
  const params = submissionIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await answerScriptController.reopenPaper(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test_submission.paper_reopened",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "test_submission"
  });

  return response;
});
