import { useQuery } from "@tanstack/react-query";
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

import { RecentActivitySkeleton, StatsGridSkeleton } from "@/components/common/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminDashboardStats } from "@/lib/api/admin";
import { getAdminDashboardStats } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomePage,
  errorComponent: RouteErrorView
});

function DashboardCard({
  children,
  title,
  description,
  className = "p-6 sm:p-8 bg-card"
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`border border-hairline relative w-full overflow-hidden ${className}`}
    >
      <div className="mb-8">
        <h3 className="font-body text-2xl font-medium tracking-tight text-on-surface">
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
      <div className="bg-surface-container-lowest/80 p-6 border border-outline-variant/30 relative overflow-hidden group h-full">
        <div className="space-y-4">
          <div className="inline-flex size-12 items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 text-primary border border-primary/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent pointer-events-none"></div>
            <Icon className="size-5 relative z-10" />
          </div>
          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface/54">
              {label}
            </p>
            <h4 className="mt-2 text-3xl font-body font-medium">{value}</h4>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

function DashboardHomePage(): JSX.Element {
  const { isPending: isSessionPending, session } = useAuthSession();
  const { data: stats = null, isFetching: isLoadingStats } = useQuery<AdminDashboardStats>({
    enabled: !isSessionPending && session?.session.role === "ADMIN",
    queryFn: async () => getAdminDashboardStats(),
    queryKey: queryKeys.admin.dashboard()
  });

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
          <StatsGridSkeleton />
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-surface-container-lowest/80 p-8 sm:p-10 border border-outline-variant/40 relative w-full overflow-hidden">
              <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
              <Skeleton className="h-4 w-full max-w-sm mb-8 bg-surface-container-highest" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-36 bg-surface-container-highest" />
                <Skeleton className="h-36 bg-surface-container-highest" />
                <Skeleton className="h-36 bg-surface-container-highest" />
              </div>
            </div>
            <RecentActivitySkeleton rows={2} />
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
                className="group/link bg-surface-container-lowest/50 p-6 transition-all ease-out hover:bg-surface-container-high border border-outline-variant/20"
              >
                <p className="font-body font-semibold text-lg text-on-surface group-hover/link:text-primary transition-colors">
                  User management
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant font-light">
                  Search users, toggle access, create staff accounts, and inspect activity history.
                </p>
              </Link>
              <Link
                to="/dashboard/admin/bugs"
                className="group/link bg-surface-container-lowest/50 p-6 transition-all ease-out hover:bg-surface-container-high border border-outline-variant/20"
              >
                <p className="font-body font-semibold text-lg text-on-surface group-hover/link:text-primary transition-colors">
                  Bug triage
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant font-light">
                  Review incoming bugs, assign priority, and move issues through resolution states.
                </p>
              </Link>
              <Link
                to="/dashboard/admin/analytics"
                className="group/link bg-surface-container-lowest/50 p-6 transition-all ease-out hover:bg-surface-container-high border border-outline-variant/20"
              >
                <p className="font-body font-semibold text-lg text-on-surface group-hover/link:text-primary transition-colors">
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
              <div className="bg-surface-container-lowest/50 p-5 border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-on-surface">
                    Pending course approvals
                  </span>
                  <Badge tone="violet" className="px-3 py-1 font-bold">
                    {stats?.pendingCourseApprovals ?? 0}
                  </Badge>
                </div>
              </div>
              <div className="bg-surface-container-lowest/50 p-5 border border-outline-variant/20">
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
              <div className="bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
                Review every enrollment payment, filter by gateway status, and issue refunds from
                the same surface.
              </div>
              <div className="flex flex-wrap gap-4">
                <Button asChild className="h-12 px-6 font-body font-semibold">
                  <Link to="/dashboard/payments">Open payment operations</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-6 font-body font-semibold"
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
              <div className="bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
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
                <Button asChild className="h-12 px-6 font-body font-semibold">
                  <Link to="/dashboard/my-courses">My courses</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-6 font-body font-semibold"
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
              <div className="bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
                If an enrollment or payment does not settle correctly, submit a bug report with the
                transaction context.
              </div>
              <Button
                asChild
                variant="outline"
                className="h-12 px-6 font-body font-semibold"
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
            <div className="bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
              Report broken lectures, upload failures, playback issues, missing content, or
              unexpected grading behavior directly from the workspace.
            </div>
            {(session?.session.role === "STUDENT" || session?.session.role === "TEACHER") &&
            !isSessionPending ? (
              <div className="flex flex-wrap gap-4">
                <Button asChild className="h-12 px-6 font-body font-semibold">
                  <Link to="/dashboard/bugs/report">Report a bug</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-6 font-body font-semibold"
                >
                  <Link to="/dashboard/bugs">My bug reports</Link>
                </Button>
              </div>
            ) : (
              <div className="bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
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
            <div className="bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
              Profile completion, admin account governance, and bug intake are now first-class
              dashboard flows.
            </div>
            <div className="bg-surface-container-lowest/50 p-6 border border-outline-variant/20 text-sm leading-7 text-on-surface-variant font-light">
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
