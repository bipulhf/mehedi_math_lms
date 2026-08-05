import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import { listCourses } from "@/lib/api/courses";
import { listMyEnrollments } from "@/lib/api/enrollments";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/exams/")({
  head: () =>
    seo({
      description: "Every exam on your courses, in one place.",
      path: "/dashboard/exams",
      title: "Exams"
    }),
  component: ExamCoursesPage,
  errorComponent: RouteErrorView
} as never);

interface ExamCourseCard {
  id: string;
  subtitle: string;
  title: string;
}

/**
 * The way in to the exam workspace: which course, first.
 *
 * Staff see the courses they can manage and students see the ones they are
 * enrolled in, which is the same page with a different source — the drill-down
 * below it behaves the same either way, read-only for a student.
 */
function ExamCoursesPage(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useAuthSession();
  const role = session?.session.role;
  const isStudent = role === "STUDENT";
  const isStaff = role === "TEACHER" || role === "ADMIN";

  const staffCourses = useQuery({
    enabled: isStaff,
    queryFn: async () => listCourses({ limit: 100, mine: role === "TEACHER" }),
    queryKey: queryKeys.courses.list({ exams: true, mine: role === "TEACHER" })
  });
  const enrollments = useQuery({
    enabled: isStudent,
    queryFn: async () => listMyEnrollments(),
    queryKey: queryKeys.enrollments.mine()
  });

  const isPending =
    isSessionPending ||
    (isStaff && staffCourses.isPending) ||
    (isStudent && enrollments.isPending);

  const courses: readonly ExamCourseCard[] = isStudent
    ? (enrollments.data ?? [])
        .filter((enrollment) => enrollment.accessGranted)
        .map((enrollment) => ({
          id: enrollment.course.id,
          subtitle: enrollment.category.name,
          title: enrollment.course.title
        }))
    : (staffCourses.data?.data ?? []).map((course) => ({
        id: course.id,
        subtitle: `${course.category.name} · ${format.number(course.stats.lectureCount)} ${t("common.lessons")}`,
        title: course.title
      }));

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description={isStudent ? t("exams.studentLead") : t("exams.staffLead")}
        title={t("exams.title")}
      />

      {courses.length === 0 ? (
        <EmptyState message={t("exams.noCourses")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link
              className="block"
              key={course.id}
              params={{ courseId: course.id }}
              to="/dashboard/exams/$courseId"
            >
              <Card className="h-full transition-colors hover:border-line-strong">
                <CardContent className="space-y-2 p-5">
                  <p className="font-medium text-ink">{course.title}</p>
                  <p className="text-sm font-light text-muted">{course.subtitle}</p>
                  <Badge tone="neutral">{t("exams.title")}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
