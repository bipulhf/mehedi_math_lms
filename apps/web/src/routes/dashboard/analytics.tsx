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
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { TeacherAnalyticsOverview } from "@/lib/api/analytics";
import { getTeacherAnalyticsOverview } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";
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

function AnalyticsSkeleton(): JSX.Element {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <Skeleton className="h-48 w-full bg-surface-container-lowest rounded-4xl border border-outline-variant/40" />
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 bg-surface-container-lowest rounded-3xl border border-outline-variant/40" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-100 bg-surface-container-lowest rounded-4xl border border-outline-variant/40" />
        <Skeleton className="h-100 bg-surface-container-lowest rounded-4xl border border-outline-variant/40" />
      </div>
    </div>
  );
}

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
      <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest/40 rounded-4xl border border-dashed border-outline-variant/40">
        <Info className="size-10 text-on-surface/20 mb-4" />
        <p className="text-sm text-on-surface/40 font-medium italic">Unable to load instructional intelligence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Premium Header */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-24 -right-24 size-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-1000 z-[-1]" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3">
             <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                   <BarChart3 className="size-6" />
                </div>
                <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Instructor Intelligence</h3>
             </div>
             <p className="text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed italic">
               Monitor your academic impact, track revenue trajectories, and analyze the engagement depth across your entire digital curriculum.
             </p>
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="px-6 py-4 bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-center min-w-32">
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-on-surface/40 mb-1">Total Impact</span>
                <span className="text-2xl font-display font-black text-primary leading-none">{data.totalEnrollments.toLocaleString()}</span>
                <span className="text-[0.6rem] font-bold text-green-500 flex items-center gap-1 mt-1">
                   <TrendingUp className="size-3" /> Enrollments
                </span>
             </div>
             <div className="px-6 py-4 bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-center min-w-32">
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-on-surface/40 mb-1">Catalog Size</span>
                <span className="text-2xl font-display font-black text-on-surface leading-none">{data.courseCount}</span>
                <span className="text-[0.6rem] font-bold text-on-surface/40 mt-1">Published Courses</span>
             </div>
          </div>
        </div>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
         <StatsCard 
           icon={BookOpen} 
           label="Active Curriculum" 
           value={data.courseCount} 
           description="Total courses managed" 
           color="blue"
         />
         <StatsCard 
           icon={Video} 
           label="Instructional Lectures" 
           value={data.lectureCount} 
           description="Total lessons content" 
           color="violet"
         />
         <StatsCard 
           icon={Users} 
           label="Cohort Reach" 
           value={data.totalEnrollments} 
           description="Cumulative enrollments" 
           color="primary"
         />
         <StatsCard 
           icon={Calendar} 
           label="Latest Registry" 
           value={data.enrollmentTrend[0]?.value || 0} 
           description="Current period growth" 
           color="green"
         />
      </div>

      {/* Visual Analytics */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ChartCard title="Enrollment Momentum" subtitle="Trajectory of student acquisition over time">
           <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <defs>
                   <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6061ee" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6061ee" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
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
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#6061ee' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.5 }}
                />
                <Line 
                  dataKey="value" 
                  dot={{ r: 4, fill: '#6061ee', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6, fill: '#6061ee', strokeWidth: 0 }}
                  stroke="#6061ee" 
                  strokeWidth={3} 
                  type="monotone" 
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Stream" subtitle="Fiscal performance of your academic offerings">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
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
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#6061ee' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.5 }}
                  formatter={(value) => [`${value} BDT`, "Revenue"]}
                />
                <Bar 
                  dataKey="value" 
                  fill="#6061ee" 
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
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden">
         <div className="p-8 border-b border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h4 className="text-xl font-headline font-extrabold text-on-surface mb-1">Curriculum Performance Index</h4>
               <p className="text-[0.7rem] text-on-surface/40 font-bold uppercase tracking-widest leading-none">Granular Engagement Metrics</p>
            </div>
            <Badge tone="gray" className="rounded-full px-4 py-2 text-[0.6rem] font-black bg-surface-container-low border border-outline-variant/20">
               {data.completions.length} CURRICULA ANALYZED
            </Badge>
         </div>

         <div className="p-4 sm:p-8 space-y-4">
            {data.completions.length === 0 ? (
               <div className="py-12 text-center">
                  <p className="text-sm text-on-surface/40 italic">No instructional data available for assigned courses.</p>
               </div>
            ) : (
               <div className="grid gap-4">
                  {data.completions.map((row) => (
                    <FadeIn key={row.courseId} className="group overflow-hidden">
                       <div className="flex flex-col lg:flex-row lg:items-center gap-6 p-6 rounded-3xl border border-outline-variant/20 bg-surface-container-low/30 hover:bg-surface-container-low hover:border-primary/20 transition-all duration-300 relative shadow-sm hover:shadow-xl">
                          <div className="flex-1 space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                   <BookOpen className="size-5" />
                                </div>
                                <div>
                                   <p className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">{row.courseTitle}</p>
                                   <div className="flex items-center gap-4 mt-1">
                                      <span className="text-[0.65rem] font-bold text-on-surface/40 flex items-center gap-1">
                                         <Users className="size-3" /> {row.enrollmentCount} Registered
                                      </span>
                                      <span className="text-[0.65rem] font-bold text-on-surface/40 flex items-center gap-1">
                                         <Target className="size-3" /> {row.completedCount} Graduated
                                      </span>
                                   </div>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                   <span className="text-[0.6rem] font-bold uppercase tracking-widest text-on-surface/40">Engagement Depth</span>
                                   <span className="text-sm font-display font-black text-secondary">{row.completionRate}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                                   <div 
                                     className="h-full bg-linear-to-r from-primary to-secondary transition-all duration-1000" 
                                     style={{ width: `${Math.min(100, row.completionRate)}%` }}
                                   />
                                </div>
                             </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-3">
                             <Button asChild variant="outline" className="h-11 rounded-2xl border-outline-variant/30 px-6 font-bold text-[0.65rem] uppercase tracking-widest transition-all hover:bg-primary hover:text-white hover:border-primary">
                                <Link to="/dashboard/courses/$id/analytics" params={{ id: row.courseId }} className="flex items-center gap-2">
                                   Intelligence Hub
                                   <ArrowUpRight className="size-3.5" />
                                </Link>
                             </Button>
                          </div>
                       </div>
                    </FadeIn>
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
    primary: "bg-primary/5 text-primary border-primary/10",
    blue: "bg-blue-500/5 text-blue-500 border-blue-500/10",
    violet: "bg-violet-500/5 text-violet-500 border-violet-500/10",
    green: "bg-green-500/5 text-green-500 border-green-500/10"
  };

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-xl p-6 rounded-4xl border border-outline-variant/40 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group">
       <div className={cn("size-12 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110", colorStyles[color])}>
          <Icon className="size-6" />
       </div>
       <div className="space-y-1">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-on-surface/40">{label}</p>
          <p className="text-3xl font-display font-black text-on-surface leading-none">{value.toLocaleString()}</p>
          <p className="text-[0.65rem] text-on-surface/40 font-medium italic mt-2">{description}</p>
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
    <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-sm flex flex-col h-120">
       <div className="mb-8">
          <h4 className="text-xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">{title}</h4>
          <p className="text-[0.65rem] font-bold text-on-surface/30 uppercase tracking-widest">{subtitle}</p>
       </div>
       <div className="flex-1 min-h-0">
          {children}
       </div>
    </div>
  );
}
