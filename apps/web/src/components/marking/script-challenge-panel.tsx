import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type ScriptChallenge,
  listScriptChallenges,
  raiseScriptChallenge
} from "@/lib/api/script-challenges";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/** The floor `raiseScriptChallengeSchema` enforces; shown so it is not a surprise. */
const reasonMinLength = 20;
const reasonMaxLength = 2000;

interface ScriptChallengePanelProps {
  /** False on a paper whose marking is not final, where there is nothing to dispute. */
  canRaise: boolean;
  submissionId: string;
}

/**
 * A student's view of the second look they asked for.
 *
 * Shows the live challenge if there is one, the history if there is not, and
 * the form only while both are absent and the paper is markable — the API
 * refuses a second live challenge, and a button that always fails is worse
 * than no button.
 */
export function ScriptChallengePanel({
  canRaise,
  submissionId
}: ScriptChallengePanelProps): JSX.Element | null {
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: challenges = [], isPending } = useQuery<readonly ScriptChallenge[]>({
    queryFn: async () => listScriptChallenges(submissionId),
    queryKey: queryKeys.challenges.submission(submissionId)
  });

  if (isPending) {
    return null;
  }

  const latest = challenges[0] ?? null;
  const hasOpenChallenge = latest?.status === "OPEN";

  const handleRaise = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (reason.trim().length < reasonMinLength) {
      toast.error(t("challenge.reasonTooShort", { min: String(reasonMinLength) }));

      return;
    }

    setIsSubmitting(true);

    try {
      await raiseScriptChallenge(submissionId, { reason: reason.trim() });
      toast.success(t("challenge.raised"));
      setReason("");
      // The paper goes back to SUBMITTED, so its own card is stale too.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.challenges.submission(submissionId)
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tests.submission(submissionId) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Scale aria-hidden="true" className="size-4 text-accent" />
          <CardTitle className="text-lg">{t("challenge.title")}</CardTitle>
          {latest ? (
            <Badge tone="quiet">
              {latest.status === "OPEN" ? t("challenge.statusOpen") : t("challenge.statusResolved")}
            </Badge>
          ) : null}
        </div>
        <CardDescription>{t("challenge.lead")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {challenges.map((challenge) => (
          <div className="space-y-2 border-l-2 border-hairline pl-4" key={challenge.id}>
            <p className="text-xs text-ink/55">
              {t("challenge.raisedOn", { when: format.date(challenge.createdAt) })} ·{" "}
              {t("challenge.withTeacher", { name: challenge.assignedTeacher.name })}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-ink/80">{challenge.reason}</p>

            {challenge.status === "OPEN" ? (
              <p className="text-sm text-muted-light">{t("challenge.awaitingReview")}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink">
                  {challenge.scoreAfterReview === challenge.scoreAtChallenge
                    ? t("challenge.scoreUnchanged", {
                        score: String(challenge.scoreAfterReview ?? 0)
                      })
                    : t("challenge.scoreChanged", {
                        after: String(challenge.scoreAfterReview ?? 0),
                        before: String(challenge.scoreAtChallenge ?? 0)
                      })}
                </p>
                {challenge.response ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-ink/70">
                    {challenge.response}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ))}

        {canRaise && !hasOpenChallenge ? (
          <form className="space-y-3 border-t border-hairline pt-5" onSubmit={(event) => void handleRaise(event)}>
            <div className="space-y-2">
              <Label htmlFor="challenge-reason">{t("challenge.reason")}</Label>
              <Textarea
                id="challenge-reason"
                maxLength={reasonMaxLength}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("challenge.reasonPlaceholder")}
                rows={4}
                value={reason}
              />
              <p className="text-xs text-muted-light">{t("challenge.reasonHint")}</p>
            </div>
            <Button disabled={isSubmitting} type="submit" variant="outline">
              {isSubmitting ? t("challenge.raising") : t("challenge.raise")}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
