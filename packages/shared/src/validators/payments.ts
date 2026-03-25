import { z } from "zod";

const idSchema = z.string().uuid();

export const paymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);

export const createEnrollmentSchema = z.object({
  callbackOrigin: z.string().url().optional(),
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
