import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AccountantAnalyticsOverview } from "@/lib/api/analytics";
import { getAccountantAnalyticsOverview } from "@/lib/api/analytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export const Route = createFileRoute("/dashboard/accountant/analytics" as never)({
  component: AccountantAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

const chartStroke = "#6061ee";

function AccountantAnalyticsPage(): JSX.Element {
  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const [data, setData] = useState<AccountantAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const allowed = session?.session.role === "ACCOUNTANT" || session?.session.role === "ADMIN";

  useEffect(() => {
    if (isPending || !allowed) {
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const overview = await getAccountantAnalyticsOverview();
        setData(overview);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [allowed, isPending, session?.session.role]);

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
    return <p className="text-sm text-on-surface/68">Unable to load financial analytics.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial overview</CardTitle>
          <CardDescription>
            Successful revenue, refunds, and gateway status distribution across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface/54">Total revenue</p>
            <p className="mt-1 text-2xl font-semibold text-on-surface">{data.totalRevenue.toFixed(2)} BDT</p>
          </div>
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface/54">Refunded</p>
            <p className="mt-1 text-2xl font-semibold text-on-surface">
              {data.totalRefunded.toFixed(2)} BDT ({data.refundedCount} txns)
            </p>
          </div>
          <Link
            className="inline-flex items-center self-center rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
            to="/dashboard/payments"
          >
            Payment operations
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by course</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            {data.revenueByCourse.length === 0 ? (
              <p className="text-sm text-on-surface/62">No revenue allocated yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.revenueByCourse.map((r) => ({
                    label: r.courseTitle.slice(0, 24),
                    value: r.revenue
                  }))}
                  layout="vertical"
                  margin={{ bottom: 8, left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                  <XAxis fontSize={11} type="number" />
                  <YAxis dataKey="label" fontSize={10} type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill={chartStroke} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment status mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            {statusChart.length === 0 ? (
              <p className="text-sm text-on-surface/62">No payments recorded.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChart} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                  <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} width={40} />
                  <Tooltip />
                  <Bar dataKey="value" fill={chartStroke} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
