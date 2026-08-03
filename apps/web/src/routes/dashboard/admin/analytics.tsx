import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { ChartSkeleton, StatsGridSkeleton } from "@/components/common/skeletons";
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
    <div className="space-y-8">
      <div className="bg-card/80 p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center bg-ink/10 border border-ink/20 text-ink relative overflow-hidden group/icon">
             <div className="absolute inset-0 bg-ink/5" />
             <Activity className="size-8 relative z-10" />
          </div>
          <div className="space-y-2">
            <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("an.adminTitle")}</h3>
            <p className="text-sm text-muted font-light max-w-2xl leading-relaxed italic">
              Macroscopic insights into the academic ecosystem — monitoring enrollment velocity, fiscal trends, and demographic cohorts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="bg-card/80 p-8 border border-hairline/40 group/card">
          <div className="flex items-center gap-4 mb-8">
            <div className="size-10 bg-ink/10 flex items-center justify-center text-ink border border-ink/10">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <h4 className="font-body font-medium text-ink text-lg">{t("an.enrollmentTrend")}</h4>
              <p className="text-xs text-ink/40 uppercase tracking-widest font-bold">{t("an.monthlyTrend")}</p>
            </div>
          </div>
          <div className="h-75 w-full">
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
                   contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Line dataKey="value" dot={{ r: 4, fill: chartStroke, strokeWidth: 2, stroke: '#fff' }} stroke={chartStroke} strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card/80 p-8 border border-hairline/40 group/card">
          <div className="flex items-center gap-4 mb-8">
            <div className="size-10 bg-green-500/10 flex items-center justify-center text-green-600 border border-green-500/10">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h4 className="font-body font-medium text-ink text-lg">{t("an.revenue")}</h4>
              <p className="text-xs text-ink/40 uppercase tracking-widest font-bold">{t("an.monthlyTotals")}</p>
            </div>
          </div>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <YAxis fontSize={10} width={52} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <Tooltip 
                   cursor={{fill: 'rgba(0,0,0,0.02)'}}
                   contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" fill={chartStroke} radius={[10, 10, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card/80 border border-hairline/40 overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-hairline/30 flex items-center gap-4">
          <div className="size-10 bg-accent/10 flex items-center justify-center text-accent border border-accent/10">
            <Target className="size-5" />
          </div>
          <div>
            <h4 className="font-body font-medium text-ink text-xl">{t("an.completion")}</h4>
            <p className="text-sm text-muted font-light opacity-60">{t("an.completionLead")}</p>
          </div>
        </div>
        <div className="p-8 sm:p-10 grid gap-6 md:grid-cols-2">
          {data.completions.length === 0 ? (
            <div className="col-span-full py-12 text-center opacity-40 font-light italic font-body">{t("an.noCompletion")}</div>
          ) : (
            data.completions.map((row) => (
              <div
                key={row.courseId}
                className="group p-6 bg-panel-warm/30 border border-hairline/20 hover:border-ink/30 transition-all hover:bg-ink/2"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="font-body text-base font-medium text-ink tracking-tight group-hover:text-ink transition-colors">{row.courseTitle}</span>
                  <span className="text-[0.65rem] font-bold text-ink bg-ink/5 px-3 py-1 rounded-full border border-ink/10">
                    {row.completionRate}% Done
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs text-muted font-light opacity-60 italic">{t("an.completionRatio")}</p>
                   <p className="text-xs font-bold text-ink tracking-widest">{row.completedCount} / {row.enrollmentCount} Scholars</p>
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

      <div className="bg-card/80 border border-hairline/40 overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-hairline/30 flex items-center gap-4">
          <div className="size-10 bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/10">
            <PieChart className="size-5" />
          </div>
          <div>
            <h4 className="font-body font-medium text-ink text-xl">{t("an.distribution")}</h4>
            <p className="text-sm text-muted font-light opacity-60">{t("an.distributionLead")}</p>
          </div>
        </div>
        <div className="p-8 sm:p-10 h-100">
          {data.demographics.length === 0 ? (
            <div className="h-full flex items-center justify-center opacity-40 font-light italic font-body">{t("an.noDistribution")}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.demographics.map((d) => ({ label: d.label, value: d.count }))}
                layout="vertical"
                margin={{ bottom: 8, left: 80, right: 32, top: 8 }}
              >
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} opacity={0.5} />
                <XAxis fontSize={10} type="number" axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.4}} />
                <YAxis dataKey="label" fontSize={10} type="category" width={80} axisLine={false} tickLine={false} tick={{fill: 'currentColor', opacity: 0.8, fontWeight: 'bold'}} />
                <Tooltip 
                   cursor={{fill: 'rgba(0,0,0,0.02)'}}
                   contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" fill={chartStroke} radius={[0, 10, 10, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
