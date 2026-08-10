import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { ChartFrame } from "@/components/charts/chart-frame";
import { SeriesBarChart } from "@/components/charts/bar-chart";
import { SeriesLineChart } from "@/components/charts/line-chart";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CourseAnalyticsDetail } from "@/lib/api/analytics";
import { useAccessGuard } from "@/hooks/use-access-guard";
import { getCourseAnalytics } from "@/lib/api/analytics";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/courses/$id/analytics")({
  head: () =>
    seo({
      description: "Enrolments, completion, and revenue for this course.",
      path: "/dashboard/courses",
      title: "Course Analytics"
    }),
  component: CourseAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

function CourseAnalyticsPage(): JSX.Element {
  const t = useT();

  const { id } = Route.useParams();
  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const role = session?.session.role;
  const canView = role === "ADMIN" || role === "ACCOUNTANT" || role === "TEACHER";
  const { data = null, error, isPending: isLoading } = useQuery<CourseAnalyticsDetail>({
    enabled: !isPending && canView,
    queryFn: async () => getCourseAnalytics(id),
    queryKey: queryKeys.analytics.course(id)
  });

  useAccessGuard([error]);

  useEffect(() => {
    if (isPending || !session) {
      return;
    }

    if (!canView) {
      void router.navigate({ to: "/dashboard" });
    }
  }, [canView, isPending, router, session]);

  const enrollmentSeries = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data.enrollmentTrend].reverse().map((point) => ({
      label: point.period,
      value: point.value
    }));
  }, [data]);

  if (isPending || !canView) {
    return <DataTableSkeleton columns={2} rows={4} />;
  }

  if (isLoading && !data) {
    return <DataTableSkeleton columns={2} rows={4} />;
  }

  if (!data) {
    return <p className="text-sm text-ink/68">{t("an.courseLoadFailed")}</p>;
  }

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard/courses" />
      <Card>
        <CardHeader>
          <CardTitle>{t("an.courseTitle")}</CardTitle>
          <CardDescription>
            {data.totalEnrollments} enrollments · {data.completedEnrollments} completed ·{" "}
            {data.completionRate}% completion · {data.reviewCount} reviews · average rating{" "}
            {data.averageRating.toFixed(2)} · revenue {data.revenueTotal.toFixed(2)} BDT
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFrame height={280} title={t("an.enrollmentTrend")}>
          <SeriesLineChart ariaLabel={t("an.enrollmentTrend")} data={enrollmentSeries} height={280} />
        </ChartFrame>

        <ChartFrame height={280} subtitle={t("an.completionShare")} title={t("an.completion")}>
          <SeriesBarChart
            ariaLabel={t("an.completion")}
            data={[
              { label: "Completed", value: data.completedEnrollments },
              { label: "In progress", value: Math.max(0, data.totalEnrollments - data.completedEnrollments) }
            ]}
            height={280}
          />
        </ChartFrame>
      </div>
    </div>
  );
}
