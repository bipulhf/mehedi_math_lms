import { Hono } from "hono";
import { courseIdParamsSchema } from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { analyticsController } from "@/lib/container";
import { requireAdmin, requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const analyticsRoutes = new Hono<AppBindings>();

analyticsRoutes.get("/admin/overview", requireAdmin(), (context) =>
  analyticsController.adminOverview(context)
);

analyticsRoutes.get("/teacher/overview", requireRole("TEACHER"), (context) => {
  const authUser = context.get("authUser");

  return analyticsController.teacherOverview(context, authUser!.id);
});

analyticsRoutes.get("/accountant/overview", requireRole("ACCOUNTANT", "ADMIN"), (context) =>
  analyticsController.accountantOverview(context)
);

analyticsRoutes.get("/courses/:id", requireRole("ADMIN", "TEACHER", "ACCOUNTANT"), (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return analyticsController.courseAnalytics(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});
