import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { JSX } from "react";
import { z } from "zod";

import { CourseExamEditor } from "@/components/courses/course-exam-editor";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

const examSearchSchema = z.object({
  examId: z.string().uuid()
});

export const Route = createFileRoute("/dashboard/courses/$id/exam")({
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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink">{t("author.questionPageTitle")}</h1>
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

      <div className="border border-hairline bg-card">
        <CourseExamEditor examId={examId} onRefresh={refreshCourseAssessments} />
      </div>
    </div>
  );
}
