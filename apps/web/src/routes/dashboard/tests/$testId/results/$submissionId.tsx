import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { TestTakingSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { MarkingLayer } from "@/components/marking/marking-layer";
import { ScriptChallengePanel } from "@/components/marking/script-challenge-panel";
import { MathText } from "@/components/ui/math-text";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
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
  const maxScore = submission.maxScore ?? test.totalMarks;
  const percentage = maxScore > 0 ? Math.round(((submission.score ?? 0) / maxScore) * 100) : 0;
  const isGraded = submission.status === "GRADED";
  const headline = !isGraded
    ? t("test.awaitingGrading")
    : submission.passed
      ? t("test.passed")
      : t("test.failed");

  return (
    <div className="space-y-6">
      <BackButton params={{ testId }} to="/dashboard/tests/$testId/history" />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="quiet">
              {t("test.attemptLabel", { number: String(submission.attemptNumber) })}
            </Badge>
            <Badge tone="quiet">{submission.status}</Badge>
          </div>
          <CardTitle className="text-2xl">{test.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className={`font-display text-3xl font-semibold tracking-[-0.02em] ${
                  isGraded && submission.passed === false ? "text-error" : "text-ink"
                }`}
              >
                {headline}
              </p>
              <p className="mt-1 text-sm text-ink/62">
                {t("test.score", { max: maxScore, score: submission.score ?? 0 })}
              </p>
            </div>
            <Link
              className="text-sm text-ink/62 underline-offset-4 hover:text-ink hover:underline"
              params={{ testId }}
              to="/dashboard/tests/$testId/history"
            >
              {t("test.viewHistory")}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-ink/52">{t("test.scoreLabel")}</p>
              <p className="mt-2 text-xl font-semibold text-ink">{percentage}%</p>
            </div>
            {test.passingScore !== null ? (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                  {t("player.passing")}
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">{test.passingScore}</p>
              </div>
            ) : null}
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-paper px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-ink/52">
                {t("ab.questions")}
              </p>
              <p className="mt-2 text-xl font-semibold text-ink">{test.questions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {test.type === "WRITTEN" ? (
        <ScriptChallengePanel canRaise={isGraded} submissionId={submissionId} />
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/55">
          {t("test.questionReview")}
        </h2>

        {test.questions.map((question, index) => {
          const answer = answerMap.get(question.id);

          return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {t("test.question", { number: String(index + 1) })}
                  </CardTitle>
                  {answer?.isCorrect !== null && answer?.isCorrect !== undefined ? (
                    <span
                      className={`inline-flex items-center rounded-[var(--radius-pill)] border px-3 py-1 text-sm ${
                        answer.isCorrect
                          ? "border-correct text-correct"
                          : "border-error text-error"
                      }`}
                    >
                      {answer.isCorrect ? t("test.markedCorrect") : t("test.markedIncorrect")}
                    </span>
                  ) : (
                    <span className="text-xs text-ink/55">
                      {t("test.awardedMarks", { count: String(answer?.awardedMarks ?? 0) })} /{" "}
                      {question.marks}
                    </span>
                  )}
                </div>
                <CardDescription>
                  <RichTextContent html={question.questionText} />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {test.type === "MCQ" ? (
                  <div className="grid gap-2">
                    {question.options.map((option) => {
                      const isSelected = option.id === answer?.selectedOptionId;
                      const isCorrectOption = option.isCorrect === true;
                      const isWrongPick = isSelected && !isCorrectOption;

                      return (
                        <div
                          key={option.id}
                          className={`flex flex-wrap items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] border px-4 py-3 text-sm text-ink ${
                            isCorrectOption
                              ? "border-correct bg-correct/8"
                              : isWrongPick
                                ? "border-error bg-error/8"
                                : "border-hairline bg-panel-warm"
                          }`}
                        >
                          <MathText text={option.optionText} />
                          <div className="flex flex-wrap gap-2">
                            {isSelected ? (
                              <span
                                className={`inline-flex items-center rounded-[var(--radius-pill)] border px-3 py-1 text-sm ${
                                  isCorrectOption
                                    ? "border-correct text-correct"
                                    : "border-error text-error"
                                }`}
                              >
                                {t("test.yourAnswer")}
                              </span>
                            ) : null}
                            {isCorrectOption ? (
                              <span className="inline-flex items-center rounded-[var(--radius-pill)] border border-correct px-3 py-1 text-sm text-correct">
                                {t("test.correctAnswer")}
                              </span>
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
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/55">
                        {t("test.yourAnswer")}
                      </p>
                      {(answer?.scriptPages.length ?? 0) === 0 ? (
                        <p className="mt-2 rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm text-ink/62">
                          {t("test.noAnswer")}
                        </p>
                      ) : (
                        <div className="mt-2 grid gap-3 md:grid-cols-2">
                          {answer?.scriptPages.map((page) => (
                            <MarkingLayer
                              key={page.id}
                              color="RED"
                              marking={page.marking}
                              pageHeight={page.height ?? 0}
                              pageUrl={page.fileUrl}
                              pageWidth={page.width ?? 0}
                              penWidth="MEDIUM"
                              tool="PEN"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-ink/70">
                      {t("test.awardedMarks", { count: String(answer?.awardedMarks ?? 0) })}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
