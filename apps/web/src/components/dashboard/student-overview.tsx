import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { ChartFrame } from "@/components/charts/chart-frame";
import { SeriesHorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressTrack } from "@/components/ui/progress-track";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { listMyEnrollments } from "@/lib/api/enrollments";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/**
 * Student home is action-first: see current progress, resume one course,
 * resolve blocked access, or find the next course without opening another page.
 */
export function StudentOverview({ name }: { name: string }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { data: enrollments = [], isPending } = useQuery<readonly StudentEnrollment[]>({
    queryFn: async () => listMyEnrollments(),
    queryKey: queryKeys.enrollments.mine()
  });

  if (isPending) {
    return <StudentOverviewSkeleton />;
  }

  const visibleEnrollments = enrollments.filter((item) => item.status !== "CANCELLED");
  const completedCourses = visibleEnrollments.filter(
    (item) => item.completedAt !== null || item.status === "COMPLETED"
  );
  const accessibleCourses = visibleEnrollments.filter((item) => item.accessGranted);
  const activeCourses = accessibleCourses.filter((item) => item.completedAt === null);
  const awaitingPayment = visibleEnrollments.filter((item) => !item.accessGranted);
  const averageProgress =
    accessibleCourses.length === 0
      ? 0
      : Math.round(
          accessibleCourses.reduce((total, item) => total + item.progressPercentage, 0) /
            accessibleCourses.length
        );

  // Highest-progress unfinished course is the best available resume signal;
  // enrollment payload does not expose last-viewed lecture metadata.
  const resume = activeCourses
    .filter((item) => item.progressPercentage > 0)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)[0];
  const progressChartData = [...accessibleCourses]
    .sort((a, b) => b.progressPercentage - a.progressPercentage)
    .slice(0, 8)
    .map((item) => ({ label: item.course.title, value: item.progressPercentage }));
  const courseRows = [...visibleEnrollments]
    .sort((a, b) => {
      if (a.accessGranted !== b.accessGranted) {
        return a.accessGranted ? -1 : 1;
      }

      if (a.completedAt !== null && b.completedAt === null) {
        return 1;
      }

      if (a.completedAt === null && b.completedAt !== null) {
        return -1;
      }

      return b.progressPercentage - a.progressPercentage;
    })
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="border border-ink bg-ink p-6 text-paper sm:p-8 lg:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="label-mono text-xs uppercase tracking-[0.2em] text-paper/55">
              {t("dash.learningSummary")}
            </p>
            <h1 className="mt-3 text-3xl font-medium leading-tight sm:text-4xl">
              {t("dash.greeting", { name })}
            </h1>
            <p className="mt-3 max-w-xl text-base font-light leading-relaxed text-paper/70">
              {t("dash.learningSummaryLead")}
            </p>
          </div>

          <Button
            asChild
            className="w-full border-paper/35 text-paper hover:bg-paper/10 hover:text-paper sm:w-auto"
            size="lg"
            variant="outline"
          >
            <Link to="/courses">{t("dash.browseCourses")}</Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 border-t border-paper/15 pt-5 sm:grid-cols-3">
          <SummaryMetric label={t("dash.activeCourses")} value={format.number(activeCourses.length)} />
          <SummaryMetric label={t("dash.completedCourses")} value={format.number(completedCourses.length)} />
          <SummaryMetric
            className="col-span-2 mt-5 border-t border-paper/15 pt-5 sm:col-span-1 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"
            label={t("dash.averageProgress")}
            value={format.percent(averageProgress)}
          />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-8">
          {progressChartData.length > 1 ? (
            <ChartFrame height={Math.max(160, progressChartData.length * 36)} title={t("dash.progressByCourse")}>
              <SeriesHorizontalBarChart
                ariaLabel={t("dash.progressByCourse")}
                data={progressChartData}
                height={Math.max(160, progressChartData.length * 36)}
                renderTooltip={(point) => format.percent(point.value)}
              />
            </ChartFrame>
          ) : null}

          {resume ? (
            <section className="space-y-4">
              <SectionHeading title={t("dash.resume")} />
              <ResumeCard enrollment={resume} format={format} t={t} />
            </section>
          ) : null}

          <section className="space-y-4">
            <SectionHeading
              action={
                visibleEnrollments.length > 6 ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/dashboard/my-courses">{t("dash.viewAllCourses")}</Link>
                  </Button>
                ) : undefined
              }
              title={t("nav.myCourses")}
            />

            {visibleEnrollments.length === 0 ? (
              <EmptyState
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/courses">{t("action.viewAllCourses")}</Link>
                  </Button>
                }
                message={t("dash.myCoursesEmpty")}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {courseRows.map((enrollment) => (
                  <LearningCourseCard enrollment={enrollment} format={format} key={enrollment.id} t={t} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="border border-hairline bg-card p-5">
            <h2 className="text-lg font-medium text-ink">{t("dash.quickActions")}</h2>
            <div className="mt-4 divide-y divide-hairline-faint border-y border-hairline-faint">
              <QuickAction href="/dashboard/my-courses" label={t("nav.myCourses")} />
              <QuickAction href="/dashboard/messages" label={t("dash.openMessages")} />
              <QuickAction href="/dashboard/payments" label={t("dash.viewPayments")} />
              <QuickAction href="/courses" label={t("dash.browseCourses")} />
            </div>
          </section>

          {awaitingPayment.length > 0 ? (
            <section className="border border-accent/35 bg-accent/5 p-5">
              <p className="label-mono text-xs uppercase tracking-[0.16em] text-accent">
                {t("dash.paymentAttention")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t("dash.paymentAttentionLead", { count: format.number(awaitingPayment.length) })}
              </p>
              <div className="mt-4 space-y-3">
                {awaitingPayment.slice(0, 2).map((enrollment) => (
                  <Link
                    className="block border-t border-accent/15 pt-3 text-sm text-ink transition-colors hover:text-accent"
                    key={enrollment.id}
                    params={{ slug: enrollment.course.slug }}
                    to="/courses/$slug"
                  >
                    <span className="line-clamp-2">{enrollment.course.title}</span>
                    <span className="mt-1 block text-xs text-accent">{t("mine.finishPayment")} →</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function SummaryMetric({
  className,
  label,
  value
}: {
  className?: string;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className={className}>
      <p className="text-2xl font-medium text-paper sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-paper/55">{label}</p>
    </div>
  );
}

function ResumeCard({
  enrollment,
  format,
  t
}: {
  enrollment: StudentEnrollment;
  format: ReturnType<typeof useFormat>;
  t: ReturnType<typeof useT>;
}): JSX.Element {
  return (
    <Link
      className="group grid border border-hairline bg-card transition-colors hover:border-line-strong sm:grid-cols-[13rem_1fr]"
      params={{ courseId: enrollment.course.id }}
      to="/dashboard/learn/$courseId"
    >
      <div className="aspect-video overflow-hidden bg-placeholder-fill sm:aspect-auto">
        {enrollment.course.coverImageUrl ? (
          <ResponsiveImage
            alt={enrollment.course.title}
            className="size-full object-cover"
            sizes="(min-width: 640px) 208px, 100vw"
            src={enrollment.course.coverImageUrl}
          />
        ) : null}
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <p className="label-mono text-xs uppercase tracking-[0.16em] text-accent">{t("dash.resume")}</p>
        <h3 className="text-xl font-medium text-ink transition-colors group-hover:text-accent">
          {enrollment.course.title}
        </h3>
        <ProgressTrack
          completed={enrollment.progressPercentage}
          label={enrollment.course.title}
          total={100}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-light">
          <span>{format.percent(enrollment.progressPercentage)}</span>
          <span className="text-ink">{t("dash.continue")} →</span>
        </div>
      </div>
    </Link>
  );
}

function LearningCourseCard({
  enrollment,
  format,
  t
}: {
  enrollment: StudentEnrollment;
  format: ReturnType<typeof useFormat>;
  t: ReturnType<typeof useT>;
}): JSX.Element {
  const isComplete = enrollment.completedAt !== null || enrollment.status === "COMPLETED";
  const content = (
    <div className="flex gap-4 p-4">
      <div className="size-20 shrink-0 overflow-hidden bg-placeholder-fill sm:size-24">
        {enrollment.course.coverImageUrl ? (
          <ResponsiveImage
            alt={enrollment.course.title}
            className="size-full object-cover"
            sizes="96px"
            src={enrollment.course.coverImageUrl}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-light">{enrollment.category.name}</p>
        <h3 className="mt-1 line-clamp-2 text-base font-medium leading-snug text-ink transition-colors group-hover:text-accent">
          {enrollment.course.title}
        </h3>
        <div className="mt-3 space-y-1.5">
          <ProgressTrack
            completed={enrollment.progressPercentage}
            isComplete={isComplete}
            label={enrollment.course.title}
            total={100}
          />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-light">
            <span>{isComplete ? t("dash.completed") : format.percent(enrollment.progressPercentage)}</span>
            <span className="text-ink">{isComplete ? "+" : ">"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!enrollment.accessGranted) {
    return (
      <Link
        className="group border border-hairline bg-card transition-colors hover:border-line-strong"
        params={{ slug: enrollment.course.slug }}
        to="/courses/$slug"
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      className="group border border-hairline bg-card transition-colors hover:border-line-strong"
      params={{ courseId: enrollment.course.id }}
      to="/dashboard/learn/$courseId"
    >
      {content}
    </Link>
  );
}

function QuickAction({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <Link
      className="flex min-h-11 items-center justify-between gap-3 text-sm text-muted transition-colors hover:text-accent"
      to={href}
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function StudentOverviewSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-36 w-full" key={index} />
        ))}
      </div>
    </div>
  );
}
