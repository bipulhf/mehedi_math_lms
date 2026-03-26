import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminAnalyticsOverview } from "@/lib/api/analytics";
import { getAdminAnalyticsOverview } from "@/lib/api/analytics";
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

  if (isPending || session?.session.role !== "ADMIN" || (isLoading && !data)) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
           <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest mb-8" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
           <Skeleton className="h-[400px] w-full bg-surface-container-highest rounded-4xl" />
           <Skeleton className="h-[400px] w-full bg-surface-container-highest rounded-4xl" />
        </div>
        <Skeleton className="h-[300px] w-full bg-surface-container-highest rounded-4xl" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-on-surface/68">Unable to load analytics.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        <div className="flex items-center gap-6">
          <div className="flex w-16 h-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-sm relative overflow-hidden group/icon">
            <Activity className="size-8 relative z-10 animate-pulse" />
          </div>
          <div>
            <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Academic Analytics</h3>
            <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
              Real-time intelligence on enrollment velocity, fiscal performance, and scholarly engagement across the platform.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl group/card">
          <div className="flex items-center gap-4 mb-8">
            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <h4 className="font-headline font-extrabold text-on-surface text-lg">Enrollment velocity</h4>
              <p className="text-xs text-on-surface/40 uppercase tracking-widest font-bold">Monthly Trend</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <defs>
                   <linearGradient id="enrollSmooth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartStroke} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartStroke} stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" vertical={false} opacity={0.5} />
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

        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl group/card">
          <div className="flex items-center gap-4 mb-8">
            <div className="size-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 border border-green-500/10">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h4 className="font-headline font-extrabold text-on-surface text-lg">Revenue stream</h4>
              <p className="text-xs text-on-surface/40 uppercase tracking-widest font-bold">Monthly totals</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" vertical={false} opacity={0.5} />
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

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-outline-variant/30 flex items-center gap-4">
          <div className="size-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/10">
            <Target className="size-5" />
          </div>
          <div>
            <h4 className="font-headline font-extrabold text-on-surface text-xl">Scholarly completion</h4>
            <p className="text-sm text-on-surface-variant font-light opacity-60">Success signals from most engaging academic modules.</p>
          </div>
        </div>
        <div className="p-8 sm:p-10 grid gap-6 md:grid-cols-2">
          {data.completions.length === 0 ? (
            <div className="col-span-full py-12 text-center opacity-40 font-light italic italic font-headline">No completion signals detected yet.</div>
          ) : (
            data.completions.map((row) => (
              <div
                key={row.courseId}
                className="group p-6 rounded-3xl bg-surface-container-low/30 border border-outline-variant/20 hover:border-primary/30 transition-all hover:bg-primary/[0.01]"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="font-headline text-base font-extrabold text-on-surface tracking-tight group-hover:text-primary transition-colors">{row.courseTitle}</span>
                  <span className="text-[0.65rem] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                    {row.completionRate}% Done
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs text-on-surface-variant font-light opacity-60 italic">Completion Ratio</p>
                   <p className="text-xs font-bold text-on-surface tracking-widest">{row.completedCount} / {row.enrollmentCount} Scholars</p>
                </div>
                <div className="h-2 w-full bg-surface-container-highest/50 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-linear-to-r from-primary to-secondary transition-all duration-1000 ease-out"
                     style={{ width: `${Math.min(100, row.completionRate)}%` }}
                   />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-outline-variant/30 flex items-center gap-4">
          <div className="size-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/10">
            <PieChart className="size-5" />
          </div>
          <div>
            <h4 className="font-headline font-extrabold text-on-surface text-xl">Student distribution</h4>
            <p className="text-sm text-on-surface-variant font-light opacity-60">Demographic cohorts organized by academic grade.</p>
          </div>
        </div>
        <div className="p-8 sm:p-10 h-[400px]">
          {data.demographics.length === 0 ? (
            <div className="h-full flex items-center justify-center opacity-40 font-light italic font-headline">No demographic data in the repository.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.demographics.map((d) => ({ label: d.label, value: d.count }))}
                layout="vertical"
                margin={{ bottom: 8, left: 80, right: 32, top: 8 }}
              >
                <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" horizontal={false} opacity={0.5} />
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
