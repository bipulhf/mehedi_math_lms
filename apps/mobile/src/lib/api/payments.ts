import { apiGet } from "@/src/lib/api-client";

/** A student's own payment history. */

export interface PaymentHistoryItem {
  amount: string;
  course: { id: string; title: string };
  createdAt: string;
  currency: string;
  enrollmentId: string | null;
  id: string;
  paidAt: string | null;
  refundedAt: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  transactionId: string;
}

export async function listMyPayments(): Promise<readonly PaymentHistoryItem[]> {
  return apiGet<readonly PaymentHistoryItem[]>("payments/me");
}
