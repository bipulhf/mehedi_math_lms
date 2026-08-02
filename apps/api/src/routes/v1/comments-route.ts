import { Hono } from "hono";
import { commentIdParamsSchema, updateCommentSchema } from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { commentController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const commentsRoutes = new Hono<AppBindings>();

commentsRoutes.put("/:id", requireRole("STUDENT", "TEACHER", "ADMIN"), async (context) => {
  const params = commentIdParamsSchema.parse(context.req.param());
  const payload = updateCommentSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return commentController.updateComment(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

commentsRoutes.delete("/:id", requireRole("STUDENT", "TEACHER", "ADMIN"), (context) => {
  const params = commentIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return commentController.deleteComment(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});
