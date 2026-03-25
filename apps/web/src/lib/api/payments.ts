import { paymentStatusSchema, refundPaymentSchema } from "@mma/shared";
import type { z } from "zod";

import { apiGet, apiPost } from "@/lib/api/client";

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

export interface PaymentHistoryItem {
  amount: string;
  course: {
    id: string;
    title: string;
  };
  createdAt: string;
  currency: string;
  enrollmentId: string;
  id: string;
  metadata: Record<string, string | number | boolean | null> | null;
  paidAt: string | null;
  refundedAt: string | null;
  status: PaymentStatus;
  transactionId: string;
  user?: {
    email: string;
    id: string;
    name: string;
  } | undefined;
}

export interface AccountingPaymentsResponse {
  items: readonly PaymentHistoryItem[];
  limit: number;
  page: number;
  stats: {
    pendingPayments: number;
    refundedRevenue: number;
    successfulPayments: number;
    totalRevenue: number;
  };
  total: number;
}

function buildQueryString(query: Record<string, number | string | undefined>): string {
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

export async function listMyPayments(): Promise<readonly PaymentHistoryItem[]> {
  const response = await apiGet<readonly PaymentHistoryItem[]>("payments/me");

  return response.data;
}

export async function getPaymentById(id: string): Promise<PaymentHistoryItem> {
  const response = await apiGet<PaymentHistoryItem>(`payments/${id}`);

  return response.data;
}

export async function listAccountingPayments(query?: {
  limit?: number | undefined;
  page?: number | undefined;
  status?: PaymentStatus | undefined;
}): Promise<AccountingPaymentsResponse> {
  const response = await apiGet<AccountingPaymentsResponse>(
    `payments${buildQueryString({
      limit: query?.limit,
      page: query?.page,
      status: query?.status
    })}`
  );

  return response.data;
}

export async function refundPayment(
  id: string,
  values: RefundPaymentInput
): Promise<PaymentHistoryItem> {
  const response = await apiPost<RefundPaymentInput, PaymentHistoryItem>(
    `payments/${id}/refund`,
    values
  );

  return response.data;
}
