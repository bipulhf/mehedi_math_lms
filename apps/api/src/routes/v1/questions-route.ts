import { Hono } from "hono";
import { questionIdParamsSchema, updateQuestionSchema } from "@genex/shared";
import type { UserRole } from "@genex/shared";

import { auditLogService, testController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const questionsRoutes = new Hono<AppBindings>();

questionsRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = questionIdParamsSchema.parse(context.req.param());
  const payload = updateQuestionSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await testController.updateQuestion(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "question.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "question"
  });

  return response;
});

questionsRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = questionIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await testController.deleteQuestion(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "question.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "question"
  });

  return response;
});
