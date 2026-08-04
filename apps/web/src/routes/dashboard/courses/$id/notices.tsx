import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { CourseManageTabs } from "@/components/courses/course-manage-tabs";
import { CourseNoticeManager } from "@/components/courses/course-notice-manager";
import { RouteErrorView } from "@/components/common/route-error";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/courses/$id/notices")({
  head: () =>
    seo({
      description: "Post and manage notices your students will see in the player.",
      path: "/dashboard/courses",
      title: "Course Notices"
    }),
  component: CourseNoticesPage,
  errorComponent: RouteErrorView
} as never);

function CourseNoticesPage(): JSX.Element {
  const { id } = Route.useParams();
  const t = useT();
  const { data: course = null, isPending } = useQuery<CourseDetail>({
    queryFn: async () => getCourse(id),
    queryKey: queryKeys.courses.detail(id)
  });

  return (
    <div className="space-y-6">
      <CourseManageTabs courseId={id} current="notices" />

      {isPending || !course ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <SectionHeading description={t("notice.lead")} title={`${t("notice.title")} · ${course.title}`} />
          <CourseNoticeManager courseId={id} />
        </>
      )}
    </div>
  );
}
