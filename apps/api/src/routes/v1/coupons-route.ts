import { Hono } from "hono";
import type { Context } from "hono";
import {
  couponIdParamsSchema,
  couponRedemptionsQuerySchema,
  createCouponSchema,
  listCouponsQuerySchema,
  previewCouponSchema,
  updateCouponSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { auditLogService, couponController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import { createRateLimitMiddleware } from "@/middleware/rate-limit";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";

export const couponsRoutes = new Hono<AppBindings>();

const staffRoles = requireRole("TEACHER", "ACCOUNTANT", "ADMIN");
const authorRoles = requireRole("TEACHER", "ADMIN");

function actorOf(context: Context<AppBindings>): { id: string; role: UserRole } {
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return { id: authUser!.id, role: authSession!.role as UserRole };
}

/**
 * A code checker is a guessing oracle: without a limit a script walks SAVE5,
 * SAVE10, SAVE15 and finds every live code in seconds. Signed-in students only,
 * and sixty attempts a minute per address on top of the global limit — enough
 * that a shared address never runs into it, not enough to sweep.
 */
couponsRoutes.post(
  "/preview",
  requireRole("STUDENT"),
  createRateLimitMiddleware({ keyPrefix: "coupon-preview", max: 60, windowMs: 60_000 }),
  async (context) => {
    const payload = previewCouponSchema.parse(await context.req.json());
    const authUser = context.get("authUser");

    return couponController.previewCoupon(context, payload, authUser!.id);
  }
);

couponsRoutes.get("/", staffRoles, (context) => {
  const query = listCouponsQuerySchema.parse(context.req.query());

  return couponController.listCoupons(context, query, actorOf(context));
});

couponsRoutes.post("/", authorRoles, async (context) => {
  const payload = createCouponSchema.parse(await context.req.json());
  const actor = actorOf(context);
  const response = await couponController.createCoupon(context, payload, actor);

  auditLogService.log({
    action: "coupon.created",
    actorId: actor.id,
    entityId: await extractCreatedId(response),
    entityType: "coupon",
    metadata: {
      code: payload.code,
      courseId: payload.courseId ?? "all",
      kind: payload.kind,
      value: payload.value
    }
  });

  return response;
});

couponsRoutes.get("/:id", staffRoles, (context) => {
  const params = couponIdParamsSchema.parse(context.req.param());

  return couponController.getCoupon(context, params.id, actorOf(context));
});

couponsRoutes.get("/:id/redemptions", staffRoles, (context) => {
  const params = couponIdParamsSchema.parse(context.req.param());
  const query = couponRedemptionsQuerySchema.parse(context.req.query());

  return couponController.listRedemptions(context, params.id, query, actorOf(context));
});

couponsRoutes.patch("/:id", authorRoles, async (context) => {
  const params = couponIdParamsSchema.parse(context.req.param());
  const payload = updateCouponSchema.parse(await context.req.json());
  const actor = actorOf(context);
  const response = await couponController.updateCoupon(context, params.id, payload, actor);

  auditLogService.log({
    action: "coupon.updated",
    actorId: actor.id,
    entityId: params.id,
    entityType: "coupon",
    metadata: { fields: Object.keys(payload).join(",") }
  });

  return response;
});

couponsRoutes.delete("/:id", authorRoles, async (context) => {
  const params = couponIdParamsSchema.parse(context.req.param());
  const actor = actorOf(context);
  const response = await couponController.deleteCoupon(context, params.id, actor);

  auditLogService.log({
    action: "coupon.deleted",
    actorId: actor.id,
    entityId: params.id,
    entityType: "coupon"
  });

  return response;
});
