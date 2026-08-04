import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { JSX } from "react";
import { z } from "zod";

import { CourseExamEditor } from "@/components/courses/course-exam-editor";
import { CourseBuilderSteps } from "@/components/courses/course-builder-steps";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

const examSearchSchema = z.object({
  examId: z.string().uuid()
});

export const Route = createFileRoute("/dashboard/courses/$id/exam")({
  head: () =>
    seo({
      description: "Write or update a test question for this course.",
      path: "/dashboard/courses",
      title: "Edit Question"
    }),
  component: CourseExamQuestionPage,
  validateSearch: examSearchSchema
} as never);

function CourseExamQuestionPage(): JSX.Element {
  const { id } = Route.useParams();
  const { examId } = Route.useSearch();
  const queryClient = useQueryClient();
  const t = useT();

  const refreshCourseAssessments = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.tests.byCourse(id) });
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="border border-hairline bg-card p-2 sm:p-3">
        <CourseBuilderSteps courseId={id} current="lectures" />
      </div>

      <div className="flex flex-col gap-5 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label-mono text-xs uppercase text-muted-faint">{t("author.exam")}</p>
          <h1 className="mt-2 text-2xl font-medium text-ink sm:text-3xl">
            {t("author.questionPageTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">
            {t("author.questionPageLead")}
          </p>
        </div>
        <Button asChild className="h-11 shrink-0" variant="outline">
          <Link params={{ id }} search={{ stage: "lectures" }} to="/dashboard/courses/$id/content">
            <ArrowLeft className="size-4" />
            {t("action.back")}
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden border border-hairline bg-card">
        <CourseExamEditor examId={examId} onRefresh={refreshCourseAssessments} />
      </div>
    </div>
  );
}
