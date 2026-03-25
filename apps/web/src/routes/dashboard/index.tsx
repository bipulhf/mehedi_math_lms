import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, BarChart3, BookOpenCheck, CircleHelp, UsersRound } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminDashboardStats } from "@/lib/api/admin";
import { getAdminDashboardStats } from "@/lib/api/admin";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomePage,
  errorComponent: RouteErrorView
});

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
      return <DataTableSkeleton columns={4} rows={4} />;
    }

    return (
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;

            return (
              <FadeIn key={metric.label} delayClassName={index > 0 ? "delay-75" : undefined}>
                <Card>
                  <CardHeader className="space-y-4">
                    <div className="inline-flex size-10 items-center justify-center rounded-full bg-surface-container-highest text-secondary-container">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-on-surface/54">
                        {metric.label}
                      </p>
                      <CardTitle className="mt-2 text-3xl">{metric.value}</CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              </FadeIn>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Operations focus</CardTitle>
              <CardDescription>Quick access to the highest-signal admin workflows for this phase.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Link
                to="/dashboard/admin/users"
                className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 transition-all duration-150 ease-out hover:bg-surface-container-highest"
              >
                <p className="font-semibold text-on-surface">User management</p>
                <p className="mt-2 text-sm leading-6 text-on-surface/68">
                  Search users, toggle access, create staff accounts, and inspect activity history.
                </p>
              </Link>
              <Link
                to="/dashboard/admin/bugs"
                className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 transition-all duration-150 ease-out hover:bg-surface-container-highest"
              >
                <p className="font-semibold text-on-surface">Bug triage</p>
                <p className="mt-2 text-sm leading-6 text-on-surface/68">
                  Review incoming bugs, assign priority, and move issues through resolution states.
                </p>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live overview</CardTitle>
              <CardDescription>High-level queue pressure before deeper analytics and reporting land.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface/68">Pending course approvals</span>
                  <Badge tone="violet">{stats?.pendingCourseApprovals ?? 0}</Badge>
                </div>
              </div>
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface/68">Total enrollments</span>
                  <Badge tone="blue">{stats?.totalEnrollments ?? 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  if (session?.session.role === "ACCOUNTANT") {
    return (
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Accounting cockpit</CardTitle>
              <CardDescription>
                Payment operations are now centralized for transaction review, refund handling, and revenue monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                Review every enrollment payment, filter by gateway status, and issue refunds from the same surface.
              </div>
              <Button asChild>
                <Link to="/dashboard/payments">Open payment operations</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phase checkpoint</CardTitle>
              <CardDescription>Enrollment and payment flows are now ready for accountant oversight.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                Paid courses can initialize SSLCommerz sessions, while local development uses a built-in mock gateway.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  if (session?.session.role === "STUDENT") {
    return (
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Learning hub</CardTitle>
              <CardDescription>
                Enrollment, payment history, and course access are now part of the student dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button asChild>
                  <Link to="/dashboard/my-courses">My courses</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard/payments">Payment history</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support channel</CardTitle>
              <CardDescription>Payment trouble, broken content, or access issues can be reported directly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                If an enrollment or payment does not settle correctly, submit a bug report with the transaction context.
              </div>
              <Button asChild variant="outline">
                <Link to="/dashboard/bugs/report">Report an issue</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Support channel</CardTitle>
            <CardDescription>
              Bug reporting is now part of the dashboard workflow for students and teachers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
              Report broken lectures, upload failures, playback issues, missing content, or unexpected grading
              behavior directly from the workspace.
            </div>
            {(session?.session.role === "STUDENT" || session?.session.role === "TEACHER") && !isSessionPending ? (
              <div className="flex gap-3">
                <Button asChild>
                  <Link to="/dashboard/bugs/report">Report a bug</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard/bugs">My bug reports</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                Bug submission is enabled for student and teacher roles.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase checkpoint</CardTitle>
            <CardDescription>Current dashboard priorities before course, messaging, and analytics phases expand.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
              Profile completion, admin account governance, and bug intake are now first-class dashboard flows.
            </div>
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
              The platform can now lock deactivated accounts and expose admin-safe controls for operational triage.
            </div>
            <div className="flex items-center gap-2 text-sm text-on-surface/60">
              <CircleHelp className="size-4" />
              <span>Smooth 150ms transitions remain the default for every admin and support surface.</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
