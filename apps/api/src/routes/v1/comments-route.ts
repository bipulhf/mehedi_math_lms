import { Hono } from "hono";
import { commentIdParamsSchema, updateCommentSchema } from "@genex/shared";
import type { UserRole } from "@genex/shared";

import { auditLogService, commentController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const commentsRoutes = new Hono<AppBindings>();

commentsRoutes.put("/:id", requireRole("STUDENT", "TEACHER", "ADMIN"), async (context) => {
  const params = commentIdParamsSchema.parse(context.req.param());
  const payload = updateCommentSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await commentController.updateComment(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "comment.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "comment"
  });

  return response;
});

commentsRoutes.delete("/:id", requireRole("STUDENT", "TEACHER", "ADMIN"), async (context) => {
  const params = commentIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await commentController.deleteComment(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "comment.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "comment"
  });

  return response;
});
