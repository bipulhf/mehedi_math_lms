import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clientEnv } from "@/lib/env";

export const Route = createFileRoute("/dashboard/payments/mock" as never)({
  component: MockPaymentPage,
  errorComponent: RouteErrorView
} as never);

function MockPaymentPage(): JSX.Element {
  const [origin, setOrigin] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setOrigin(window.location.origin);
    setPaymentId(searchParams.get("paymentId") ?? "");
    setTransactionId(searchParams.get("transactionId") ?? "");
  }, []);

  const actions = useMemo(
    () => [
      {
        href: `${clientEnv.apiBaseUrl}/payments/success?paymentId=${encodeURIComponent(paymentId)}&tran_id=${encodeURIComponent(transactionId)}&val_id=${encodeURIComponent(`MOCK-${transactionId}`)}&origin=${encodeURIComponent(origin)}`,
        label: "Simulate success"
      },
      {
        href: `${clientEnv.apiBaseUrl}/payments/fail?paymentId=${encodeURIComponent(paymentId)}&tran_id=${encodeURIComponent(transactionId)}&origin=${encodeURIComponent(origin)}`,
        label: "Simulate failure"
      },
      {
        href: `${clientEnv.apiBaseUrl}/payments/cancel?paymentId=${encodeURIComponent(paymentId)}&tran_id=${encodeURIComponent(transactionId)}&origin=${encodeURIComponent(origin)}`,
        label: "Simulate cancel"
      }
    ],
    [origin, paymentId, transactionId]
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Mock gateway</CardTitle>
          <CardDescription>
            SSLCommerz credentials are not configured, so this local payment gateway lets you finish the
            Phase 13 flow during development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
            <p>Payment ID: {paymentId || "Unavailable"}</p>
            <p>Transaction ID: {transactionId || "Unavailable"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.label === "Simulate success" ? "primary" : "outline"}
                onClick={() => {
                  window.location.href = action.href;
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
