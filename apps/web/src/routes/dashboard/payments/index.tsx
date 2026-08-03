import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";
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
import { queryKeys } from "@/lib/query/keys";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/payments/")({
  component: PaymentsPage,
  errorComponent: RouteErrorView
} as never);

function paymentTone(status: PaymentStatus): "attention" | "neutral" | "attention" {
  if (status === "SUCCESS") {
    return "neutral";
  }

  if (status === "PENDING") {
    return "attention";
  }

  return "attention";
}

function PaymentsPage(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const { isPending: isSessionPending, session } = useAuthSession();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");

  const role = session?.session.role;
  const canManagePayments = role === "ACCOUNTANT" || role === "ADMIN";
  const paymentFilters = { role: canManagePayments ? "staff" : "student", statusFilter };
  // One query, two shapes: staff get the accounting view with aggregates, a
  // student gets their own history and no stats at all.
  const { data, isPending: isLoading } = useQuery({
    enabled: !isSessionPending && Boolean(role),
    queryFn: async (): Promise<{
      items: readonly PaymentHistoryItem[];
      stats: {
        pendingPayments: number;
        refundedRevenue: number;
        successfulPayments: number;
        totalRevenue: number;
      } | null;
    }> => {
      if (canManagePayments) {
        const response = await listAccountingPayments({
          limit: 50,
          page: 1,
          status: statusFilter || undefined
        });

        return { items: response.items, stats: response.stats };
      }

      return { items: await listMyPayments(), stats: null };
    },
    queryKey: queryKeys.payments.list(paymentFilters)
  });
  const items: readonly PaymentHistoryItem[] = data?.items ?? [];
  const stats = data?.stats ?? null;

  const loadPayments = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
  };

  const handleRefund = async (paymentId: string): Promise<void> => {
    if (!window.confirm("Refund this payment?")) {
      return;
    }

    await refundPayment(paymentId, { remarks: "Refund issued from accountant operations dashboard." });
    toast.success(t("pay.refunded.done"));
    await loadPayments();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-chip-active" />
           <Skeleton className="h-4 w-full max-w-sm bg-chip-active" />
        </div>
        {canManagePayments && (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card/80 p-6 border border-hairline/30 relative overflow-hidden">
                <Skeleton className="h-4 w-24 mb-3 bg-chip-active" />
                <Skeleton className="h-9 w-32 bg-chip-active" />
              </div>
            ))}
          </section>
        )}
        <div className="bg-card/80 border border-hairline/40 overflow-hidden">
           <div className="p-0">
             <div className="bg-panel-warm h-12 w-full" />
             <div className="p-4 space-y-4">
               {Array.from({ length: 6 }).map((_, i) => (
                 <Skeleton key={i} className="h-16 w-full bg-chip-active" />
               ))}
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card/80 p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">
        <div className="mb-0">
          <h3 className="font-body text-3xl font-medium tracking-tight text-ink">
            {canManagePayments ? "Payment operations" : "Payment history"}
          </h3>
          <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">
            {canManagePayments
              ? "Track revenue, review transactions, and handle refunds from the accounting surface."
              : "Review your tuition payments, gateway outcomes, and enrollment transaction timeline."}
          </p>
        </div>
      </div>

      {canManagePayments && stats ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            // Through `format.currency`, so the taka sign sits tight against a
            // grouped number instead of a bare "BDT" beside a raw one.
            { label: t("an.totalRevenue"), value: format.currency(stats.totalRevenue) },
            { label: t("pay.success"), value: format.number(stats.successfulPayments) },
            { label: t("pay.pending"), value: format.number(stats.pendingPayments) },
            { label: t("pay.refunded"), value: format.currency(stats.refundedRevenue) }
          ].map((stat, i) => (
            <div key={i} className="bg-card/80 p-6 border border-hairline/30 relative overflow-hidden group">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/54">{stat.label}</p>
              <p className="mt-2 text-2xl font-body font-medium text-ink">{stat.value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {canManagePayments ? (
        <div className="bg-card/80 p-6 border border-hairline/40 relative w-full overflow-hidden">
          <div className="grid gap-4 md:grid-cols-[0.4fr]">
            <div className="space-y-2">
              <Label htmlFor="payment-status-filter" className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1">{t("pay.filterStatus")}</Label>
              <Select
                id="payment-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | "")}
                className="bg-panel-warm/50 border-hairline/30"
              >
                <option value="">{t("pay.allStatuses")}</option>
                <option value="PENDING">{t("pay.pending")}</option>
                <option value="SUCCESS">{t("pay.success")}</option>
                <option value="FAILED">{t("pay.failed")}</option>
                <option value="REFUNDED">{t("pay.refunded")}</option>
              </Select>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-card/80 border border-hairline/40 relative overflow-hidden">
        <div className="p-0">
          {items.length === 0 ? (
            <div className="p-10 text-center text-sm leading-7 text-muted font-light italic">{t("pay.empty")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-panel-warm/50 text-ink/54">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">{t("pay.course")}</th>
                    {canManagePayments ? <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">{t("pay.student")}</th> : null}
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">{t("pay.amount")}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">{t("pay.status")}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">{t("pay.transaction")}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">{t("pay.created")}</th>
                    {canManagePayments ? <th className="px-6 py-4 font-bold uppercase tracking-widest text-[0.65rem]">{t("pay.action")}</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/20">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top group/row hover:bg-panel-warm/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-body font-bold text-ink group-hover/row:text-ink transition-colors">{item.course.title}</p>
                          <p className="text-[0.65rem] font-mono text-muted bg-panel-warm/50 px-2 py-0.5 rounded-md inline-block">{item.course.id}</p>
                        </div>
                      </td>
                      {canManagePayments ? (
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="font-semibold text-ink">{item.user?.name ?? "Unknown"}</p>
                            <p className="text-xs text-muted/70 font-light">{item.user?.email ?? "Unknown"}</p>
                          </div>
                        </td>
                      ) : null}
                      <td className="px-6 py-5 font-body font-medium text-ink">
                                                  {Number(item.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-5">
                        <Badge tone={paymentTone(item.status)} className="rounded-full px-3">{item.status}</Badge>
                      </td>
                      <td className="px-6 py-5 text-[0.7rem] font-mono text-muted opacity-70">{item.transactionId}</td>
                      <td className="px-6 py-5 text-xs text-muted font-light">
                        {new Date(item.createdAt).toLocaleString("en-GB", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      {canManagePayments ? (
                        <td className="px-6 py-5">
                          {item.status === "SUCCESS" ? (
                            <Button size="sm" variant="outline" className="font-body font-semibold px-4 h-9 border-hairline/30 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 transition-all" onClick={() => void handleRefund(item.id)}>{t("pay.refund")}</Button>
                          ) : (
                            <span className="text-sm text-muted-faint">—</span>
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
