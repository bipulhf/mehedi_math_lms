import { Hono } from "hono";
import { courseIdParamsSchema, createEnrollmentSchema } from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { enrollmentController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const enrollmentsRoutes = new Hono<AppBindings>();

enrollmentsRoutes.post("/", requireRole("STUDENT"), async (context) => {
  const payload = createEnrollmentSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return enrollmentController.createEnrollment(
    context,
    payload.courseId,
    payload.callbackOrigin,
    authUser!.id,
    authSession!.role as UserRole
  );
});

enrollmentsRoutes.get("/me", requireRole("STUDENT"), (context) => {
  const authUser = context.get("authUser");

  return enrollmentController.listMyEnrollments(context, authUser!.id);
});

enrollmentsRoutes.get("/courses/:id/me", requireRole("STUDENT"), (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return enrollmentController.getMyCourseEnrollment(context, params.id, authUser!.id);
});
