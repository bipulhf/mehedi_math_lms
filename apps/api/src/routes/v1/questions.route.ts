import { Hono } from "hono";
import { questionIdParamsSchema, updateQuestionSchema } from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { testController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const questionsRoutes = new Hono<AppBindings>();

questionsRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = questionIdParamsSchema.parse(context.req.param());
  const payload = updateQuestionSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.updateQuestion(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

questionsRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = questionIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.deleteQuestion(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});
