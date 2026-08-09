import { Hono } from "hono";
import {
  courseIdParamsSchema,
  createEnrollmentSchema,
  enrollmentIdParamsSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { auditLogService, enrollmentController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const enrollmentsRoutes = new Hono<AppBindings>();

enrollmentsRoutes.post("/", requireRole("STUDENT"), async (context) => {
  const payload = createEnrollmentSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await enrollmentController.createEnrollment(
    context,
    payload.courseId,
    { origin: payload.callbackOrigin, path: payload.callbackPath },
    authUser!.id,
    authSession!.role as UserRole,
    payload.couponCode
  );

  // The response payload here isn't the extractCreatedId `data.id` shape —
  // createEnrollment returns `{ enrollmentId, requiresPayment, ... }`, and
  // enrollmentId is null when the flow only kicked off a payment (no
  // enrollment exists yet, so the course is the closest identifiable entity).
  const body = (await response.clone().json()) as {
    data?: { enrollmentId?: string | null; requiresPayment?: boolean };
  };

  auditLogService.log({
    action: "enrollment.created",
    actorId: authUser!.id,
    entityId: body.data?.enrollmentId ?? payload.courseId,
    entityType: "enrollment",
    metadata: {
      courseId: payload.courseId,
      requiresPayment: body.data?.requiresPayment ?? false
    }
  });

  return response;
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

enrollmentsRoutes.get("/:id/certificate", requireRole("STUDENT"), (context) => {
  const params = enrollmentIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return enrollmentController.downloadCertificate(context, params.id, authUser!.id);
});

enrollmentsRoutes.get("/:id/receipt", requireRole("STUDENT"), (context) => {
  const params = enrollmentIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return enrollmentController.downloadReceipt(context, params.id, authUser!.id);
});
