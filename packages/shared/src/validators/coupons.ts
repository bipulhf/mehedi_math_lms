import { z } from "zod";

import { booleanQueryParamSchema } from "./common";

const idSchema = z.string().uuid();

export const couponKindSchema = z.enum(["FLAT", "PERCENT"]);

/**
 * The code as a human types it.
 *
 * Letters, digits, dash and underscore only — a code travels through SMS, a
 * Facebook post and a whiteboard, and a space or a Bangla digit in it is a code
 * nobody can retype. Uppercased here so the client, the API and the unique
 * index all agree on one form; matching is therefore case-insensitive without
 * anyone having to remember to fold it.
 */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dash or underscore only")
  .transform((value) => value.toUpperCase());

/**
 * Taka for FLAT, percent for PERCENT.
 *
 * The upper bound is checked against the kind in `couponValueForKind`, not
 * here: one column holds both, so the schema can only say "a positive amount"
 * until it knows which it is.
 */
const couponValueSchema = z.coerce.number().positive().max(999999);

const couponFieldsSchema = z.object({
  code: couponCodeSchema,
  /** Omitted or null means every course — an Admin-only choice, enforced in the service. */
  courseId: idSchema.nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isDisabled: z.boolean(),
  isPublic: z.boolean(),
  kind: couponKindSchema,
  /** Null is uncapped. */
  maxRedemptions: z.coerce.number().int().positive().max(1000000).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  value: couponValueSchema
});

/**
 * A percentage above 100 would hand money back; a percentage below 1 rounds to
 * nothing on every price this platform sells. Flat amounts are unbounded here
 * and clamped to the course price at checkout, so "500 off" survives the day
 * the course drops to 400.
 */
function refineValueForKind(value: { kind: "FLAT" | "PERCENT"; value: number }): boolean {
  return value.kind === "PERCENT" ? value.value >= 1 && value.value <= 100 : true;
}

const valueForKindMessage = "A percentage discount must be between 1 and 100";

/**
 * A window that ends before it starts would never fire, and the list would show
 * it as Scheduled for ever.
 */
function refineWindow(value: {
  expiresAt?: string | null | undefined;
  startsAt?: string | null | undefined;
}): boolean {
  if (!value.startsAt || !value.expiresAt) {
    return true;
  }

  return new Date(value.startsAt).getTime() < new Date(value.expiresAt).getTime();
}

const windowMessage = "The end of the window must be after its start";

export const createCouponSchema = couponFieldsSchema
  .extend({
    isDisabled: z.boolean().default(false),
    isPublic: z.boolean().default(false)
  })
  .refine(refineValueForKind, { message: valueForKindMessage, path: ["value"] })
  .refine(refineWindow, { message: windowMessage, path: ["expiresAt"] });

/**
 * Derived from the field shapes rather than from `createCouponSchema`, because
 * `.partial()` does not strip a `.default()` — patching a code would otherwise
 * carry `isPublic: false` and quietly pull a coupon off the course page. The
 * same trap is pinned on `updateCourseSchema`.
 *
 * Every field stays editable for a coupon's whole life, including the code and
 * the discount: payments hold their own snapshot of what was charged, so
 * history cannot be rewritten from here. ADR-0013.
 */
export const updateCouponSchema = couponFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided")
  .refine(
    (value) =>
      value.kind === undefined || value.value === undefined
        ? true
        : refineValueForKind({ kind: value.kind, value: value.value }),
    { message: valueForKindMessage, path: ["value"] }
  )
  .refine(refineWindow, { message: windowMessage, path: ["expiresAt"] });

export const couponIdParamsSchema = z.object({
  id: idSchema
});

/** Derived from dates, the cap and the off switch — never stored. */
export const couponStateSchema = z.enum([
  "SCHEDULED",
  "ACTIVE",
  "EXPIRED",
  "EXHAUSTED",
  "DISABLED"
]);

export const listCouponsQuerySchema = z.object({
  courseId: idSchema.optional(),
  createdById: idSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  /** Teachers only: the read-only coupons an Admin aimed at their courses. */
  othersOnCourses: booleanQueryParamSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  search: z.string().trim().max(64).optional(),
  state: couponStateSchema.optional()
});

export const couponRedemptionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1)
});

/** What a student types in the buy card before committing to pay. */
export const previewCouponSchema = z.object({
  code: couponCodeSchema,
  courseId: idSchema
});

export type CouponKind = z.infer<typeof couponKindSchema>;
export type CouponState = z.infer<typeof couponStateSchema>;
