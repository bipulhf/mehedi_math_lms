import { apiPost } from "@/src/lib/api-client";

/** Checking a discount code before it is committed to. */

export type CouponRejectionReason =
  | "NOT_FOUND"
  | "DISABLED"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "ALREADY_USED"
  | "ALREADY_ENROLLED"
  | "COURSE_UNAVAILABLE"
  | "FREE_COURSE";

export interface CouponPreview {
  coupon: { code: string; id: string; kind: "FLAT" | "PERCENT"; value: string } | null;
  pricing: { discountAmount: string; listAmount: string; payable: string } | null;
  reason: CouponRejectionReason | null;
  status: "APPLIED" | "REJECTED";
}

/**
 * Checks a code without committing to it. Answers either way — a refusal is a
 * reason the screen renders in Bangla, not a thrown error. ADR-0013.
 */
export async function previewCoupon(input: {
  code: string;
  courseId: string;
}): Promise<CouponPreview> {
  return apiPost<typeof input, CouponPreview>("coupons/preview", input);
}
