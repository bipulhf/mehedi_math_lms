import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentHistoryItem } from "@/lib/api/payments";
import { getPaymentById } from "@/lib/api/payments";

export const Route = createFileRoute("/dashboard/payments/return" as never)({
  component: PaymentReturnPage,
  errorComponent: RouteErrorView
} as never);

function PaymentReturnPage(): JSX.Element {
  const [payment, setPayment] = useState<PaymentHistoryItem | null>(null);
  const [status, setStatus] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentId = searchParams.get("paymentId");
    const nextStatus = searchParams.get("status") ?? "pending";

    setStatus(nextStatus);

    if (!paymentId) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const record = await getPaymentById(paymentId);
        setPayment(record);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <DataTableSkeleton columns={3} rows={3} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Payment {status}</CardTitle>
          <CardDescription>
            The gateway returned your transaction. Review the latest payment state below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payment ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge tone={payment.status === "SUCCESS" ? "green" : payment.status === "PENDING" ? "amber" : "red"}>
                  {payment.status}
                </Badge>
                <Badge tone="blue">{payment.course.title}</Badge>
              </div>
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                <p>Amount: BDT {Number(payment.amount).toFixed(2)}</p>
                <p>Transaction ID: {payment.transactionId}</p>
                <p>Created: {new Date(payment.createdAt).toLocaleString()}</p>
                <p>Paid at: {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "Not completed yet"}</p>
              </div>
            </>
          ) : (
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
              Payment details are unavailable. The callback may have been interrupted before the final redirect.
            </div>
          )}
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/dashboard/payments">Open payment history</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/my-courses">Go to my courses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
