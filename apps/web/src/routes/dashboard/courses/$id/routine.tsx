import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { ArchivedCourseBanner } from "@/components/courses/archived-course-banner";
import { CourseManageTabs } from "@/components/courses/course-manage-tabs";
import { CourseRoutineManager } from "@/components/courses/course-routine-manager";
import { BackButton } from "@/components/ui/back-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccessGuard } from "@/hooks/use-access-guard";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dashboard/courses/$id/routine")({
  head: () =>
    seo({
      description: "Publish the class routine your students read in the player.",
      path: "/dashboard/courses",
      title: "Course Routine"
    }),
  component: CourseRoutinePage,
  errorComponent: RouteErrorView
} as never);

function CourseRoutinePage(): JSX.Element {
  const { id } = Route.useParams();
  const t = useT();
  const {
    data: course = null,
    error,
    isPending
  } = useQuery<CourseDetail>({
    queryFn: async () => getCourse(id),
    queryKey: queryKeys.courses.detail(id)
  });

  useAccessGuard([error]);

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard/courses" />
      {course?.status === "ARCHIVED" ? <ArchivedCourseBanner /> : null}
      <CourseManageTabs courseId={id} current="routine" />

      {isPending || !course ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <SectionHeading
            description={t("routine.manageLead")}
            title={`${t("routine.title")} · ${course.title}`}
          />
          <CourseRoutineManager courseId={id} />
        </>
      )}
    </div>
  );
}
