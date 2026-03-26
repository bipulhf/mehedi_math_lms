import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    return (
      <div className="space-y-6">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
           <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest" />
        </div>
        {canManagePayments && (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-6 border border-outline-variant/30 shadow-lg relative overflow-hidden">
                <Skeleton className="h-4 w-24 mb-3 bg-surface-container-highest" />
                <Skeleton className="h-9 w-32 bg-surface-container-highest" />
              </div>
            ))}
          </section>
        )}
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden">
           <div className="p-0">
             <div className="bg-surface-container-low h-12 w-full" />
             <div className="p-4 space-y-4">
               {Array.from({ length: 6 }).map((_, i) => (
                 <Skeleton key={i} className="h-16 w-full rounded-2xl bg-surface-container-high" />
               ))}
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        <div className="mb-0">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            {canManagePayments ? "Payment operations" : "Payment history"}
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
            {canManagePayments
              ? "Track revenue, review transactions, and handle refunds from the accounting surface."
              : "Review your tuition payments, gateway outcomes, and enrollment transaction timeline."}
          </p>
        </div>
      </div>

      {canManagePayments && stats ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total revenue", value: `BDT ${stats.totalRevenue.toFixed(2)}` },
            { label: "Successful payments", value: stats.successfulPayments },
            { label: "Pending payments", value: stats.pendingPayments },
            { label: "Refunded value", value: `BDT ${stats.refundedRevenue.toFixed(2)}` }
          ].map((stat, i) => (
            <div key={i} className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-6 border border-outline-variant/30 shadow-lg relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-secondary/10 transition-colors z-[-1]"></div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/54">{stat.label}</p>
              <p className="mt-2 text-2xl font-headline font-extrabold text-on-surface">{stat.value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {canManagePayments ? (
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-6 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
          <div className="grid gap-4 md:grid-cols-[0.4fr]">
            <div className="space-y-2">
              <Label htmlFor="payment-status-filter" className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1">Filter by Status</Label>
              <Select
                id="payment-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | "")}
                className="bg-surface-container-low/50 rounded-2xl border-outline-variant/30"
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </Select>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative overflow-hidden">
        <div className="p-0">
          {items.length === 0 ? (
            <div className="p-10 text-center text-sm leading-7 text-on-surface-variant font-light italic">
              No payments found for the current view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface-container-low/50 text-on-surface/54">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">Course</th>
                    {canManagePayments ? <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">Student</th> : null}
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">Amount</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">Status</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">Transaction</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">Created</th>
                    {canManagePayments ? <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">Action</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top group/row hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-headline font-bold text-on-surface group-hover/row:text-primary transition-colors">{item.course.title}</p>
                          <p className="text-[0.65rem] font-mono text-on-surface-variant bg-surface-container-low/50 px-2 py-0.5 rounded-md inline-block">{item.course.id}</p>
                        </div>
                      </td>
                      {canManagePayments ? (
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="font-semibold text-on-surface">{item.user?.name ?? "Unknown"}</p>
                            <p className="text-xs text-on-surface-variant/70 font-light">{item.user?.email ?? "Unknown"}</p>
                          </div>
                        </td>
                      ) : null}
                      <td className="px-6 py-5 font-headline font-extrabold text-on-surface">
                         <span className="text-[0.7rem] text-on-surface-variant mr-1">BDT</span>
                         {Number(item.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-5">
                        <Badge tone={paymentTone(item.status)} className="rounded-full px-3">{item.status}</Badge>
                      </td>
                      <td className="px-6 py-5 text-[0.7rem] font-mono text-on-surface-variant opacity-70">{item.transactionId}</td>
                      <td className="px-6 py-5 text-xs text-on-surface-variant font-light">
                        {new Date(item.createdAt).toLocaleString("en-GB", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      {canManagePayments ? (
                        <td className="px-6 py-5">
                          {item.status === "SUCCESS" ? (
                            <Button size="sm" variant="outline" className="rounded-xl font-headline font-semibold px-4 h-9 border-outline-variant/30 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 transition-all" onClick={() => void handleRefund(item.id)}>
                              Refund
                            </Button>
                          ) : (
                            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/30">N/A</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
