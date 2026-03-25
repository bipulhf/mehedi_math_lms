import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { TeacherAnalyticsOverview } from "@/lib/api/analytics";
import { getTeacherAnalyticsOverview } from "@/lib/api/analytics";
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

export const Route = createFileRoute("/dashboard/analytics" as never)({
  component: TeacherAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

const chartStroke = "#6061ee";

function TeacherAnalyticsPage(): JSX.Element {
  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const [data, setData] = useState<TeacherAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPending || session?.session.role !== "TEACHER") {
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const overview = await getTeacherAnalyticsOverview();
        setData(overview);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isPending, session?.session.role]);

  useEffect(() => {
    if (isPending || !session) {
      return;
    }

    if (session.session.role !== "TEACHER") {
      void router.navigate({ to: "/dashboard" });
    }
  }, [isPending, router, session]);

  const enrollmentSeries = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data.enrollmentTrend].reverse().map((point) => ({
      label: point.period,
      value: point.value
    }));
  }, [data]);

  const revenueSeries = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data.revenueTrend].reverse().map((point) => ({
      label: point.period,
      value: point.value
    }));
  }, [data]);

  if (isPending || session?.session.role !== "TEACHER") {
    return <DataTableSkeleton columns={2} rows={4} />;
  }

  if (isLoading && !data) {
    return <DataTableSkeleton columns={2} rows={4} />;
  }

  if (!data) {
    return <p className="text-sm text-on-surface/68">Unable to load analytics.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teaching analytics</CardTitle>
          <CardDescription>
            Courses you create or co-teach — {data.courseCount} courses, {data.lectureCount} lectures,{" "}
            {data.totalEnrollments} enrollments.
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
            <CardTitle className="text-lg">Revenue trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} width={52} />
                <Tooltip />
                <Bar dataKey="value" fill={chartStroke} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per-course completion</CardTitle>
          <CardDescription>Open deep analytics for any course you manage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.completions.length === 0 ? (
            <p className="text-sm text-on-surface/62">No courses assigned yet.</p>
          ) : (
            data.completions.map((row) => (
              <div
                key={row.courseId}
                className="flex flex-col gap-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-on-surface">{row.courseTitle}</p>
                  <p className="text-sm text-on-surface/62">
                    {row.completedCount}/{row.enrollmentCount} completed · {row.completionRate}%
                  </p>
                  <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className="h-full rounded-full bg-secondary-container transition-all"
                      style={{ width: `${Math.min(100, row.completionRate)}%` }}
                    />
                  </div>
                </div>
                <Link
                  className="inline-flex shrink-0 items-center justify-center rounded-md bg-secondary-container px-4 py-2 text-sm font-semibold text-on-secondary-container transition hover:opacity-90"
                  to="/dashboard/courses/$id/analytics"
                  params={{ id: row.courseId }}
                >
                  Course analytics
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
