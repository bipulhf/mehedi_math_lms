import { useQueries, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { z } from "zod";

import { RouteErrorView } from "@/components/common/route-error";
import { CourseBuilderSteps } from "@/components/courses/course-builder-steps";
import { CourseChapterBuilder } from "@/components/courses/course-chapter-builder";
import { CourseLectureBuilder } from "@/components/courses/course-lecture-builder";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentChapter } from "@/lib/api/content";
import { getCourseContent } from "@/lib/api/content";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { getCourseAssessments } from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

const contentSearchSchema = z.object({
  stage: z.enum(["chapters", "lectures"]).default("chapters")
});

export const Route = createFileRoute("/dashboard/courses/$id/content")({
  head: () =>
    seo({
      description: "Build the chapters and classes that make up this course.",
      path: "/dashboard/courses",
      title: "Course Content"
    }),
  component: CourseContentPage,
  errorComponent: RouteErrorView,
  validateSearch: (search: unknown) => contentSearchSchema.parse(search)
} as never);

function CourseContentPage(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { id } = Route.useParams();
  const { stage } = Route.useSearch();
  const queryClient = useQueryClient();
  const [courseQuery, contentQuery, assessmentsQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(id), queryKey: queryKeys.courses.detail(id) },
      { queryFn: async () => getCourseContent(id), queryKey: queryKeys.content.course(id) },
      { queryFn: async () => getCourseAssessments(id), queryKey: queryKeys.tests.byCourse(id) }
    ]
  });
  const course: CourseDetail | null = courseQuery?.data ?? null;
  const content: readonly ContentChapter[] = contentQuery?.data ?? [];
  const assessments: readonly AssessmentChapterSummary[] = assessmentsQuery?.data ?? [];
  const isLoading =
    Boolean(courseQuery?.isPending) ||
    Boolean(contentQuery?.isPending) ||
    Boolean(assessmentsQuery?.isPending);

  const loadData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.content.course(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.byCourse(id) })
    ]);
  };

  if (isLoading || !course) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const lectureCount = content.reduce((total, chapter) => total + chapter.lectures.length, 0);
  const examCount = assessments.reduce((total, chapter) => total + chapter.tests.length, 0);

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="border border-hairline bg-card p-2 sm:p-3">
        <CourseBuilderSteps courseId={id} current={stage} />
      </div>

      <SectionHeading
        action={
          <p className="label-mono text-xs text-muted-faint">
            {t("author.contentSummary", {
              chapters: format.number(content.length),
              items: format.number(lectureCount + examCount)
            })}
          </p>
        }
        description={stage === "chapters" ? t("author.chaptersLead") : t("author.lecturesLead")}
        eyebrow={t("author.stageLabel")}
        title={stage === "chapters" ? t("author.chaptersTitle") : t("author.lecturesTitle")}
      />

      {stage === "chapters" ? (
        <CourseChapterBuilder chapters={content} courseId={course.id} onRefresh={loadData} />
      ) : (
        <CourseLectureBuilder
          assessments={assessments}
          chapters={content}
          courseId={course.id}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
