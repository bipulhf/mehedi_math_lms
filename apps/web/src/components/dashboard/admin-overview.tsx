import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { RevenueBars } from "@/components/dashboard/revenue-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import type { AdminAnalyticsOverview } from "@/lib/api/analytics";
import { getAdminAnalyticsOverview } from "@/lib/api/analytics";
import type { AdminDashboardStats } from "@/lib/api/admin";
import { getAdminDashboardStats } from "@/lib/api/admin";
import { listAdminBugs, type AdminBugRecord } from "@/lib/api/admin";
import { listCourses, type CourseSummary } from "@/lib/api/courses";
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

  const [statsQuery, analyticsQuery, approvalsQuery, bugsQuery] = useQueries({
    queries: [
      { queryFn: async () => getAdminDashboardStats(), queryKey: queryKeys.admin.dashboard() },
      { queryFn: async () => getAdminAnalyticsOverview(), queryKey: queryKeys.analytics.admin() },
      {
        queryFn: async () => listCourses({ limit: 5, page: 1, status: "PENDING" }),
        queryKey: queryKeys.admin.courses({ limit: 5, page: 1, status: "PENDING" })
      },
      {
        queryFn: async () => listAdminBugs({ limit: 5, page: 1, status: "OPEN" }),
        queryKey: queryKeys.admin.bugs({ limit: 5, page: 1, status: "OPEN" })
      }
    ]
  });

  const stats: AdminDashboardStats | undefined = statsQuery?.data;
  const analytics: AdminAnalyticsOverview | undefined = analyticsQuery?.data;
  const pendingCourses: readonly CourseSummary[] = approvalsQuery?.data?.data ?? [];
  const openBugs: readonly AdminBugRecord[] = bugsQuery?.data?.data ?? [];

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/admin/analytics">{t("nav.analytics")}</Link>
          </Button>
        }
        title={t("nav.overview")}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label={t("dash.statRevenue")} value={format.currency(stats.revenue)} />
        <StatCard label={t("dash.statEnrollments")} value={format.number(stats.totalEnrollments)} />
        <StatCard label={t("dash.statStudents")} value={format.number(stats.totalStudents)} />
        <StatCard label={t("dash.statCourses")} value={format.number(stats.activeCourses)} />
        <Link className="block" to="/dashboard/admin/courses">
          <StatCard label={t("dash.statPendingApproval")} value={format.number(stats.pendingCourseApprovals)} />
        </Link>
        <Link className="block" to="/dashboard/admin/bugs">
          <StatCard label={t("dash.statOpenBugs")} value={format.number(stats.openBugs)} />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="border border-hairline bg-card">
          <div className="flex items-center justify-between gap-4 border-b border-hairline p-5">
            <div>
              <p className="label-mono text-xs uppercase text-muted-faint">{t("dash.watchlist")}</p>
              <h2 className="mt-1 text-lg font-medium text-ink">{t("dash.statPendingApproval")}</h2>
            </div>
            <Badge tone={stats.pendingCourseApprovals > 0 ? "attention" : "neutral"}>
              {format.number(stats.pendingCourseApprovals)}
            </Badge>
          </div>
          {pendingCourses.length === 0 ? (
            <EmptyState className="my-4" message={t("empty.generic")} />
          ) : (
            <ul className="divide-y divide-hairline-fainter">
              {pendingCourses.map((course) => (
                <li key={course.id}>
                  <Link
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-row-hover"
                    to="/dashboard/admin/courses"
                  >
                    <span className="min-w-0 truncate text-sm text-ink-muted">{course.title}</span>
                    <span className="shrink-0 text-xs text-muted-light">
                      {course.creator.name} · {format.date(course.submittedAt ?? course.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-hairline bg-card">
          <div className="flex items-center justify-between gap-4 border-b border-hairline p-5">
            <div>
              <p className="label-mono text-xs uppercase text-muted-faint">{t("dash.watchlist")}</p>
              <h2 className="mt-1 text-lg font-medium text-ink">{t("dash.statOpenBugs")}</h2>
            </div>
            <Badge tone={stats.openBugs > 0 ? "attention" : "neutral"}>
              {format.number(stats.openBugs)}
            </Badge>
          </div>
          {openBugs.length === 0 ? (
            <EmptyState className="my-4" message={t("empty.generic")} />
          ) : (
            <ul className="divide-y divide-hairline-fainter">
              {openBugs.slice(0, 5).map((bug) => (
                <li key={bug.id}>
                  <Link
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-row-hover"
                    params={{ id: bug.id }}
                    to="/dashboard/admin/bugs/$id"
                  >
                    <span className="min-w-0 truncate text-sm text-ink-muted">{bug.title}</span>
                    <span className="shrink-0 text-xs text-muted-light">
                      {bug.user.name} · {bug.status.replace("_", " ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {analytics ? <RevenueBars points={analytics.revenueTrend} title={t("dash.statRevenue")} /> : null}

      <div className="space-y-3">
        <SectionHeading
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
                <Link
                  className="flex min-w-0 flex-1 items-center justify-between gap-4 transition-colors hover:text-ink"
                  params={{ id: row.courseId }}
                  to="/dashboard/courses/$id/analytics"
                >
                  <span className="min-w-0 truncate text-sm text-ink-muted">{row.courseTitle}</span>
                  <span className="shrink-0 text-xs text-muted-light">
                    {format.number(row.enrollmentCount)} · {format.percent(row.completionRate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
