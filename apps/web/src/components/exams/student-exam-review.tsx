import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { McqAnswerReview } from "@/components/exams/mcq-answer-review";
import { WrittenAnswerReview } from "@/components/exams/written-answer-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssessmentTestDetail } from "@/lib/api/tests";
import { getSubmissionDetail, getTestDetail, listMyTestSubmissions } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * A student's own read of one exam: their attempts, and what each one came to.
 *
 * Read-only by construction — the API hides marks and Marking until the paper
 * is graded, so an attempt still with a teacher shows as being marked rather
 * than as a zero.
 */
export function StudentExamReview({ testId }: { testId: string }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [testQuery, attemptsQuery] = useQueries({
    queries: [
      {
        // `revealAnswers` only lands once an attempt is finished; the API
        // decides, and returns nulls where it will not say.
        queryFn: async () => getTestDetail(testId, true),
        queryKey: queryKeys.tests.detailWithAnswers(testId)
      },
      {
        queryFn: async () => listMyTestSubmissions(testId),
        queryKey: queryKeys.tests.myAttempts(testId)
      }
    ]
  });
  const test: AssessmentTestDetail | null = testQuery?.data ?? null;
  const attempts = attemptsQuery?.data ?? [];

  useEffect(() => {
    if (selectedSubmissionId === null && attempts.length > 0) {
      const graded = [...attempts]
        .reverse()
        .find((attempt) => attempt.status === "GRADED");

      setSelectedSubmissionId((graded ?? attempts[attempts.length - 1]!).id);
    }
  }, [attempts, selectedSubmissionId]);

  const { data: submission } = useQuery({
    enabled: selectedSubmissionId !== null,
    queryFn: async () => getSubmissionDetail(selectedSubmissionId!),
    queryKey: queryKeys.tests.submission(selectedSubmissionId ?? "")
  });

  if (testQuery?.isPending || attemptsQuery?.isPending || !test) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="font-medium text-ink">{test.title}</p>
            <p className="text-sm font-light text-muted">
              {test.type === "WRITTEN" ? t("author.examKindWritten") : t("author.examKindMcq")} ·{" "}
              {format.number(test.questions.length)} {t("ab.questions")} ·{" "}
              {format.number(test.totalMarks)} {t("qe.marks")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild>
              <Link params={{ testId }} to="/dashboard/tests/$testId">
                {t("exams.openExam")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/exams">{t("exams.backToExams")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {attempts.length === 0 ? (
        <EmptyState message={t("exams.notAttempted")} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.28fr_0.72fr]">
          <Card>
            <CardContent className="space-y-2 p-4">
              {attempts.map((attempt) => (
                <button
                  className={`w-full border px-3 py-2 text-left transition-colors ${
                    attempt.id === selectedSubmissionId
                      ? "border-accent bg-accent/8"
                      : "border-hairline bg-panel-warm hover:border-line-strong"
                  }`}
                  key={attempt.id}
                  onClick={() => setSelectedSubmissionId(attempt.id)}
                  type="button"
                >
                  <span className="block text-sm font-medium text-ink">
                    {t("exams.attempt", { number: format.number(attempt.attemptNumber) })}
                  </span>
                  <span className="mt-1 block">
                    <Badge tone={attempt.status === "GRADED" ? "neutral" : "attention"}>
                      {attempt.status === "GRADED"
                        ? `${format.number(attempt.score ?? 0)}/${format.number(attempt.maxScore ?? test.totalMarks)}`
                        : t("exams.awaitingMarking")}
                    </Badge>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {submission === undefined ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted">
                  {t("exams.pickStudent")}
                </CardContent>
              </Card>
            ) : (
              <>
                {submission.feedback ? (
                  <Card>
                    <CardContent className="space-y-2 p-5">
                      <p className="label-mono text-xs uppercase text-muted-faint">
                        {t("grade.feedback")}
                      </p>
                      <RichTextContent html={submission.feedback} />
                    </CardContent>
                  </Card>
                ) : null}
                {test.type === "WRITTEN" ? (
                  <WrittenAnswerReview submission={submission} test={test} />
                ) : (
                  <McqAnswerReview submission={submission} test={test} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
