import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { ChartSkeleton, StatsGridSkeleton } from "@/components/common/skeletons";
import { Badge } from "@/components/ui/badge";
import { ProgressTrack } from "@/components/ui/progress-track";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminAnalyticsOverview } from "@/lib/api/analytics";
import { getAdminAnalyticsOverview } from "@/lib/api/analytics";
import { chartTheme } from "@/lib/chart-theme";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";
import { TrendingUp, DollarSign, Target, PieChart, Activity } from "lucide-react";
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

export const Route = createFileRoute("/dashboard/admin/analytics")({
  component: AdminAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

const chartStroke = chartTheme.accent;

function AdminAnalyticsPage(): JSX.Element {
  const t = useT();

  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const isAdmin = !isPending && session?.session.role === "ADMIN";
  const { data = null, isPending: isLoading } = useQuery<AdminAnalyticsOverview>({
    enabled: isAdmin,
    queryFn: async () => getAdminAnalyticsOverview(),
    queryKey: queryKeys.analytics.admin()
  });

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

  if (isPending || session?.session.role !== "ADMIN" || (isLoading && !data)) {
    return (
      <div className="space-y-8">
        <StatsGridSkeleton />
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-ink/68">{t("an.loadFailed")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center border border-hairline bg-panel-warm text-ink">
            <Activity className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">{t("an.adminTitle")}</h1>
            <p className="mt-0.5 text-sm font-light text-muted">
              Macroscopic insights into the academic ecosystem — monitoring enrollment velocity, fiscal trends, and demographic cohorts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="border border-hairline bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center border border-hairline bg-panel-warm text-ink">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-ink">{t("an.enrollmentTrend")}</h2>
              <p className="text-xs text-muted-faint uppercase font-semibold">{t("an.monthlyTrend")}</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <defs>
                   <linearGradient id="enrollSmooth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartStroke} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartStroke} stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <YAxis fontSize={10} width={40} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px' }}
                />
                <Line dataKey="value" dot={{ r: 3, fill: chartStroke, strokeWidth: 1.5, stroke: '#fff' }} stroke={chartStroke} strokeWidth={2} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-hairline bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center border border-hairline bg-panel-warm text-ink">
              <DollarSign className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-ink">{t("an.revenue")}</h2>
              <p className="text-xs text-muted-faint uppercase font-semibold">{t("an.monthlyTotals")}</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <YAxis fontSize={10} width={48} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <Tooltip 
                   cursor={{fill: 'rgba(0,0,0,0.02)'}}
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px' }}
                />
                <Bar dataKey="value" fill={chartStroke} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="border border-hairline bg-card">
        <div className="p-6 border-b border-hairline flex items-center gap-3">
          <div className="flex size-8 items-center justify-center border border-hairline bg-panel-warm text-ink">
            <Target className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-medium text-ink">{t("an.completion")}</h2>
            <p className="text-xs text-muted font-light">{t("an.completionLead")}</p>
          </div>
        </div>
        <div className="p-6 grid gap-4 md:grid-cols-2">
          {data.completions.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs italic text-muted-faint">{t("an.noCompletion")}</div>
          ) : (
            data.completions.map((row) => (
              <div
                key={row.courseId}
                className="p-4 border border-hairline bg-panel-warm/30 hover:border-hairline/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-medium text-ink truncate">{row.courseTitle}</span>
                  <Badge tone="neutral">
                    {row.completionRate}% Done
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs text-muted-faint">{t("an.completionRatio")}</p>
                   <p className="text-xs font-semibold text-ink">{row.completedCount} / {row.enrollmentCount} Scholars</p>
                </div>
                <ProgressTrack
                  completed={Math.min(100, row.completionRate)}
                  label={`${row.courseTitle} completion rate`}
                  total={100}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border border-hairline bg-card">
        <div className="p-6 border-b border-hairline flex items-center gap-3">
          <div className="flex size-8 items-center justify-center border border-hairline bg-panel-warm text-ink">
            <PieChart className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-medium text-ink">{t("an.distribution")}</h2>
            <p className="text-xs text-muted font-light">{t("an.distributionLead")}</p>
          </div>
        </div>
        <div className="p-6 h-80">
          {data.demographics.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs italic text-muted-faint">{t("an.noDistribution")}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.demographics.map((d) => ({ label: d.label, value: d.count }))}
                layout="vertical"
                margin={{ bottom: 8, left: 60, right: 24, top: 8 }}
              >
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} opacity={0.5} />
                <XAxis fontSize={10} type="number" axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <YAxis dataKey="label" fontSize={10} type="category" width={60} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.8}} />
                <Tooltip 
                   cursor={{fill: 'rgba(0,0,0,0.02)'}}
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px' }}
                />
                <Bar dataKey="value" fill={chartStroke} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
