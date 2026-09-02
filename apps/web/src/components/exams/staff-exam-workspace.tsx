import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { LeaderboardLink } from "@/components/exams/leaderboard-link";
import { McqAnswerReview } from "@/components/exams/mcq-answer-review";
import { WrittenAnswerReview } from "@/components/exams/written-answer-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssessmentTestDetail } from "@/lib/api/tests";
import { getSubmissionDetail, getTestDetail, listTestSubmissions } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * A teacher's read of one exam: who sat it on the left, their paper on the
 * right.
 *
 * MCQ answers are shown against the correct option; a written paper is shown as
 * it was marked, with the way through to the marking workspace where the marks
 * are actually entered.
 */
export function StaffExamWorkspace({ testId }: { testId: string }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [testQuery, submissionsQuery] = useQueries({
    queries: [
      { queryFn: async () => getTestDetail(testId), queryKey: queryKeys.tests.detail(testId) },
      {
        queryFn: async () => listTestSubmissions(testId),
        queryKey: queryKeys.tests.submissions(testId)
      }
    ]
  });
  const test: AssessmentTestDetail | null = testQuery?.data ?? null;
  const submissions = submissionsQuery?.data ?? [];

  useEffect(() => {
    if (selectedSubmissionId === null && submissions.length > 0) {
      setSelectedSubmissionId(submissions[0]!.id);
    }
  }, [selectedSubmissionId, submissions]);

  const { data: submission } = useQuery({
    enabled: selectedSubmissionId !== null,
    queryFn: async () => getSubmissionDetail(selectedSubmissionId!),
    queryKey: queryKeys.tests.submission(selectedSubmissionId ?? "")
  });

  if (testQuery?.isPending || submissionsQuery?.isPending || !test) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const isWritten = test.type === "WRITTEN";
  const waiting = submissions.filter((item) => item.status === "SUBMITTED").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="font-medium text-ink">{test.title}</p>
            <p className="text-sm font-light text-muted">
              {format.number(test.questions.length)} {t("ab.questions")} ·{" "}
              {format.number(test.totalMarks)} {t("qe.marks")}
            </p>
            <Badge tone={isWritten ? "teal" : "indigo"}>
              {isWritten ? t("author.examKindWritten") : t("author.examKindMcq")}
            </Badge>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">
                {t("exams.submissionCount", { count: format.number(submissions.length) })}
              </Badge>
              <Badge tone={waiting > 0 ? "attention" : "neutral"}>
                {waiting > 0
                  ? t("exams.pendingToMark", { count: format.number(waiting) })
                  : t("exams.allMarked")}
              </Badge>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isWritten ? (
              <Button asChild>
                <Link params={{ testId }} to="/dashboard/tests/$testId/marking">
                  {t("exams.markPapers")}
                </Link>
              </Button>
            ) : null}
            <LeaderboardLink testId={testId} type={test.type} />
            <Button asChild variant="outline">
              <Link to="/dashboard/exams">{t("exams.backToExams")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {submissions.length === 0 ? (
        <EmptyState message={t("exams.awaitingSubmissions")} />
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[0.3fr_0.7fr]">
          <Card className="min-w-0">
            <CardContent className="space-y-2 p-4 sm:p-6">
              <p className="label-mono text-xs uppercase text-muted-faint">{t("exams.students")}</p>
              {submissions.map((item) => (
                <button
                  className={`w-full border px-3 py-2 text-left transition-colors ${
                    item.id === selectedSubmissionId
                      ? "border-accent bg-accent/8"
                      : "border-hairline bg-panel-warm hover:border-line-strong"
                  }`}
                  key={item.id}
                  onClick={() => setSelectedSubmissionId(item.id)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-ink">
                      {item.user.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-faint">
                      {item.status === "GRADED"
                        ? `${format.number(item.score ?? 0)}/${format.number(item.maxScore ?? test.totalMarks)}`
                        : t("exams.awaitingMarking")}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-light">
                    {t("exams.attempt", { number: format.number(item.attemptNumber) })} ·{" "}
                    {item.user.email}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="min-w-0">
            {submission === undefined ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted sm:p-6">
                  {t("exams.pickStudent")}
                </CardContent>
              </Card>
            ) : isWritten ? (
              <WrittenAnswerReview submission={submission} test={test} />
            ) : (
              <McqAnswerReview submission={submission} test={test} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
