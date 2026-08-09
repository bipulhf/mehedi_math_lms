import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import type { MessageKey } from "@mma/i18n";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentHistoryItem } from "@/lib/api/payments";
import { getPaymentById } from "@/lib/api/payments";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/payments/return")({
  head: () =>
    seo({
      description: "The outcome of your most recent payment.",
      path: "/dashboard/payments/return",
      title: "Payment Result"
    }),
  component: PaymentReturnPage,
  errorComponent: RouteErrorView
} as never);

type ReturnStatus = "cancel" | "fail" | "pending" | "success";

interface Outcome {
  icon: LucideIcon;
  isGood: boolean;
  leadKey: MessageKey;
  titleKey: MessageKey;
}

/**
 * What the page says, from the gateway's own word for what happened.
 *
 * The payment record is the truth about money and is shown below; this is the
 * headline, and it has to be right even when the record cannot be loaded —
 * which is exactly the case where a student is most worried.
 */
const outcomes = {
  cancel: {
    icon: XCircle,
    isGood: false,
    leadKey: "payreturn.cancelledLead",
    titleKey: "payreturn.cancelled"
  },
  fail: {
    icon: XCircle,
    isGood: false,
    leadKey: "payreturn.failedLead",
    titleKey: "payreturn.failed"
  },
  pending: {
    icon: Clock,
    isGood: false,
    leadKey: "payreturn.pendingLead",
    titleKey: "payreturn.pending"
  },
  success: {
    icon: CheckCircle2,
    isGood: true,
    leadKey: "payreturn.successLead",
    titleKey: "payreturn.success"
  }
} as const satisfies Record<ReturnStatus, Outcome>;

function readStatus(value: string | null): ReturnStatus {
  return value === "success" || value === "fail" || value === "cancel" ? value : "pending";
}

function statusTone(status: PaymentHistoryItem["status"]): "attention" | "faded" | "neutral" {
  if (status === "SUCCESS") {
    return "neutral";
  }

  // Pending is the one that needs somebody to come back to it. A failure is
  // finished, so it reads as quiet rather than alarming. DESIGN.md §2.
  return status === "PENDING" ? "attention" : "faded";
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="label-mono text-xs uppercase text-muted-faint">{label}</dt>
      <dd className="break-words text-sm text-ink">{value}</dd>
    </div>
  );
}

function PaymentReturnPage(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const [status, setStatus] = useState<ReturnStatus>("pending");
  // The gateway hands the ids back on the query string, which only exists in the
  // browser -- hence a mount effect rather than a route search schema.
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [hasReadSearch, setHasReadSearch] = useState(false);
  const { data: payment = null, isPending } = useQuery<PaymentHistoryItem>({
    enabled: Boolean(paymentId),
    queryFn: async () => getPaymentById(paymentId ?? ""),
    queryKey: queryKeys.payments.detail(paymentId ?? "")
  });
  const isLoading = !hasReadSearch || (Boolean(paymentId) && isPending);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    setStatus(readStatus(searchParams.get("status")));
    setPaymentId(searchParams.get("paymentId"));
    setHasReadSearch(true);
  }, []);

  const outcome = outcomes[status];
  const OutcomeIcon = outcome.icon;

  return (
    <div className="w-full space-y-6">
      <BackButton to="/dashboard/payments" />

      <div className="border border-hairline bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <OutcomeIcon
            aria-hidden="true"
            className={`mt-0.5 size-6 shrink-0 ${outcome.isGood ? "text-accent" : "text-muted-faint"}`}
          />
          <div className="min-w-0">
            <h1 className="text-xl font-medium text-ink">{t(outcome.titleKey)}</h1>
            <p className="mt-0.5 text-sm font-light text-muted">{t(outcome.leadKey)}</p>
          </div>
        </div>
      </div>

      <div className="border border-hairline bg-card p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-7 w-32 rounded-[var(--radius-pill)]" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="space-y-1.5" key={index}>
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ))}
            </div>
          </div>
        ) : payment === null ? (
          <EmptyState message={t("payreturn.missing")} />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
              <span className="text-sm text-muted">{payment.course.title}</span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label={t("pay.amount")} value={format.currency(payment.amount)} />
              <Fact label={t("pay.created")} value={format.dateTime(payment.createdAt)} />
              <Fact
                label={t("payreturn.paidAt")}
                value={payment.paidAt ? format.dateTime(payment.paidAt) : t("payreturn.notPaidYet")}
              />
              <Fact label={t("pay.transaction")} value={payment.transactionId} />
            </dl>

            {/* A discounted purchase collects less than the list price by
                design, so the coupon has to be on the receipt or the number
                above looks wrong. ADR-0013. */}
            {payment.couponCode === null ? null : (
              <dl className="grid gap-4 border-t border-hairline pt-4 sm:grid-cols-3">
                <Fact label={t("coupon.code")} value={payment.couponCode} />
                <Fact
                  label={t("coupon.listPrice")}
                  value={format.currency(payment.listAmount ?? payment.amount)}
                />
                <Fact
                  label={t("coupon.discount")}
                  value={`−${format.currency(payment.discountAmount ?? "0")}`}
                />
              </dl>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="w-full sm:w-auto">
          <Link to="/dashboard/payments">{t("paymock.openHistory")}</Link>
        </Button>
        <Button asChild className="w-full sm:w-auto" variant="outline">
          <Link to="/dashboard/my-courses">{t("paymock.goCourses")}</Link>
        </Button>
      </div>
    </div>
  );
}
