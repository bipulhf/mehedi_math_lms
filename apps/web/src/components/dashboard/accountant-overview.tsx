import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import type { AccountantAnalyticsOverview } from "@/lib/api/analytics";
import { getAccountantAnalyticsOverview } from "@/lib/api/analytics";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/**
 * The accountant's home. There is no screen for this role in the handoff — its
 * fourth role is an institution admin, which is cut — so the layout follows the
 * admin overview: KPI cards over a list.
 *
 * The refund rate is real, derived from payment status, and is the one figure
 * here that earns the accent when it is non-zero.
 */
export function AccountantOverview(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { data, isPending } = useQuery<AccountantAnalyticsOverview>({
    queryFn: async () => getAccountantAnalyticsOverview(),
    queryKey: queryKeys.analytics.accountant()
  });

  if (isPending || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const refundRate = data.totalRevenue > 0 ? (data.totalRefunded / data.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-8">
      <SectionHeading
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/payments">{t("nav.payments")}</Link>
          </Button>
        }
        title={t("nav.payments")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard hue="teal" label={t("dash.statRevenue")} value={format.currency(data.totalRevenue)} />
        <StatCard hue="rose" label={t("dash.statRefunded")} value={format.currency(data.totalRefunded)} />
        <StatCard hue="amber"
          delta={format.percent(refundRate)}
          isDeltaAccent={refundRate > 0}
          label={t("dash.statRefunded")}
          value={format.number(data.refundedCount)}
        />
      </div>

      <div className="space-y-4">
        <SectionHeading title={t("dash.topCourses")} />
        {data.revenueByCourse.length === 0 ? (
          <EmptyState message={t("empty.generic")} />
        ) : (
          <ul className="border-t border-hairline">
            {data.revenueByCourse.slice(0, 8).map((row) => (
              <li
                className="flex items-center justify-between gap-4 border-b border-hairline-fainter py-4"
                key={row.courseId}
              >
                <span className="min-w-0 flex-1 truncate text-base text-ink-muted">
                  {row.courseTitle}
                </span>
                <span className="shrink-0 text-sm text-muted-light">
                  {format.currency(row.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
