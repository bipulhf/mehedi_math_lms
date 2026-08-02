import { Hono } from "hono";
import type { UserRole } from "@mma/shared";
import { noticeIdParamsSchema, updateCourseNoticeSchema } from "@mma/shared";

import { noticeController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const noticesRoutes = new Hono<AppBindings>();

noticesRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = noticeIdParamsSchema.parse(context.req.param());
  const payload = updateCourseNoticeSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return noticeController.updateNotice(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

noticesRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = noticeIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return noticeController.deleteNotice(context, params.id, authUser!.id, authSession!.role as UserRole);
});
