import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import type { TestType } from "@/lib/api/tests";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The way onto an MCQ test's board, from wherever the reader already is.
 *
 * Rendered as nothing for a written test rather than as a disabled control:
 * the API refuses a board for one, and offering a button that can only fail is
 * worse than not offering it.
 */
export function LeaderboardLink({
  testId,
  type
}: {
  testId: string;
  type: TestType;
}): JSX.Element | null {
  const t = useT();

  if (type !== "MCQ") {
    return null;
  }

  return (
    <Button asChild variant="outline">
      <Link params={{ testId }} to="/dashboard/tests/$testId/leaderboard">
        {t("leaderboard.title")}
      </Link>
    </Button>
  );
}
