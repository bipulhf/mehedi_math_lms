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

  return answerScriptController.addPage(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

answerScriptRoutes.patch("/submissions/:id/pages/order", requireAuth(), async (context) => {
  const params = submissionIdParamsSchema.parse(context.req.param());
  const payload = reorderScriptPagesSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return answerScriptController.reorderPages(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

answerScriptRoutes.delete("/pages/:id", requireAuth(), (context) => {
  const params = scriptPageIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return answerScriptController.removePage(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
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

answerScriptRoutes.post("/answers/:id/claim", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = submissionAnswerIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return answerScriptController.openAnswer(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
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

answerScriptRoutes.delete("/answers/:id/claim", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = submissionAnswerIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return answerScriptController.releaseClaim(context, params.id, authUser!.id);
});

answerScriptRoutes.put("/answers/:id/mark", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = submissionAnswerIdParamsSchema.parse(context.req.param());
  const payload = setAnswerMarkSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return answerScriptController.setAnswerMark(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

answerScriptRoutes.put("/pages/:id/marking", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = scriptPageIdParamsSchema.parse(context.req.param());
  const payload = saveMarkingSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return answerScriptController.saveMarking(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
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
