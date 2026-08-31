import { useQueries } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useMemo } from "react";

import { TestTakingSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { MarkingLayer } from "@/components/marking/marking-layer";
import { ScriptChallengePanel } from "@/components/marking/script-challenge-panel";
import { MathText } from "@/components/ui/math-text";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { AssessmentTestDetail, SubmissionDetail } from "@/lib/api/tests";
import { getSubmissionDetail, getTestDetail } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/tests/$testId/submissions/$submissionId")({
  head: () =>
    seo({
      description: "Review one student's submitted paper.",
      path: "/dashboard/tests",
      title: "Submission"
    }),
  component: SubmissionReviewPage,
  errorComponent: RouteErrorView
} as never);

/**
 * A teacher's read of one submitted paper — the answers as they stand, with any
 * Marking already on them. Marking itself happens in the marking workspace,
 * which claims each answer as it is opened; this page never writes.
 */
function SubmissionReviewPage(): JSX.Element {
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

  const answerMap = useMemo(
    () => new Map(submission?.answers.map((answer) => [answer.questionId, answer]) ?? []),
    [submission?.answers]
  );

  if (isLoading || !test || !submission) {
    return <TestTakingSkeleton />;
  }

  return (
    <div className="space-y-4">
      <BackButton params={{ testId }} to="/dashboard/tests/$testId/submissions" />
      <Card>
        <CardHeader>
          <CardTitle>{submission.user.name}</CardTitle>
          <CardDescription>
            {test.title} · {t("test.attemptLabel", { number: String(submission.attemptNumber) })} ·{" "}
            {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
          </CardDescription>
          {test.type === "WRITTEN" && submission.status === "SUBMITTED" ? (
            <div>
              <Button asChild size="sm">
                <Link params={{ testId }} to="/dashboard/tests/$testId/marking">
                  {t("marking.openPaper")}
                </Link>
              </Button>
            </div>
          ) : null}
        </CardHeader>
      </Card>

      {test.type === "WRITTEN" ? (
        <ScriptChallengePanel canRaise={false} submissionId={submissionId} />
      ) : null}

      {test.questions.map((question, index) => {
        const answer = answerMap.get(question.id);
        const selectedOption = question.options.find(
          (option) => option.id === answer?.selectedOptionId
        );

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                <span>Q{index + 1}. </span>
                <RichTextContent
                  className="inline align-baseline [&_p]:mb-0 [&_p]:inline"
                  html={question.questionText}
                />
              </CardTitle>
              <CardDescription>
                {answer?.awardedMarks ?? 0} / {question.marks}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {test.type === "MCQ" ? (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-6 text-ink">
                  {selectedOption ? (
                    <MathText text={selectedOption.optionText} />
                  ) : (
                    t("script.notAttempted")
                  )}
                </div>
              ) : (answer?.scriptPages.length ?? 0) === 0 ? (
                <p className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm text-ink/62">
                  {t("script.notAttempted")}
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
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
              {question.markingGuide ? (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-6 text-ink">
                  <span className="font-medium">{t("marking.guide")}: </span>
                  <RichTextContent
                    className="inline text-sm leading-6 text-ink [&_p]:mb-0 [&_p]:inline"
                    html={question.markingGuide}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      {submission.feedback ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("grade.feedback")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextContent html={submission.feedback} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
