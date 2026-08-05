import { createFileRoute } from "@tanstack/react-router";
import { Ban, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { clientEnv } from "@/lib/env";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/payments/mock")({
  head: () =>
    seo({
      description: "A local stand-in for the payment gateway, for testing.",
      path: "/dashboard/payments/mock",
      title: "Mock Payment"
    }),
  component: MockPaymentPage,
  errorComponent: RouteErrorView
} as never);

interface MockAction {
  href: string;
  hint: string;
  icon: LucideIcon;
  isPrimary: boolean;
  label: string;
}

function IdRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="label-mono text-xs uppercase text-muted-faint">{label}</dt>
      {/* Ids are long and a phone is 360px wide: they wrap rather than push the
          card sideways, and stay selectable so they can be pasted into a log. */}
      <dd className="break-all font-mono text-sm text-ink">{value}</dd>
    </div>
  );
}

/**
 * The stand-in gateway used when no SSLCommerz keys are configured.
 *
 * It is a developer tool, so it says plainly what each button does to the
 * payment and the enrolment — the three outcomes are the whole point of the
 * page, and "Simulate failure" alone does not say whether an enrolment is left
 * behind.
 */
function MockPaymentPage(): JSX.Element {
  const t = useT();

  const [origin, setOrigin] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  // The gateway hands the ids back on the query string, which only exists in
  // the browser — hence a mount effect rather than a route search schema. Until
  // it has run there is nothing to show, which is what `hasReadSearch` is for:
  // without it the page renders "unavailable" for a frame and looks broken.
  const [hasReadSearch, setHasReadSearch] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    setOrigin(window.location.origin);
    setPaymentId(searchParams.get("paymentId") ?? "");
    setTransactionId(searchParams.get("transactionId") ?? "");
    setHasReadSearch(true);
  }, []);

  const actions = useMemo<readonly MockAction[]>(() => {
    const query = `paymentId=${encodeURIComponent(paymentId)}&tran_id=${encodeURIComponent(transactionId)}&origin=${encodeURIComponent(origin)}`;

    return [
      {
        href: `${clientEnv.apiBaseUrl}/payments/success?${query}&val_id=${encodeURIComponent(`MOCK-${transactionId}`)}`,
        hint: t("paymock.successHint"),
        icon: CheckCircle2,
        isPrimary: true,
        label: t("paymock.success")
      },
      {
        href: `${clientEnv.apiBaseUrl}/payments/fail?${query}`,
        hint: t("paymock.failHint"),
        icon: XCircle,
        isPrimary: false,
        label: t("paymock.fail")
      },
      {
        href: `${clientEnv.apiBaseUrl}/payments/cancel?${query}`,
        hint: t("paymock.cancelHint"),
        icon: Ban,
        isPrimary: false,
        label: t("paymock.cancel")
      }
    ];
  }, [origin, paymentId, t, transactionId]);

  return (
    <div className="w-full space-y-6">
      <BackButton to="/dashboard/payments" />

      <div className="border border-hairline bg-card p-4 sm:p-6">
        <h1 className="text-xl font-medium text-ink">{t("paymock.titlePage")}</h1>
        <p className="mt-0.5 text-sm font-light text-muted">{t("paymock.leadPage")}</p>
      </div>

      <div className="border border-hairline bg-card p-4 sm:p-6">
        {!hasReadSearch ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : paymentId.length === 0 ? (
          <EmptyState message={t("paymock.missingIds")} />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <IdRow label={t("paymock.paymentId")} value={paymentId} />
            <IdRow label={t("paymock.transactionId")} value={transactionId} />
          </dl>
        )}
      </div>

      {hasReadSearch && paymentId.length > 0 ? (
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              className="flex flex-col gap-3 border border-hairline bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              key={action.label}
            >
              <div className="flex min-w-0 items-start gap-3">
                <action.icon
                  aria-hidden="true"
                  className={`mt-0.5 size-5 shrink-0 ${action.isPrimary ? "text-accent" : "text-muted-faint"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{action.label}</p>
                  <p className="mt-0.5 text-sm font-light text-muted">{action.hint}</p>
                </div>
              </div>
              <Button
                className="w-full shrink-0 sm:w-auto"
                onClick={() => {
                  window.location.href = action.href;
                }}
                variant={action.isPrimary ? "ink" : "outline"}
              >
                {action.label}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
