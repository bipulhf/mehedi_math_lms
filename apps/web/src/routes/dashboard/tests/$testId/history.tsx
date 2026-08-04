import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssessmentTestDetail, SubmissionSummary } from "@/lib/api/tests";
import { getTestDetail, listMyTestSubmissions } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/tests/$testId/history")({
  head: () =>
    seo({
      description: "Every attempt you've made on this test.",
      path: "/dashboard/tests",
      title: "Attempt History"
    }),
  component: TestHistoryPage,
  errorComponent: RouteErrorView
} as never);

function TestHistoryPage(): JSX.Element {
  const t = useT();
  const { testId } = Route.useParams();

  const [testQuery, submissionsQuery] = useQueries({
    queries: [
      {
        queryFn: async () => getTestDetail(testId),
        queryKey: queryKeys.tests.detail(testId)
      },
      {
        queryFn: async () => listMyTestSubmissions(testId),
        queryKey: queryKeys.tests.myAttempts(testId)
      }
    ]
  });
  const test: AssessmentTestDetail | null = testQuery?.data ?? null;
  const submissions: readonly SubmissionSummary[] = submissionsQuery?.data ?? [];
  const isLoading = Boolean(testQuery?.isPending) || Boolean(submissionsQuery?.isPending);

  if (isLoading || !test) {
    return <DataTableSkeleton columns={4} rows={4} />;
  }

  return (
    <div className="space-y-4">
      <BackButton params={{ testId }} to="/dashboard/tests/$testId" />
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>{t("test.historyLead")}</CardDescription>
        </CardHeader>
      </Card>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm leading-6 text-ink/70">
            {t("test.historyEmpty")}
          </CardContent>
        </Card>
      ) : null}

      {submissions.map((submission) => (
        <Card key={submission.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="space-y-2">
              <p className="font-semibold text-ink">
                {t("test.attemptLabel", { number: String(submission.attemptNumber) })}
              </p>
              <p className="text-sm text-ink/62">
                {new Date(submission.createdAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{submission.status}</Badge>
                <Badge tone="neutral">
                  {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
                </Badge>
                {submission.passed !== null ? (
                  <Badge tone={submission.passed ? "neutral" : "attention"}>
                    {submission.passed ? t("test.passed") : t("test.failed")}
                  </Badge>
                ) : null}
              </div>
            </div>
            <Button asChild variant="outline">
              <Link
                to="/dashboard/tests/$testId/results/$submissionId"
                params={{ submissionId: submission.id, testId }}
              >
                {t("test.viewResult")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
