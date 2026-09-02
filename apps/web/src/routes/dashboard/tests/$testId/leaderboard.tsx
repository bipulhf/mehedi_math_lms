import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssessmentTestDetail, LeaderboardEntry } from "@/lib/api/tests";
import { getTestDetail, getTestLeaderboard } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/tests/$testId/leaderboard")({
  head: () =>
    seo({
      description: "How this MCQ exam went, best attempt per student.",
      path: "/dashboard/tests",
      title: "Leaderboard"
    }),
  component: TestLeaderboardPage,
  errorComponent: RouteErrorView
} as never);

/**
 * The same page for a student and a teacher. Neither gets a column the other
 * does not: a board that showed one of them a different order would not be
 * describing the same exam.
 */
function TestLeaderboardPage(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { testId } = Route.useParams();

  const [testQuery, boardQuery] = useQueries({
    queries: [
      {
        queryFn: async () => getTestDetail(testId),
        queryKey: queryKeys.tests.detail(testId)
      },
      {
        queryFn: async () => getTestLeaderboard(testId),
        queryKey: queryKeys.tests.leaderboard(testId)
      }
    ]
  });
  const test: AssessmentTestDetail | null = testQuery?.data ?? null;
  const entries: readonly LeaderboardEntry[] = boardQuery?.data ?? [];
  const isLoading = Boolean(testQuery?.isPending) || Boolean(boardQuery?.isPending);

  if (isLoading || !test) {
    return <DataTableSkeleton columns={4} rows={6} />;
  }

  return (
    <div className="space-y-4">
      <BackButton params={{ testId }} to="/dashboard/tests/$testId" />
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>{t("leaderboard.lead")}</CardDescription>
        </CardHeader>
      </Card>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm leading-6 text-ink/70">
            {t("leaderboard.empty")}
          </CardContent>
        </Card>
      ) : null}

      {entries.map((entry) => (
        <Card
          className={cn(entry.isCurrentUser && "border-accent")}
          key={entry.submissionId}
        >
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="w-10 shrink-0 text-2xl font-medium tabular-nums text-ink">
                {format.number(entry.rank)}
              </span>
              <div className="min-w-0 space-y-2">
                <p className="truncate font-semibold text-ink">
                  {entry.user.name}
                  {entry.isCurrentUser ? (
                    <span className="ml-2 text-sm font-light text-muted">
                      ({t("leaderboard.you")})
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">
                    {format.number(entry.score)}/{format.number(entry.maxScore ?? test.totalMarks)}
                  </Badge>
                  <Badge tone="neutral">
                    {entry.durationMs === null
                      ? t("leaderboard.noTime")
                      : t("leaderboard.minutes", {
                          count: format.number(Math.max(1, Math.round(entry.durationMs / 60000)))
                        })}
                  </Badge>
                  {entry.attempts > 1 ? (
                    <Badge tone="neutral">
                      {t("leaderboard.attemptsLabel", { count: format.number(entry.attempts) })}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            {entry.submittedAt ? (
              <p className="text-sm text-ink/62">{format.date(entry.submittedAt)}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
