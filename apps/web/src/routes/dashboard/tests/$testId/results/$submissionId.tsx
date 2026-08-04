import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { TestTakingSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        queryFn: async () => getTestDetail(testId, true),
        queryKey: queryKeys.tests.detailWithAnswers(testId)
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
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Badge tone="neutral">{t("test.attemptLabel", { number: String(submission.attemptNumber) })}</Badge>
            <Badge tone="neutral">{submission.status}</Badge>
            <Badge tone="neutral">
              Score {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
            </Badge>
            {test.passingScore !== null ? (
              <Badge tone="neutral">Passing score {test.passingScore}</Badge>
            ) : null}
            {submission.passed !== null ? (
              <Badge tone={submission.passed ? "neutral" : "attention"}>
                {submission.passed ? t("test.passed") : t("test.failed")}
              </Badge>
            ) : null}
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/tests/$testId/history" params={{ testId }}>
              {t("test.viewHistory")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {test.questions.map((question) => {
        const answer = answerMap.get(question.id);

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
                <div className="grid gap-2">
                  {question.options.map((option) => {
                    const isSelected = option.id === answer?.selectedOptionId;
                    const isCorrectOption = option.isCorrect === true;

                    return (
                      <div
                        key={option.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] border px-4 py-3 text-sm text-ink ${
                          isCorrectOption ? "border-accent bg-accent/8" : "border-hairline bg-panel-warm"
                        }`}
                      >
                        <span>{option.optionText}</span>
                        <div className="flex flex-wrap gap-2">
                          {isSelected ? (
                            <Badge tone={isCorrectOption ? "neutral" : "attention"}>
                              {t("test.yourAnswer")}
                            </Badge>
                          ) : null}
                          {isCorrectOption ? (
                            <Badge tone="neutral">{t("test.correctAnswer")}</Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {!answer?.selectedOptionId ? (
                    <p className="text-xs text-ink/55">{t("test.noOption")}</p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/55">{t("test.yourAnswer")}</p>
                  <div className="mt-2 rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-6 text-ink">
                    {answer?.writtenAnswer || t("test.noAnswer")}
                  </div>
                </div>
              )}
              {question.type === "WRITTEN" && question.expectedAnswer ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/55">{t("test.correctAnswer")}</p>
                  <RichTextContent className="mt-2" html={question.expectedAnswer} />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3 text-sm text-ink/70">
                <span>{t("test.awardedMarks", { count: String(answer?.awardedMarks ?? 0) })}</span>
                {answer?.isCorrect !== null && answer?.isCorrect !== undefined ? (
                  <span>{answer.isCorrect ? t("test.markedCorrect") : t("test.markedIncorrect")}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
