import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { ArchivedCourseBanner } from "@/components/courses/archived-course-banner";
import { CourseManageTabs } from "@/components/courses/course-manage-tabs";
import { BackButton } from "@/components/ui/back-button";
import { LectureDiscussion } from "@/components/courses/lecture-discussion";
import { RouteErrorView } from "@/components/common/route-error";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentChapter } from "@/lib/api/content";
import { getCourseContent } from "@/lib/api/content";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/courses/$id/discussions")({
  head: () =>
    seo({
      description: "Every class discussion for this course, in one place.",
      path: "/dashboard/courses",
      title: "Course Discussions"
    }),
  component: CourseDiscussionsPage,
  errorComponent: RouteErrorView
} as never);

/**
 * Every class of one course with its comment thread underneath, so a teacher
 * can answer without walking the student player lecture by lecture. The thread
 * component is the same one students use — one implementation of posting,
 * replying, editing and deleting, and the API decides who may do which.
 */
function CourseDiscussionsPage(): JSX.Element {
  const { id } = Route.useParams();
  const t = useT();
  const format = useFormat();

  const [courseQuery, contentQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(id), queryKey: queryKeys.courses.detail(id) },
      { queryFn: async () => getCourseContent(id), queryKey: queryKeys.content.course(id) }
    ]
  });

  const course: CourseDetail | null = courseQuery?.data ?? null;
  const chapters: readonly ContentChapter[] = contentQuery?.data ?? [];
  const isLoading = Boolean(courseQuery?.isPending) || Boolean(contentQuery?.isPending);
  const lectureCount = chapters.reduce((total, chapter) => total + chapter.lectures.length, 0);

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard/courses" />
      {course?.status === "ARCHIVED" ? <ArchivedCourseBanner /> : null}
      <CourseManageTabs courseId={id} current="discussions" />

      {isLoading || !course ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <SectionHeading
            description={t("disc.managerLead")}
            title={`${t("disc.managerTitle")} · ${course.title}`}
          />

          {lectureCount === 0 ? (
            <EmptyState message={t("disc.noLectures")} />
          ) : (
            <div className="space-y-8">
              {chapters
                .filter((chapter) => chapter.lectures.length > 0)
                .map((chapter) => (
                  <section className="space-y-3" key={chapter.id}>
                    <h3 className="border-b border-hairline pb-2 text-lg font-medium text-ink">
                      {chapter.title}
                      <span className="ml-3 text-base font-light text-muted-light">
                        {t("course.lessons", { count: format.number(chapter.lectures.length) })}
                      </span>
                    </h3>

                    <div className="space-y-3">
                      {chapter.lectures.map((lecture) => (
                        <div className="space-y-2" key={lecture.id}>
                          <p className="text-base font-medium text-ink-muted">{lecture.title}</p>
                          <LectureDiscussion lectureId={lecture.id} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
