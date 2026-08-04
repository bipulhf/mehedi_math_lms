import { Hono } from "hono";
import type { UserRole } from "@genex/shared";
import { noticeIdParamsSchema, updateCourseNoticeSchema } from "@genex/shared";

import { auditLogService, noticeController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const noticesRoutes = new Hono<AppBindings>();

noticesRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = noticeIdParamsSchema.parse(context.req.param());
  const payload = updateCourseNoticeSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await noticeController.updateNotice(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "notice.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "notice"
  });

  return response;
});

noticesRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = noticeIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await noticeController.deleteNotice(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "notice.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "notice"
  });

  return response;
});
