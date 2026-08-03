import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { RevenueBars } from "@/components/dashboard/revenue-bars";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import type { AdminAnalyticsOverview } from "@/lib/api/analytics";
import { getAdminAnalyticsOverview } from "@/lib/api/analytics";
import type { AdminDashboardStats } from "@/lib/api/admin";
import { getAdminDashboardStats } from "@/lib/api/admin";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/**
 * The platform view: four KPI cards, the revenue bars, the most-enrolled
 * courses, and a watch list of things that are actually waiting on someone.
 *
 * The watch list is derived, never written by hand — pending approvals and open
 * bugs are counts the page already holds, and a hardcoded "নজরে রাখা দরকার"
 * note would go stale the moment someone cleared the queue.
 */
export function AdminOverview(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const [statsQuery, analyticsQuery] = useQueries({
    queries: [
      { queryFn: async () => getAdminDashboardStats(), queryKey: queryKeys.admin.dashboard() },
      { queryFn: async () => getAdminAnalyticsOverview(), queryKey: queryKeys.analytics.admin() }
    ]
  });

  const stats: AdminDashboardStats | undefined = statsQuery?.data;
  const analytics: AdminAnalyticsOverview | undefined = analyticsQuery?.data;

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const watchlist = [
    {
      count: stats.pendingCourseApprovals,
      label: t("dash.statPendingApproval"),
      to: "/dashboard/admin/courses"
    },
    { count: stats.openBugs, label: t("dash.statOpenBugs"), to: "/dashboard/admin/bugs" }
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-6">
      <SectionHeading title={t("nav.overview")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.statRevenue")} value={format.currency(stats.revenue)} />
        <StatCard label={t("dash.statEnrollments")} value={format.number(stats.totalEnrollments)} />
        <StatCard label={t("dash.statStudents")} value={format.number(stats.totalStudents)} />
        <StatCard label={t("dash.statCourses")} value={format.number(stats.activeCourses)} />
      </div>

      {watchlist.length > 0 ? (
        <div className="border border-dashed border-dot-idle p-4">
          <p className="label-mono text-xs uppercase text-muted-faint">{t("dash.watchlist")}</p>
          <ul className="mt-3 space-y-2">
            {watchlist.map((item) => (
              <li className="flex items-center justify-between gap-4" key={item.label}>
                <Link className="text-sm text-ink-muted hover:text-ink" to={item.to}>
                  {item.label}
                </Link>
                <span className="label-mono text-xs font-semibold text-accent">{format.number(item.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {analytics ? <RevenueBars points={analytics.revenueTrend} title={t("dash.statRevenue")} /> : null}

      <div className="space-y-3">
        <SectionHeading
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/admin/analytics">{t("nav.analytics")}</Link>
            </Button>
          }
          title={t("dash.topCourses")}
        />
        {!analytics || analytics.completions.length === 0 ? (
          <EmptyState message={t("empty.generic")} />
        ) : (
          <ul className="border-t border-hairline">
            {analytics.completions.slice(0, 5).map((row) => (
              <li
                className="flex items-center justify-between gap-4 border-b border-hairline-fainter py-2.5"
                key={row.courseId}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                  {row.courseTitle}
                </span>
                <span className="shrink-0 text-xs text-muted-light">
                  {format.number(row.enrollmentCount)} · {format.percent(row.completionRate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
