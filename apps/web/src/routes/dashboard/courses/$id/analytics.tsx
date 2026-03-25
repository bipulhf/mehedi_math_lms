import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CourseAnalyticsDetail } from "@/lib/api/analytics";
import { getCourseAnalytics } from "@/lib/api/analytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export const Route = createFileRoute("/dashboard/courses/$id/analytics" as never)({
  component: CourseAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

const chartStroke = "#6061ee";

function CourseAnalyticsPage(): JSX.Element {
  const { id } = Route.useParams();
  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const [data, setData] = useState<CourseAnalyticsDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const role = session?.session.role;
  const canView = role === "ADMIN" || role === "ACCOUNTANT" || role === "TEACHER";

  useEffect(() => {
    if (isPending || !canView) {
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const detail = await getCourseAnalytics(id);
        setData(detail);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [canView, id, isPending]);

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
    return <p className="text-sm text-on-surface/68">Unable to load course analytics.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course analytics</CardTitle>
          <CardDescription>
            {data.totalEnrollments} enrollments · {data.completedEnrollments} completed ·{" "}
            {data.completionRate}% completion · {data.reviewCount} reviews · average rating{" "}
            {data.averageRating.toFixed(2)} · revenue {data.revenueTotal.toFixed(2)} BDT
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enrollment trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} width={40} />
                <Tooltip />
                <Line dataKey="value" dot={false} stroke={chartStroke} strokeWidth={2} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completion</CardTitle>
            <CardDescription>Share of learners who reached the completion milestone.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { label: "Completed", value: data.completedEnrollments },
                  { label: "In progress", value: Math.max(0, data.totalEnrollments - data.completedEnrollments) }
                ]}
                margin={{ bottom: 8, left: 0, right: 8, top: 8 }}
              >
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} width={40} />
                <Tooltip />
                <Bar dataKey="value" fill={chartStroke} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
