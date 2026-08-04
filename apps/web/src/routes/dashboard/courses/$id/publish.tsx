import { useQueries, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type JSX } from "react";
import { toast } from "sonner";

import { CourseBuilderSteps } from "@/components/courses/course-builder-steps";
import { BackButton } from "@/components/ui/back-button";
import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentChapter } from "@/lib/api/content";
import { getCourseContent } from "@/lib/api/content";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse, submitCourse } from "@/lib/api/courses";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { getCourseAssessments } from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { stripHtml } from "@/lib/html";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/courses/$id/publish")({
  head: () =>
    seo({
      description: "Check this course is ready, then make it visible to students.",
      path: "/dashboard/courses",
      title: "Publish Course"
    }),
  component: PublishCoursePage,
  errorComponent: RouteErrorView
} as never);

interface Check {
  readonly isSatisfied: boolean;
  readonly label: string;
}

function PublishCoursePage(): JSX.Element {
  const { id } = Route.useParams();
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [courseQuery, contentQuery, assessmentsQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(id), queryKey: queryKeys.courses.detail(id) },
      { queryFn: async () => getCourseContent(id), queryKey: queryKeys.content.course(id) },
      { queryFn: async () => getCourseAssessments(id), queryKey: queryKeys.tests.byCourse(id) }
    ]
  });

  const course: CourseDetail | null = courseQuery?.data ?? null;
  const chapters: readonly ContentChapter[] = contentQuery?.data ?? [];
  const assessments: readonly AssessmentChapterSummary[] = assessmentsQuery?.data ?? [];

  if (courseQuery?.isPending || contentQuery?.isPending || assessmentsQuery?.isPending || !course) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const lessons = chapters.flatMap((chapter) => chapter.lectures);
  const exams = assessments.flatMap((chapter) => chapter.tests);
  const freeLessons = lessons.filter((lesson) => lesson.isPreview);
  const contentItemCount = lessons.length + exams.length;

  // Advisory, not enforcement. The design's checklist says "বাকিগুলো ছাড়াও
  // প্রকাশ করা যায়" — the API decides what is actually required, and this list
  // is here so a teacher knows what a reviewer will look at.
  const checks: readonly Check[] = [
    { isSatisfied: course.title.trim().length >= 8, label: t("builder.checkTitle") },
    { isSatisfied: stripHtml(course.description).trim().length >= 40, label: t("builder.checkDescription") },
    { isSatisfied: chapters.length >= 1, label: t("builder.checkModules") },
    { isSatisfied: contentItemCount >= 3, label: t("builder.checkLessons") },
    {
      isSatisfied: course.isExamOnly || freeLessons.length >= 1,
      label: t("builder.checkFreeLesson")
    },
    { isSatisfied: Number(course.price) > 0, label: t("builder.checkPrice") }
  ];

  const satisfied = checks.filter((check) => check.isSatisfied).length;
  const canSubmit = course.status === "DRAFT";

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);

    try {
      await submitCourse(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(id) });
      toast.success(t("builder.submitted"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <BackButton to="/dashboard/courses" />
      <CourseBuilderSteps courseId={id} current="review" />

      <SectionHeading
        action={<CourseStatusBadge status={course.status} />}
        description={t("author.reviewLead")}
        title={t("author.reviewTitle")}
      />

      <section className="border border-hairline bg-card p-6">
        <h3 className="text-xl font-medium text-ink">{course.title}</h3>
        <RichTextContent
          className="mt-2 text-base font-light leading-relaxed text-muted"
          html={course.description}
        />
        <dl className="mt-6 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card p-4">
            <dt className="text-sm text-muted">{t("editor.category")}</dt>
            <dd className="mt-1 font-medium text-ink">{course.category.name}</dd>
          </div>
          <div className="bg-card p-4">
            <dt className="text-sm text-muted">{t("builder.stepContent")}</dt>
            <dd className="mt-1 font-medium text-ink">{format.number(chapters.length)}</dd>
          </div>
          <div className="bg-card p-4">
            <dt className="text-sm text-muted">{t("builder.stepTests")}</dt>
            <dd className="mt-1 font-medium text-ink">{format.number(contentItemCount)}</dd>
          </div>
          <div className="bg-card p-4">
            <dt className="text-sm text-muted">{t("editor.price")}</dt>
            <dd className="mt-1 font-medium text-ink">{format.currency(course.price)}</dd>
          </div>
        </dl>
      </section>

      <div className="border border-hairline bg-card">
        <p className="border-b border-hairline px-6 py-4 text-base text-muted">
          {t("builder.checklistDone", {
            done: format.number(satisfied),
            total: format.number(checks.length)
          })}
        </p>
        <ul>
          {checks.map((check) => (
            <li
              className="flex items-center gap-3 border-b border-hairline-fainter px-6 py-4 last:border-b-0"
              key={check.label}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  check.isSatisfied
                    ? "border-accent text-accent"
                    : "border-dot-idle text-transparent"
                )}
              >
                ✓
              </span>
              <span
                className={cn(
                  "text-base font-light",
                  check.isSatisfied ? "text-ink-muted" : "text-muted-faint"
                )}
              >
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {canSubmit ? (
        <Button disabled={isSubmitting} onClick={() => void handleSubmit()} size="lg">
          {t("builder.submit")}
        </Button>
      ) : (
        <p className="border border-dashed border-dot-idle px-6 py-5 text-base font-light text-muted">
          {course.status === "PENDING" ? t("builder.submitted") : t("empty.generic")}
        </p>
      )}
    </div>
  );
}
