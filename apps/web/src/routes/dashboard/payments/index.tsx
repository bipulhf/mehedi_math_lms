import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { PaymentHistoryItem, PaymentStatus } from "@/lib/api/payments";
import { listAccountingPayments, listMyPayments, refundPayment } from "@/lib/api/payments";

export const Route = createFileRoute("/dashboard/payments/" as never)({
  component: PaymentsPage,
  errorComponent: RouteErrorView
} as never);

function paymentTone(status: PaymentStatus): "amber" | "green" | "red" {
  if (status === "SUCCESS") {
    return "green";
  }

  if (status === "PENDING") {
    return "amber";
  }

  return "red";
}

function PaymentsPage(): JSX.Element {
  const { isPending: isSessionPending, session } = useAuthSession();
  const [items, setItems] = useState<readonly PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [stats, setStats] = useState<{
    pendingPayments: number;
    refundedRevenue: number;
    successfulPayments: number;
    totalRevenue: number;
  } | null>(null);

  const role = session?.session.role;
  const canManagePayments = role === "ACCOUNTANT" || role === "ADMIN";

  const loadPayments = async (): Promise<void> => {
    if (isSessionPending || !role) {
      return;
    }

    setIsLoading(true);

    try {
      if (canManagePayments) {
        const response = await listAccountingPayments({
          limit: 50,
          page: 1,
          status: statusFilter || undefined
        });
        setItems(response.items);
        setStats(response.stats);
      } else {
        const response = await listMyPayments();
        setItems(response);
        setStats(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, [canManagePayments, isSessionPending, role, statusFilter]);

  const handleRefund = async (paymentId: string): Promise<void> => {
    if (!window.confirm("Refund this payment?")) {
      return;
    }

    await refundPayment(paymentId, { remarks: "Refund issued from accountant operations dashboard." });
    toast.success("Payment refunded");
    await loadPayments();
  };

  if (isLoading) {
    return <DataTableSkeleton columns={canManagePayments ? 6 : 5} rows={6} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{canManagePayments ? "Payment operations" : "Payment history"}</CardTitle>
          <CardDescription>
            {canManagePayments
              ? "Track revenue, review transactions, and handle refunds from the accounting surface."
              : "Review your tuition payments, gateway outcomes, and enrollment transaction timeline."}
          </CardDescription>
        </CardHeader>
      </Card>

      {canManagePayments && stats ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-on-surface/62">Total revenue</p>
              <p className="mt-2 text-3xl font-semibold text-on-surface">BDT {stats.totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-on-surface/62">Successful payments</p>
              <p className="mt-2 text-3xl font-semibold text-on-surface">{stats.successfulPayments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-on-surface/62">Pending payments</p>
              <p className="mt-2 text-3xl font-semibold text-on-surface">{stats.pendingPayments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-on-surface/62">Refunded value</p>
              <p className="mt-2 text-3xl font-semibold text-on-surface">BDT {stats.refundedRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {canManagePayments ? (
        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-[0.5fr]">
            <div className="space-y-2">
              <Label htmlFor="payment-status-filter">Status</Label>
              <Select
                id="payment-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | "")}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6 text-sm leading-7 text-on-surface/68">No payments found for the current view.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface-container-low text-on-surface/68">
                  <tr>
                    <th className="px-4 py-3 font-medium">Course</th>
                    {canManagePayments ? <th className="px-4 py-3 font-medium">Student</th> : null}
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Transaction</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    {canManagePayments ? <th className="px-4 py-3 font-medium">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-outline-variant align-top">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-on-surface">{item.course.title}</p>
                          <p className="text-xs text-on-surface/54">{item.course.id}</p>
                        </div>
                      </td>
                      {canManagePayments ? (
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-on-surface">{item.user?.name ?? "Unknown"}</p>
                            <p className="text-xs text-on-surface/54">{item.user?.email ?? "Unknown"}</p>
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-4 text-on-surface">BDT {Number(item.amount).toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <Badge tone={paymentTone(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-4 text-xs text-on-surface/62">{item.transactionId}</td>
                      <td className="px-4 py-4 text-on-surface/62">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      {canManagePayments ? (
                        <td className="px-4 py-4">
                          {item.status === "SUCCESS" ? (
                            <Button size="sm" variant="outline" onClick={() => void handleRefund(item.id)}>
                              Refund
                            </Button>
                          ) : (
                            <span className="text-xs text-on-surface/54">No action</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
