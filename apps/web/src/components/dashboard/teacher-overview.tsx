import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { RevenueBars } from "@/components/dashboard/revenue-bars";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import type { TeacherAnalyticsOverview } from "@/lib/api/analytics";
import { getTeacherAnalyticsOverview } from "@/lib/api/analytics";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/**
 * The teacher's home. The design shows four stat cards, a revenue chart and a
 * list of recent enrolments.
 *
 * The revenue figure is **gross course revenue**, not a payout. There is no
 * revenue-share model in the schema, so the design's "৭০% তোমার" split and its
 * payout table are cut — GENEX_MIGRATION.md §2.
 */
export function TeacherOverview({ name }: { name: string }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { data, isPending } = useQuery<TeacherAnalyticsOverview>({
    queryFn: async () => getTeacherAnalyticsOverview(),
    queryKey: queryKeys.analytics.teacher()
  });

  if (isPending || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const revenue = data.revenueTrend.reduce((total, point) => total + point.value, 0);

  return (
    <div className="space-y-8">
      <SectionHeading
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/analytics">{t("nav.analytics")}</Link>
          </Button>
        }
        title={t("dash.greeting", { name })}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard hue="ember" label={t("dash.statRevenue")} value={format.currency(revenue)} />
        <StatCard hue="teal"
          label={t("dash.statEnrollments")}
          value={format.number(data.totalEnrollments)}
        />
        <StatCard hue="indigo" label={t("dash.statCourses")} value={format.number(data.courseCount)} />
        <StatCard hue="violet" label={t("dash.statLessons")} value={format.number(data.lectureCount)} />
      </div>

      <RevenueBars points={data.revenueTrend} title={t("dash.statRevenue")} />

      <div className="space-y-4">
        <SectionHeading title={t("dash.topCourses")} />
        {data.completions.length === 0 ? (
          <EmptyState message={t("empty.generic")} />
        ) : (
          <ul className="border-t border-hairline">
            {data.completions.map((row) => (
              <li
                className="flex items-center justify-between gap-4 border-b border-hairline-fainter py-4"
                key={row.courseId}
              >
                <span className="min-w-0 flex-1 truncate text-base text-ink-muted">
                  {row.courseTitle}
                </span>
                <span className="shrink-0 text-sm text-muted-light">
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
