import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Video, 
  Calendar,
  Info,
  ArrowUpRight,
  Target
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useEffect, useMemo } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressTrack } from "@/components/ui/progress-track";
import { ChartSkeleton, StatsGridSkeleton } from "@/components/common/skeletons";
import { useAuthSession } from "@/hooks/use-auth-session";
import { chartTheme } from "@/lib/chart-theme";
import type { TeacherAnalyticsOverview } from "@/lib/api/analytics";
import { getTeacherAnalyticsOverview } from "@/lib/api/analytics";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";
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

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () =>
    seo({
      description: "Performance metrics and course engagement insights.",
      path: "/dashboard/analytics",
      title: "Teacher Analytics"
    }),
  component: TeacherAnalyticsPage,
  errorComponent: RouteErrorView
} as never);

function AnalyticsSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <StatsGridSkeleton cards={3} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}

function TeacherAnalyticsPage(): JSX.Element {
  const t = useT();

  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const { data = null, isPending: isLoading } = useQuery<TeacherAnalyticsOverview>({
    enabled: !isPending && session?.session.role === "TEACHER",
    queryFn: async () => getTeacherAnalyticsOverview(),
    queryKey: queryKeys.analytics.teacher()
  });

  useEffect(() => {
    if (isPending || !session) return;
    if (session.session.role !== "TEACHER") {
      void router.navigate({ to: "/dashboard" });
    }
  }, [isPending, router, session]);

  const enrollmentSeries = useMemo(() => {
    if (!data) return [];
    return [...data.enrollmentTrend].reverse().map((point) => ({
      label: point.period,
      value: point.value
    }));
  }, [data]);

  const revenueSeries = useMemo(() => {
    if (!data) return [];
    return [...data.revenueTrend].reverse().map((point) => ({
      label: point.period,
      value: point.value
    }));
  }, [data]);

  if (isPending || session?.session.role !== "TEACHER" || (isLoading && !data)) {
    return <AnalyticsSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card/40 border border-dashed border-hairline/40">
        <Info className="size-10 text-ink/20 mb-4" />
        <p className="text-sm text-ink/40 font-medium italic">{t("an.loadFailed")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="bg-card/80 p-4 sm:p-6 lg:p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3">
             <div className="flex items-center gap-3 mb-2">
                <div className="size-10 bg-ink/10 flex items-center justify-center text-ink border border-ink/10">
                   <BarChart3 className="size-6" />
                </div>
                <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("an.teacherTitle")}</h3>
             </div>
             <p className="text-sm text-muted font-light max-w-2xl leading-relaxed italic">
               Monitor your academic impact, track revenue trajectories, and analyze the engagement depth across your entire digital curriculum.
             </p>
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="px-6 py-4 bg-panel-warm border border-hairline/10 flex flex-col justify-center min-w-32">
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-ink/40 mb-1">{t("an.totalImpact")}</span>
                <span className="text-2xl font-display font-medium text-ink leading-none">{data.totalEnrollments.toLocaleString()}</span>
                <span className="text-[0.6rem] font-bold text-green-500 flex items-center gap-1 mt-1">
                   <TrendingUp className="size-3" />{t("an.enrollments")}</span>
             </div>
             <div className="px-6 py-4 bg-panel-warm border border-hairline/10 flex flex-col justify-center min-w-32">
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-ink/40 mb-1">{t("an.catalogSize")}</span>
                <span className="text-2xl font-display font-medium text-ink leading-none">{data.courseCount}</span>
                <span className="text-[0.6rem] font-bold text-ink/40 mt-1">{t("an.publishedCourses")}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
         <StatsCard 
           icon={BookOpen} 
           label={t("an.activeCourses")} 
           value={data.courseCount} 
           description={t("an.totalCourses")} 
           color="blue"
         />
         <StatsCard 
           icon={Video} 
           label={t("an.lectures")} 
           value={data.lectureCount} 
           description={t("an.totalLectures")} 
           color="violet"
         />
         <StatsCard 
           icon={Users} 
           label={t("an.reach")} 
           value={data.totalEnrollments} 
           description={t("an.cumulative")} 
           color="primary"
         />
         <StatsCard 
           icon={Calendar} 
           label={t("an.latest")} 
           value={data.enrollmentTrend[0]?.value || 0} 
           description={t("an.growth")} 
           color="green"
         />
      </div>

      {/* Visual Analytics */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ChartCard title={t("an.enrollmentTrend")} subtitle={t("an.enrollmentTrendLead")}>
           <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <defs>
                   <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartTheme.accent} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={chartTheme.accent} stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: chartTheme.accent }}
                  labelStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.5 }}
                />
                <Line 
                  dataKey="value" 
                  dot={{ fill: chartTheme.accent, r: 4, stroke: chartTheme.dotStroke, strokeWidth: 2 }} 
                  activeDot={{ fill: chartTheme.accent, r: 6, strokeWidth: 0 }}
                  stroke={chartTheme.accent} 
                  strokeWidth={3} 
                  type="monotone" 
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("an.revenue")} subtitle={t("an.revenueLead")}>
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  fontSize={10} 
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: chartTheme.accent }}
                  labelStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.5 }}
                  formatter={(value) => [`${value} BDT`, "Revenue"]}
                />
                <Bar 
                  dataKey="value" 
                  fill={chartTheme.accent} 
                  radius={[12, 12, 4, 4]} 
                  opacity={0.8}
                  className="hover:opacity-100 transition-opacity"
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Course Specific Depth */}
      <div className="bg-card/80 border border-hairline/40 overflow-hidden">
         <div className="p-4 sm:p-6 lg:p-8 border-b border-hairline/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h4 className="text-xl font-body font-medium text-ink mb-1">{t("an.coursePerformance")}</h4>
               <p className="text-[0.7rem] text-ink/40 font-bold uppercase tracking-widest leading-none">{t("an.engagement")}</p>
            </div>
            <Badge tone="quiet" className="rounded-full px-4 py-2 text-[0.6rem] font-medium bg-panel-warm border border-hairline/20">
               {data.completions.length} CURRICULA ANALYZED
            </Badge>
         </div>

         <div className="p-4 sm:p-8 space-y-4">
            {data.completions.length === 0 ? (
               <div className="py-12 text-center">
                  <p className="text-sm text-ink/40 italic">{t("an.noTeacherData")}</p>
               </div>
            ) : (
               <div className="grid gap-4">
                  {data.completions.map((row) => (
                    <div>
                       <div className="flex flex-col lg:flex-row lg:items-center gap-6 p-6 border border-hairline/20 bg-panel-warm/30 hover:bg-panel-warm hover:border-ink/20 transition-all relative">
                          <div className="flex-1 space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="size-10 bg-ink/5 flex items-center justify-center text-ink border border-ink/10">
                                   <BookOpen className="size-5" />
                                </div>
                                <div>
                                   <p className="font-body font-bold text-ink group-hover:text-ink transition-colors leading-tight">{row.courseTitle}</p>
                                   <div className="flex items-center gap-4 mt-1">
                                      <span className="text-[0.65rem] font-bold text-ink/40 flex items-center gap-1">
                                         <Users className="size-3" /> {row.enrollmentCount} Registered
                                      </span>
                                      <span className="text-[0.65rem] font-bold text-ink/40 flex items-center gap-1">
                                         <Target className="size-3" /> {row.completedCount} Graduated
                                      </span>
                                   </div>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                   <span className="text-[0.6rem] font-bold uppercase tracking-widest text-ink/40">{t("an.engagementDepth")}</span>
                                   <span className="text-sm font-display font-medium text-accent">{row.completionRate}%</span>
                                </div>
                                <ProgressTrack
                                  completed={Math.min(100, row.completionRate)}
                                  label={`${row.courseTitle} completion rate`}
                                  total={100}
                                />
                             </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-3">
                             <Button asChild variant="outline" className="h-11 border-hairline/30 px-6 font-bold text-[0.65rem] uppercase tracking-widest transition-all hover:bg-ink hover:text-white hover:border-ink">
                                <Link to="/dashboard/courses/$id/analytics" params={{ id: row.courseId }} className="flex items-center gap-2">{t("an.teacherTitle")}<ArrowUpRight className="size-3.5" />
                                </Link>
                             </Button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  description, 
  color 
}: { 
  icon: LucideIcon, 
  label: string, 
  value: number | string, 
  description: string,
  color: 'primary' | 'blue' | 'violet' | 'green'
}): JSX.Element {
  const colorStyles = {
    primary: "bg-ink/5 text-ink border-ink/10",
    blue: "bg-blue-500/5 text-blue-500 border-blue-500/10",
    violet: "bg-violet-500/5 text-violet-500 border-violet-500/10",
    green: "bg-green-500/5 text-green-500 border-green-500/10"
  };

  return (
    <div className="bg-card/80 p-6 border border-hairline/40 hover:border-ink/20 transition-all group">
       <div className={cn("size-12 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110", colorStyles[color])}>
          <Icon className="size-6" />
       </div>
       <div className="space-y-1">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-ink/40">{label}</p>
          <p className="text-3xl font-display font-medium text-ink leading-none">{value.toLocaleString()}</p>
          <p className="text-[0.65rem] text-ink/40 font-medium italic mt-2">{description}</p>
       </div>
    </div>
  );
}

function ChartCard({ 
  title, 
  subtitle, 
  children 
}: { 
  title: string, 
  subtitle: string, 
  children: React.ReactNode 
}): JSX.Element {
  return (
    <div className="bg-card/80 p-4 sm:p-6 lg:p-8 border border-hairline/40 flex flex-col h-120">
       <div className="mb-8">
          <h4 className="text-xl font-body font-medium text-ink tracking-tight leading-tight">{title}</h4>
          <p className="text-[0.65rem] font-bold text-ink/30 uppercase tracking-widest">{subtitle}</p>
       </div>
       <div className="flex-1 min-h-0">
          {children}
       </div>
    </div>
  );
}
