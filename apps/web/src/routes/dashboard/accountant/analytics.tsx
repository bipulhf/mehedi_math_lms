import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { ChartFrame } from "@/components/charts/chart-frame";
import { SeriesBarChart } from "@/components/charts/bar-chart";
import { SeriesHorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AccountantAnalyticsOverview } from "@/lib/api/analytics";
import { getAccountantAnalyticsOverview } from "@/lib/api/analytics";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/accountant/analytics")({
  head: () =>
    seo({
      description: "Revenue, refunds, and payment trends across the platform.",
      path: "/dashboard/accountant/analytics",
      title: "Accountant Analytics"
    }),
  component: AccountantAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

function AccountantAnalyticsPage(): JSX.Element {
  const t = useT();

  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const allowed = session?.session.role === "ACCOUNTANT" || session?.session.role === "ADMIN";
  const { data = null, isPending: isLoading } = useQuery<AccountantAnalyticsOverview>({
    enabled: !isPending && allowed,
    queryFn: async () => getAccountantAnalyticsOverview(),
    queryKey: queryKeys.analytics.accountant()
  });

  useEffect(() => {
    if (isPending || !session) {
      return;
    }

    if (session.session.role !== "ACCOUNTANT" && session.session.role !== "ADMIN") {
      void router.navigate({ to: "/dashboard" });
    }
  }, [isPending, router, session]);

  const statusChart = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.paymentStatusDistribution.map((row) => ({
      label: row.status,
      value: row.count
    }));
  }, [data]);

  if (isPending || !allowed) {
    return <DataTableSkeleton columns={2} rows={4} />;
  }

  if (isLoading && !data) {
    return <DataTableSkeleton columns={2} rows={4} />;
  }

  if (!data) {
    return <p className="text-sm text-ink/68">{t("an.loadFailed")}</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("an.financeTitle")}</CardTitle>
          <CardDescription>{t("an.financeLead")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/54">{t("an.totalRevenue")}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{data.totalRevenue.toFixed(2)} BDT</p>
          </div>
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/54">{t("pay.refunded")}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {data.totalRefunded.toFixed(2)} BDT ({data.refundedCount} txns)
            </p>
          </div>
          <Link
            className="inline-flex items-center self-center rounded-md border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-panel-warm"
            to="/dashboard/payments"
          >{t("an.paymentOps")}</Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFrame height={360} title={t("an.revenueByCourse")}>
          {data.revenueByCourse.length === 0 ? (
            <p className="text-sm text-ink/62">{t("an.noRevenue")}</p>
          ) : (
            <SeriesHorizontalBarChart
              ariaLabel={t("an.revenueByCourse")}
              data={data.revenueByCourse.map((r) => ({
                label: r.courseTitle.slice(0, 24),
                value: r.revenue
              }))}
              height={360}
            />
          )}
        </ChartFrame>

        <ChartFrame height={360} title={t("an.statusMix")}>
          {statusChart.length === 0 ? (
            <p className="text-sm text-ink/62">{t("an.noPayments")}</p>
          ) : (
            <SeriesBarChart ariaLabel={t("an.statusMix")} data={statusChart} height={360} />
          )}
        </ChartFrame>
      </div>
    </div>
  );
}
