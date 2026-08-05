import type {
  CouponKind,
  CouponRejectionReason,
  CouponState,
  createCouponSchema,
  updateCouponSchema
} from "@genex/shared";
import type { z } from "zod";

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  type PaginatedEnvelope
} from "@/lib/api/client";

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export interface CouponListItem {
  code: string;
  /** Null is a Platform Coupon: it applies to every course. */
  course: { id: string; slug: string; title: string } | null;
  createdAt: string;
  createdBy: { id: string; name: string; role: string };
  expiresAt: string | null;
  id: string;
  isDisabled: boolean;
  /** False for a coupon somebody else made — a teacher reads those, no more. */
  isEditable: boolean;
  isPublic: boolean;
  kind: CouponKind;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  state: CouponState;
  totalDiscount: string;
  updatedAt: string;
  value: string;
}

export interface CouponDetail extends CouponListItem {
  courseBreakdown: readonly {
    count: number;
    courseId: string;
    courseTitle: string;
    discount: string;
  }[];
  redemptionSeries: readonly { count: number; date: string; discount: string }[];
  revenue: string;
}

export interface CouponRedemption {
  course: { id: string; title: string };
  discountAmount: string;
  listAmount: string;
  paidAmount: string;
  paymentId: string;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  redeemedAt: string;
  student: { email: string; id: string; name: string };
}

export interface CouponPreview {
  coupon: { code: string; id: string; kind: CouponKind; value: string } | null;
  pricing: { discountAmount: string; listAmount: string; payable: string } | null;
  reason: CouponRejectionReason | null;
  status: "APPLIED" | "REJECTED";
}

export interface CouponsQuery {
  courseId?: string | undefined;
  createdById?: string | undefined;
  limit?: number | undefined;
  /** Teachers only: the read-only coupons somebody else aimed at their courses. */
  othersOnCourses?: boolean | undefined;
  page?: number | undefined;
  search?: string | undefined;
  state?: CouponState | undefined;
}

function buildQueryString(query: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function listCoupons(query: CouponsQuery): Promise<PaginatedEnvelope<CouponListItem>> {
  return apiGet<readonly CouponListItem[]>(
    `coupons${buildQueryString({
      courseId: query.courseId,
      createdById: query.createdById,
      limit: query.limit,
      othersOnCourses: query.othersOnCourses,
      page: query.page,
      search: query.search,
      state: query.state
    })}`
  ) as Promise<PaginatedEnvelope<CouponListItem>>;
}

export async function getCoupon(couponId: string): Promise<CouponDetail> {
  const response = await apiGet<CouponDetail>(`coupons/${couponId}`);

  return response.data;
}

export async function listCouponRedemptions(
  couponId: string,
  query: { limit?: number | undefined; page?: number | undefined }
): Promise<PaginatedEnvelope<CouponRedemption>> {
  return apiGet<readonly CouponRedemption[]>(
    `coupons/${couponId}/redemptions${buildQueryString({ limit: query.limit, page: query.page })}`
  ) as Promise<PaginatedEnvelope<CouponRedemption>>;
}

export async function createCoupon(values: CreateCouponInput): Promise<CouponListItem> {
  const response = await apiPost<CreateCouponInput, CouponListItem>("coupons", values);

  return response.data;
}

export async function updateCoupon(
  couponId: string,
  values: UpdateCouponInput
): Promise<CouponListItem> {
  const response = await apiPatch<UpdateCouponInput, CouponListItem>(
    `coupons/${couponId}`,
    values
  );

  return response.data;
}

export async function deleteCoupon(couponId: string): Promise<void> {
  await apiDelete<{ id: string }>(`coupons/${couponId}`);
}

/**
 * Checks a code without committing to it. Answers 200 either way — a refusal
 * arrives as a reason the caller renders in Bangla, not as an error toast.
 */
export async function previewCoupon(input: {
  code: string;
  courseId: string;
}): Promise<CouponPreview> {
  const response = await apiPost<typeof input, CouponPreview>("coupons/preview", input);

  return response.data;
}
