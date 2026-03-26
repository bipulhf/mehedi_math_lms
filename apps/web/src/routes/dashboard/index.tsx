import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CircleHelp,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminDashboardStats } from "@/lib/api/admin";
import { getAdminDashboardStats } from "@/lib/api/admin";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomePage,
  errorComponent: RouteErrorView
});

function DashboardCard({
  children,
  title,
  description,
  className = "p-8 sm:p-10 rounded-4xl bg-surface-container-lowest/80"
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`backdrop-blur-3xl border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group ${className}`}
    >
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
      <div className="mb-8">
        <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
          {title}
        </h3>
        {description && (
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function DashboardMetric({
  icon: Icon,
  label,
  value,
  index
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  index: number;
}): JSX.Element {
  return (
    <FadeIn delayClassName={index > 0 ? "delay-75" : undefined}>
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-3xl p-6 border border-outline-variant/30 shadow-lg relative overflow-hidden group h-full">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-secondary/10 transition-colors z-[-1]"></div>
        <div className="space-y-4">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-primary shadow-inner border border-primary/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent pointer-events-none"></div>
            <Icon className="size-5 relative z-10" />
          </div>
          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface/54">
              {label}
            </p>
            <h4 className="mt-2 text-3xl font-headline font-extrabold">{value}</h4>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

function DashboardHomePage(): JSX.Element {
  const { isPending: isSessionPending, session } = useAuthSession();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (isSessionPending || session?.session.role !== "ADMIN") {
      return;
    }

    void (async () => {
      setIsLoadingStats(true);

      try {
        const nextStats = await getAdminDashboardStats();
        setStats(nextStats);
      } catch {
        toast.error("Couldn't load dashboard stats. Please retry.");
      } finally {
        setIsLoadingStats(false);
      }
    })();
  }, [isSessionPending, session]);

  if (session?.session.role === "ADMIN") {
    const metrics = [
      {
        icon: UsersRound,
        label: "Students",
        value: stats?.totalStudents ?? 0
      },
      {
        icon: BookOpenCheck,
        label: "Active courses",
        value: stats?.activeCourses ?? 0
      },
      {
        icon: BarChart3,
        label: "Revenue",
        value: `${stats?.revenue ?? 0} BDT`
      },
      {
        icon: AlertTriangle,
        label: "Open bugs",
        value: stats?.openBugs ?? 0
      }
    ] as const;

    if (isLoadingStats && !stats) {
      return (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-3xl p-6 border border-outline-variant/30 shadow-lg relative overflow-hidden h-full">
                <div className="space-y-4">
                  <Skeleton className="size-12 rounded-2xl bg-surface-container-highest" />
                  <div>
                    <Skeleton className="h-3 w-16 mb-2 rounded bg-surface-container-highest" />
                    <Skeleton className="h-8 w-24 rounded bg-surface-container-highest" />
                  </div>
                </div>
              </div>
            ))}
          </section>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
              <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
              <Skeleton className="h-4 w-full max-w-sm mb-8 bg-surface-container-highest" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-36 rounded-4xl bg-surface-container-highest" />
                <Skeleton className="h-36 rounded-4xl bg-surface-container-highest" />
                <Skeleton className="h-36 rounded-4xl bg-surface-container-highest" />
              </div>
            </div>
            <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
              <Skeleton className="h-8 w-40 mb-4 bg-surface-container-highest" />
              <Skeleton className="h-4 w-full max-w-xs mb-8 bg-surface-container-highest" />
              <div className="space-y-4">
                <Skeleton className="h-16 rounded-3xl bg-surface-container-highest" />
                <Skeleton className="h-16 rounded-3xl bg-surface-container-highest" />
              </div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <DashboardMetric key={metric.label} {...metric} index={index} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardCard
            title="Operations focus"
            description="Quick access to the highest-signal admin workflows for this phase."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                to="/dashboard/admin/users"
                className="group/link rounded-4xl bg-surface-container-lowest/50 p-6 transition-all duration-300 ease-out hover:bg-surface-container-high border border-outline-variant/20 hover:shadow-md"
              >
                <p className="font-headline font-semibold text-lg text-on-surface group-hover/link:text-primary transition-colors">
                  User management
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant font-light">
                  Search users, toggle access, create staff accounts, and inspect activity history.
                </p>
              </Link>
              <Link
                to="/dashboard/admin/bugs"
                className="group/link rounded-4xl bg-surface-container-lowest/50 p-6 transition-all duration-300 ease-out hover:bg-surface-container-high border border-outline-variant/20 hover:shadow-md"
              >
                <p className="font-headline font-semibold text-lg text-on-surface group-hover/link:text-primary transition-colors">
                  Bug triage
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant font-light">
                  Review incoming bugs, assign priority, and move issues through resolution states.
                </p>
              </Link>
              <Link
                to="/dashboard/admin/analytics"
                className="group/link rounded-4xl bg-surface-container-lowest/50 p-6 transition-all duration-300 ease-out hover:bg-surface-container-high border border-outline-variant/20 hover:shadow-md"
              >
                <p className="font-headline font-semibold text-lg text-on-surface group-hover/link:text-primary transition-colors">
                  Platform analytics
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant font-light">
                  Enrollment trends, revenue, completion, and student demographics across the
                  academy.
                </p>
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Live overview"
            description="High-level queue pressure before deeper analytics and reporting land."
          >
            <div className="space-y-4">
              <div className="rounded-3xl bg-surface-container-lowest/50 p-5 border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-on-surface">
                    Pending course approvals
                  </span>
                  <Badge tone="violet" className="px-3 py-1 font-bold">
                    {stats?.pendingCourseApprovals ?? 0}
                  </Badge>
                </div>
              </div>
              <div className="rounded-3xl bg-surface-container-lowest/50 p-5 border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-on-surface">Total enrollments</span>
                  <Badge tone="blue" className="px-3 py-1 font-bold">
                    {stats?.totalEnrollments ?? 0}
                  </Badge>
                </div>
              </div>
            </div>
          </DashboardCard>
        </section>
      </div>
    );
  }

  if (session?.session.role === "ACCOUNTANT") {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardCard
            title="Accounting cockpit"
            description="Payment operations are now centralized for transaction review, refund handling, and revenue monitoring."
          >
            <div className="space-y-6">
              <div className="rounded-4xl bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
                Review every enrollment payment, filter by gateway status, and issue refunds from
                the same surface.
              </div>
              <div className="flex flex-wrap gap-4">
                <Button asChild className="h-12 rounded-2xl px-6 font-headline font-semibold">
                  <Link to="/dashboard/payments">Open payment operations</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl px-6 font-headline font-semibold"
                >
                  <Link to="/dashboard/accountant/analytics">Financial analytics</Link>
                </Button>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Phase checkpoint"
            description="Enrollment and payment flows are now ready for accountant oversight."
          >
            <div className="space-y-4">
              <div className="rounded-4xl bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
                Paid courses can initialize SSLCommerz sessions, while local development uses a
                built-in mock gateway.
              </div>
            </div>
          </DashboardCard>
        </section>
      </div>
    );
  }

  if (session?.session.role === "STUDENT") {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardCard
            title="Learning hub"
            description="Enrollment, payment history, and course access are now part of the student dashboard."
          >
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Button asChild className="h-12 rounded-2xl px-6 font-headline font-semibold">
                  <Link to="/dashboard/my-courses">My courses</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl px-6 font-headline font-semibold"
                >
                  <Link to="/dashboard/payments">Payment history</Link>
                </Button>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Support channel"
            description="Payment trouble, broken content, or access issues can be reported directly."
          >
            <div className="space-y-6">
              <div className="rounded-4xl bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
                If an enrollment or payment does not settle correctly, submit a bug report with the
                transaction context.
              </div>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-2xl px-6 font-headline font-semibold"
              >
                <Link to="/dashboard/bugs/report">Report an issue</Link>
              </Button>
            </div>
          </DashboardCard>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Support channel"
          description="Bug reporting is now part of the dashboard workflow for students and teachers."
        >
          <div className="space-y-6">
            <div className="rounded-4xl bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
              Report broken lectures, upload failures, playback issues, missing content, or
              unexpected grading behavior directly from the workspace.
            </div>
            {(session?.session.role === "STUDENT" || session?.session.role === "TEACHER") &&
            !isSessionPending ? (
              <div className="flex flex-wrap gap-4">
                <Button asChild className="h-12 rounded-2xl px-6 font-headline font-semibold">
                  <Link to="/dashboard/bugs/report">Report a bug</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl px-6 font-headline font-semibold"
                >
                  <Link to="/dashboard/bugs">My bug reports</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-4xl bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
                Bug submission is enabled for student and teacher roles.
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard
          title="Phase checkpoint"
          description="Current dashboard priorities before course, messaging, and analytics phases expand."
        >
          <div className="space-y-4">
            <div className="rounded-4xl bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
              Profile completion, admin account governance, and bug intake are now first-class
              dashboard flows.
            </div>
            <div className="rounded-4xl bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
              The platform can now lock deactivated accounts and expose admin-safe controls for
              operational triage.
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface/60 px-2 mt-4">
              <CircleHelp className="size-5 shrink-0" />
              <span className="font-light">
                Smooth 150ms transitions remain the default for every admin and support surface.
              </span>
            </div>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
