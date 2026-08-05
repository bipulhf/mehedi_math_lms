import { useQueries } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { ExamStatusLine } from "@/components/exams/exam-status-line";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import { getCourse } from "@/lib/api/courses";
import { getCourseAssessments } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/exams/$courseId/")({
  head: () =>
    seo({
      description: "The exams on this course, chapter by chapter.",
      path: "/dashboard/exams",
      title: "Course Exams"
    }),
  component: CourseExamsPage,
  errorComponent: RouteErrorView
} as never);

/**
 * Every exam on one course, in the order a student meets them.
 *
 * A teacher gets what still needs doing — how many papers are waiting to be
 * marked — and a student gets where they stand on each one.
 */
function CourseExamsPage(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { courseId } = Route.useParams();
  const { session } = useAuthSession();
  const isStudent = session?.session.role === "STUDENT";

  const [courseQuery, assessmentsQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(courseId), queryKey: queryKeys.courses.detail(courseId) },
      {
        queryFn: async () => getCourseAssessments(courseId),
        queryKey: queryKeys.tests.byCourse(courseId)
      }
    ]
  });

  const isPending = Boolean(courseQuery?.isPending) || Boolean(assessmentsQuery?.isPending);
  const chapters = assessmentsQuery?.data ?? [];
  const chaptersWithExams = chapters.filter((chapter) => chapter.tests.length > 0);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard/exams" />
      <SectionHeading
        description={isStudent ? t("exams.studentLead") : t("exams.staffLead")}
        eyebrow={courseQuery?.data?.title ?? ""}
        title={t("exams.title")}
      />

      {chaptersWithExams.length === 0 ? (
        <EmptyState message={t("exams.noExams")} />
      ) : (
        chaptersWithExams.map((chapter) => (
          <section className="space-y-3" key={chapter.chapterId}>
            <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2">
              <h2 className="text-lg font-medium text-ink">{chapter.chapterTitle}</h2>
              <span className="label-mono text-xs text-muted-faint">
                {t("exams.examCount", { count: format.number(chapter.tests.length) })}
              </span>
            </div>

            <div className="grid gap-3">
              {chapter.tests.map((test) => (
                <Card key={test.id}>
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <p className="break-words font-medium text-ink">{test.title}</p>
                      <p className="text-sm font-light text-muted">
                        {test.type === "WRITTEN"
                          ? t("author.examKindWritten")
                          : t("author.examKindMcq")}{" "}
                        · {format.number(test.questionCount)} {t("ab.questions")} ·{" "}
                        {format.number(test.totalMarks)} {t("qe.marks")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {isStudent ? null : (
                          <Badge tone={test.isPublished ? "neutral" : "attention"}>
                            {test.isPublished ? t("common.published") : t("common.draft")}
                          </Badge>
                        )}
                        <ExamStatusLine isStudent={isStudent} testId={test.id} />
                      </div>
                    </div>

                    <Button asChild className="shrink-0" variant="outline">
                      <Link
                        params={{ courseId, testId: test.id }}
                        to="/dashboard/exams/$courseId/$testId"
                      >
                        {isStudent ? t("exams.seeResult") : t("exams.reviewAnswers")}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
