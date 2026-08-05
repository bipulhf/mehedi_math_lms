import { z } from "zod";

import { couponCodeSchema } from "./coupons";

const idSchema = z.string().uuid();

export const paymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);

/**
 * Where the browser lands once the gateway settles.
 *
 * A **path**, never a full URL: it is resolved against `callbackOrigin`, so
 * accepting a URL here would let a caller point the post-payment redirect at
 * any host. The leading `/` must be a single one — `//evil.example` is a
 * protocol-relative URL that `new URL()` resolves to another origin.
 *
 * A query string is allowed, because the mobile app carries its deep link
 * through here (`/api/payment-return?redirect=genex://payment-callback`) and the
 * gateway's own `paymentId` and `status` are merged in alongside it.
 */
const callbackPathSchema = z
  .string()
  .max(512)
  .regex(/^\/(?!\/)/, "Must be a path beginning with a single /");

export const createEnrollmentSchema = z.object({
  callbackOrigin: z.string().url().optional(),
  callbackPath: callbackPathSchema.optional(),
  /**
   * The coupon the student applied, if any. Checked and priced again at
   * checkout — the preview the buy card showed is never trusted. ADR-0013.
   */
  couponCode: couponCodeSchema.optional(),
  courseId: idSchema
});

export const paymentValidationParamsSchema = z.object({
  valId: z.string().trim().min(1).max(255)
});

export const paymentIdParamsSchema = z.object({
  id: idSchema
});

export const paymentListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
  status: paymentStatusSchema.optional()
});

export const refundPaymentSchema = z.object({
  remarks: z.string().trim().max(4000).optional().or(z.literal(""))
});
