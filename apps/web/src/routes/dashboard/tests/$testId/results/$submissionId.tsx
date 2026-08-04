import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { TestTakingSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { AssessmentTestDetail, SubmissionDetail } from "@/lib/api/tests";
import { getSubmissionDetail, getTestDetail } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/tests/$testId/results/$submissionId")({
  head: () =>
    seo({
      description: "Your score and answers for this test submission.",
      path: "/dashboard/tests",
      title: "Test Results"
    }),
  component: SubmissionResultPage,
  errorComponent: RouteErrorView
} as never);

function SubmissionResultPage(): JSX.Element {
  const t = useT();
  const { submissionId, testId } = Route.useParams();
  const [testQuery, submissionQuery] = useQueries({
    queries: [
      {
        queryFn: async () => getTestDetail(testId),
        queryKey: queryKeys.tests.detail(testId)
      },
      {
        queryFn: async () => getSubmissionDetail(submissionId),
        queryKey: queryKeys.tests.submission(submissionId)
      }
    ]
  });
  const test: AssessmentTestDetail | null = testQuery?.data ?? null;
  const submission: SubmissionDetail | null = submissionQuery?.data ?? null;
  const isLoading = Boolean(testQuery?.isPending) || Boolean(submissionQuery?.isPending);

  if (isLoading || !test || !submission) {
    return (
      <TestTakingSkeleton />
    );
  }

  const answerMap = new Map(submission.answers.map((answer) => [answer.questionId, answer]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>
            {submission.status === "GRADED" ? "Final result" : "Submission received"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge tone="neutral">{submission.status}</Badge>
          <Badge tone="neutral">
            Score {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
          </Badge>
          {test.passingScore !== null ? <Badge tone="neutral">Passing score {test.passingScore}</Badge> : null}
          {submission.passed !== null ? (
            <Badge tone={submission.passed ? "neutral" : "attention"}>
              {submission.passed ? t("test.passed") : t("test.failed")}
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      {test.questions.map((question) => {
        const answer = answerMap.get(question.id);
        const selectedOption = question.options.find((option) => option.id === answer?.selectedOptionId);

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                <RichTextContent html={question.questionText} />
              </CardTitle>
              <CardDescription>
                {question.type} · {question.marks} marks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.type === "MCQ" ? (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-6 text-ink">
                  {selectedOption?.optionText ?? "No option selected"}
                </div>
              ) : (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-6 text-ink">
                  {answer?.writtenAnswer || "No written answer submitted"}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-ink/70">
                <span>Awarded marks: {answer?.awardedMarks ?? 0}</span>
                {answer?.isCorrect !== null && answer?.isCorrect !== undefined ? (
                  <span>{answer.isCorrect ? "Marked correct" : "Marked incorrect"}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
