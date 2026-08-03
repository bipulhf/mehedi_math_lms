import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

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
 * The student's home: what they were last watching, then everything they own.
 *
 * The design opens with a resume card, a list of today's tasks, the next test
 * and a "weak area" insight. Only the first survives — there is no task list,
 * no scheduled test and no per-topic scoring in the schema
 * (GENEX_MIGRATION.md §2), and inventing three panels of fiction to fill the
 * grid would be worse than a page that fits its data.
 */
export function StudentOverview({ name }: { name: string }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { data: enrollments = [], isPending } = useQuery<readonly StudentEnrollment[]>({
    queryFn: async () => listMyEnrollments(),
    queryKey: queryKeys.enrollments.mine()
  });

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Most-progressed but unfinished: the one they are actually in the middle of.
  // A course at 0% has not been started, so it is not "where you left off".
  const resume = enrollments
    .filter((item) => item.accessGranted && item.completedAt === null && item.progressPercentage > 0)
    .sort((a, b) => b.progressPercentage - a.progressPercentage)[0];

  return (
    <div className="space-y-8">
      <SectionHeading title={t("dash.greeting", { name })} />

      {resume ? (
        <div className="grid gap-0 border border-hairline bg-card sm:grid-cols-[300px_1fr]">
          <div className="flex aspect-video items-center justify-center overflow-hidden bg-placeholder-fill sm:aspect-auto">
            {resume.course.coverImageUrl ? (
              <ResponsiveImage
                alt={resume.course.title}
                className="size-full object-cover"
                sizes="300px"
                src={resume.course.coverImageUrl}
              />
            ) : null}
          </div>
          <div className="space-y-4 p-6">
            <p className="label-mono text-xs uppercase text-muted-faint">{t("dash.resume")}</p>
            <p className="text-xl font-medium text-ink">{resume.course.title}</p>
            <ProgressTrack
              completed={resume.progressPercentage}
              label={resume.course.title}
              total={100}
            />
            <p className="text-sm text-muted-light">
              {format.percent(resume.progressPercentage)}
            </p>
            <Button asChild>
              <Link params={{ courseId: resume.course.id }} to="/dashboard/learn/$courseId">
                {t("dash.continue")}
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <SectionHeading title={t("nav.myCourses")} />

        {enrollments.length === 0 ? (
          <EmptyState
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/courses">{t("action.viewAllCourses")}</Link>
              </Button>
            }
            message={t("dash.myCoursesEmpty")}
          />
        ) : (
          <ul className="border-t border-hairline">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id}>
                <Link
                  className="flex flex-col gap-3 border-b border-hairline-fainter py-5 transition-colors hover:bg-row-hover sm:flex-row sm:items-center sm:gap-6"
                  params={{ courseId: enrollment.course.id }}
                  to="/dashboard/learn/$courseId"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate text-base font-medium text-ink">
                      {enrollment.course.title}
                    </p>
                    <ProgressTrack
                      completed={enrollment.progressPercentage}
                      isComplete={enrollment.completedAt !== null}
                      label={enrollment.course.title}
                      total={100}
                    />
                  </div>
                  <span className="shrink-0 text-sm text-muted-light">
                    {enrollment.completedAt === null
                      ? format.percent(enrollment.progressPercentage)
                      : t("dash.completed")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
