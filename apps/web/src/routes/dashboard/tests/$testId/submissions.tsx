import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssessmentTestDetail, SubmissionSummary } from "@/lib/api/tests";
import { getTestDetail, listTestSubmissions } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";

export const Route = createFileRoute("/dashboard/tests/$testId/submissions")({
  component: TestSubmissionsPage,
  errorComponent: RouteErrorView
} as never);

function TestSubmissionsPage(): JSX.Element {
  const { testId } = Route.useParams();
  const [testQuery, submissionsQuery] = useQueries({
    queries: [
      {
        queryFn: async () => getTestDetail(testId),
        queryKey: queryKeys.tests.detail(testId)
      },
      {
        queryFn: async () => listTestSubmissions(testId),
        queryKey: queryKeys.tests.submissions(testId)
      }
    ]
  });
  const test: AssessmentTestDetail | null = testQuery?.data ?? null;
  const submissions: readonly SubmissionSummary[] = submissionsQuery?.data ?? [];
  const isLoading = Boolean(testQuery?.isPending) || Boolean(submissionsQuery?.isPending);

  if (isLoading || !test) {
    return (
      <DataTableSkeleton columns={4} rows={6} />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>Review student submissions and complete written grading.</CardDescription>
        </CardHeader>
      </Card>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm leading-6 text-on-surface/70">
            No submissions have arrived for this assessment yet.
          </CardContent>
        </Card>
      ) : null}

      {submissions.map((submission) => (
        <Card key={submission.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="space-y-2">
              <p className="font-semibold text-on-surface">{submission.user.name}</p>
              <p className="text-sm text-on-surface/62">{submission.user.email}</p>
              <div className="flex flex-wrap gap-2">
                <Badge tone="violet">{submission.status}</Badge>
                <Badge tone="blue">
                  {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link
                to="/dashboard/tests/$testId/submissions/$submissionId"
                params={{ submissionId: submission.id, testId }}
              >
                Open grading view
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
