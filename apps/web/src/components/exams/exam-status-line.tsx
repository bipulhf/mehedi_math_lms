import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";

import { Badge } from "@/components/ui/badge";
import { listMyTestSubmissions, listTestSubmissions } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * Where one exam stands, from the reader's own point of view: how many papers
 * are still waiting for a teacher, or how the student did on their own attempt.
 *
 * Both come from the submissions the caller is already allowed to see, so the
 * line never needs an endpoint of its own.
 */
export function ExamStatusLine({
  isStudent,
  testId
}: {
  isStudent: boolean;
  testId: string;
}): JSX.Element | null {
  const t = useT();
  const format = useFormat();

  const staffSubmissions = useQuery({
    enabled: !isStudent,
    queryFn: async () => listTestSubmissions(testId),
    queryKey: queryKeys.tests.submissions(testId)
  });
  const myAttempts = useQuery({
    enabled: isStudent,
    queryFn: async () => listMyTestSubmissions(testId),
    queryKey: queryKeys.tests.myAttempts(testId)
  });

  if (isStudent) {
    const attempts = myAttempts.data ?? [];

    if (attempts.length === 0) {
      return <Badge tone="attention">{t("exams.notAttempted")}</Badge>;
    }

    // The best graded attempt is the one that counts, and an ungraded one is
    // still with a teacher.
    const graded = attempts.filter((attempt) => attempt.status === "GRADED");

    if (graded.length === 0) {
      return <Badge tone="attention">{t("exams.awaitingMarking")}</Badge>;
    }

    const best = graded.reduce((highest, attempt) =>
      (attempt.score ?? 0) > (highest.score ?? 0) ? attempt : highest
    );

    return (
      <Badge tone="neutral">
        {t("exams.yourScore")}: {format.number(best.score ?? 0)}/{format.number(best.maxScore ?? 0)}
      </Badge>
    );
  }

  const submissions = staffSubmissions.data ?? [];

  if (submissions.length === 0) {
    return <Badge tone="neutral">{t("exams.awaitingSubmissions")}</Badge>;
  }

  const waiting = submissions.filter((submission) => submission.status === "SUBMITTED").length;

  return (
    <>
      <Badge tone="neutral">
        {t("exams.submissionCount", { count: format.number(submissions.length) })}
      </Badge>
      <Badge tone={waiting > 0 ? "attention" : "neutral"}>
        {waiting > 0
          ? t("exams.pendingToMark", { count: format.number(waiting) })
          : t("exams.allMarked")}
      </Badge>
    </>
  );
}
