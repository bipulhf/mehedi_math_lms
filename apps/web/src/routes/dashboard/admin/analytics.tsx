import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminAnalyticsOverview } from "@/lib/api/analytics";
import { getAdminAnalyticsOverview } from "@/lib/api/analytics";
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

export const Route = createFileRoute("/dashboard/admin/analytics" as never)({
  component: AdminAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

const chartStroke = "#6061ee";

function AdminAnalyticsPage(): JSX.Element {
  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPending || session?.session.role !== "ADMIN") {
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const overview = await getAdminAnalyticsOverview();
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

    if (session.session.role !== "ADMIN") {
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

  if (isPending || session?.session.role !== "ADMIN") {
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
          <CardTitle>Platform analytics</CardTitle>
          <CardDescription>
            Enrollment velocity, revenue, completion quality, and student grade distribution.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enrollment trend</CardTitle>
            <CardDescription>Monthly new enrollments (latest months on the right).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
            <CardDescription>Successful payment totals by month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
          <CardTitle className="text-lg">Course completion</CardTitle>
          <CardDescription>Published courses with the strongest completion signal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.completions.length === 0 ? (
            <p className="text-sm text-on-surface/62">No completion data yet.</p>
          ) : (
            data.completions.map((row) => (
              <div
                key={row.courseId}
                className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-on-surface">{row.courseTitle}</p>
                  <p className="text-sm text-on-surface/62">
                    {row.completedCount}/{row.enrollmentCount} completed · {row.completionRate}%
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className="h-full rounded-full bg-secondary-container transition-all"
                    style={{ width: `${Math.min(100, row.completionRate)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student demographics</CardTitle>
          <CardDescription>Active students grouped by class or grade from profiles.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {data.demographics.length === 0 ? (
            <p className="text-sm text-on-surface/62">No demographic buckets yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.demographics.map((d) => ({ label: d.label, value: d.count }))}
                layout="vertical"
                margin={{ bottom: 8, left: 72, right: 16, top: 8 }}
              >
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                <XAxis fontSize={11} type="number" />
                <YAxis dataKey="label" fontSize={11} type="category" width={68} />
                <Tooltip />
                <Bar dataKey="value" fill={chartStroke} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
