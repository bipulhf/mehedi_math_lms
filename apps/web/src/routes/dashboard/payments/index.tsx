import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX, KeyboardEvent, MouseEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { PaymentHistoryItem, PaymentStatus } from "@/lib/api/payments";
import { listAccountingPayments, listMyPayments, refundPayment } from "@/lib/api/payments";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/payments/")({
  head: () =>
    seo({
      description: "Every tuition payment and its gateway outcome, in one place.",
      path: "/dashboard/payments",
      title: "Payments"
    }),
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

  const [refundTarget, setRefundTarget] = useState<PaymentHistoryItem | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const activateRefund = (item: PaymentHistoryItem): void => {
    if (canManagePayments && item.status === "SUCCESS") {
      setRefundTarget(item);
    }
  };

  const activatePaymentRow = (item: PaymentHistoryItem, event: MouseEvent<HTMLElement>): void => {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) {
      return;
    }

    activateRefund(item);
  };

  const activatePaymentWithKeyboard = (
    item: PaymentHistoryItem,
    event: KeyboardEvent<HTMLElement>
  ): void => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    activateRefund(item);
  };

  const executeRefund = async (): Promise<void> => {
    if (!refundTarget) {
      return;
    }

    setIsRefunding(true);
    try {
      await refundPayment(refundTarget.id, {
        remarks: "Refund issued from accountant operations dashboard."
      });
      toast.success(t("pay.refunded.done"));
      setRefundTarget(null);
      await loadPayments();
    } finally {
      setIsRefunding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card p-4 sm:p-6 lg:p-8 border border-hairline relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4" />
           <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        {canManagePayments && (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card p-6 border border-hairline/30 relative overflow-hidden">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-9 w-32" />
              </div>
            ))}
          </section>
        )}
        <div className="bg-card border border-hairline overflow-hidden">
           <div className="p-0">
             <div className="bg-panel-warm h-12 w-full" />
             <div className="p-4 space-y-4">
               {Array.from({ length: 6 }).map((_, i) => (
                 <Skeleton key={i} className="h-16 w-full" />
               ))}
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-6">
        <div>
          <h1 className="text-xl font-medium text-ink">
            {canManagePayments ? "Payment Operations" : "Payment History"}
          </h1>
          <p className="mt-0.5 text-sm font-light text-muted">
            {canManagePayments
              ? "Track revenue, review transactions, and handle refunds from the accounting surface."
              : "Review your tuition payments, gateway outcomes, and enrollment transaction timeline."}
          </p>
        </div>
      </div>

      {canManagePayments && stats ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t("an.totalRevenue"), value: format.currency(stats.totalRevenue) },
            { label: t("pay.success"), value: format.number(stats.successfulPayments) },
            { label: t("pay.pending"), value: format.number(stats.pendingPayments) },
            { label: t("pay.refunded"), value: format.currency(stats.refundedRevenue) }
          ].map((stat, i) => (
            <div key={i} className="border border-hairline bg-card p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wider text-muted-faint">{stat.label}</p>
              <p className="mt-1 text-2xl font-medium text-ink">{stat.value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {canManagePayments ? (
        <div className="border border-hairline bg-card p-6">
          <div className="max-w-xs space-y-1">
            <Label htmlFor="payment-status-filter">{t("pay.filterStatus")}</Label>
            <Select
              id="payment-status-filter"
              onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | "")}
              value={statusFilter}
            >
              <option value="">{t("pay.allStatuses")}</option>
              <option value="PENDING">{t("pay.pending")}</option>
              <option value="SUCCESS">{t("pay.success")}</option>
              <option value="FAILED">{t("pay.failed")}</option>
              <option value="REFUNDED">{t("pay.refunded")}</option>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="border border-hairline bg-card">
        <div>
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState message={t("pay.empty")} />
            </div>
          ) : (
            // A table of seven columns is not a phone layout. Below `md` the
            // same rows are stacked as cards, the way `DataTable` does it.
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-panel-warm/40 text-xs font-semibold uppercase tracking-wider text-muted-faint">
                    <th className="px-4 py-2.5">{t("pay.course")}</th>
                    {canManagePayments ? <th className="px-4 py-2.5">{t("pay.student")}</th> : null}
                    <th className="px-4 py-2.5">{t("pay.amount")}</th>
                    <th className="px-4 py-2.5">{t("pay.status")}</th>
                    <th className="px-4 py-2.5">{t("pay.transaction")}</th>
                    <th className="px-4 py-2.5">{t("pay.created")}</th>
                    {canManagePayments ? <th className="px-4 py-2.5">{t("pay.action")}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      className={cn(
                        "border-b border-hairline-fainter transition-colors last:border-b-0 hover:bg-row-hover",
                        canManagePayments && item.status === "SUCCESS" && "cursor-pointer"
                      )}
                      key={item.id}
                      onClick={(event) => activatePaymentRow(item, event)}
                      onKeyDown={(event) => activatePaymentWithKeyboard(item, event)}
                      role={canManagePayments && item.status === "SUCCESS" ? "button" : undefined}
                      tabIndex={canManagePayments && item.status === "SUCCESS" ? 0 : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-ink">{item.course.title}</span>
                          <span className="text-xs font-mono text-muted-faint">{item.course.id.slice(0, 8)}…</span>
                        </div>
                      </td>
                      {canManagePayments ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-ink">{item.user?.name ?? "Unknown"}</span>
                            <span className="text-xs text-muted-faint">{item.user?.email ?? "Unknown"}</span>
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-ink">
                        {Number(item.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={paymentTone(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-faint">{item.transactionId}</td>
                      <td className="px-4 py-3 text-xs text-muted font-light">
                        {new Date(item.createdAt).toLocaleString("en-GB", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      {canManagePayments ? (
                        <td className="px-4 py-3">
                          {item.status === "SUCCESS" ? (
                            <Button onClick={() => setRefundTarget(item)} size="xs" variant="outline">{t("pay.refund")}</Button>
                          ) : (
                            <span className="text-xs text-muted-faint">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length === 0 ? null : (
            <div className="divide-y divide-hairline-fainter md:hidden">
              {items.map((item) => (
                <div className="space-y-3 p-4" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{item.course.title}</p>
                      {canManagePayments ? (
                        <p className="truncate text-xs text-muted-faint">
                          {item.user?.email ?? "Unknown"}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={paymentTone(item.status)}>{item.status}</Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-light">{t("pay.amount")}</dt>
                      <dd className="font-medium text-ink">{Number(item.amount).toFixed(2)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-light">{t("pay.created")}</dt>
                      <dd className="text-muted">
                        {new Date(item.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-xs text-muted-light">{t("pay.transaction")}</dt>
                      <dd className="truncate font-mono text-xs text-muted-faint">
                        {item.transactionId}
                      </dd>
                    </div>
                  </dl>

                  {canManagePayments && item.status === "SUCCESS" ? (
                    <Button
                      className="w-full"
                      onClick={() => setRefundTarget(item)}
                      size="sm"
                      variant="outline"
                    >
                      {t("pay.refund")}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        dangerous
        confirmLabel={t("pay.refund")}
        description={
          refundTarget
            ? `Refund ${Number(refundTarget.amount).toFixed(2)} paid for "${refundTarget.course.title}"? This cancels the enrolment it paid for.`
            : ""
        }
        onCancel={() => setRefundTarget(null)}
        onConfirm={() => void executeRefund()}
        open={refundTarget !== null}
        pending={isRefunding}
        title="Refund payment"
      />
    </div>
  );
}
