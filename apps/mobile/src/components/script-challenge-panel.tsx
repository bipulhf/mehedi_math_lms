import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JSX } from "react";
import { useState } from "react";
import { View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { listScriptChallenges, raiseScriptChallenge } from "@/src/lib/api/challenges";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/** The floor `raiseScriptChallengeSchema` enforces; shown so it is not a surprise. */
const REASON_MIN_LENGTH = 20;
const REASON_MAX_LENGTH = 2000;

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
}: {
  /** False on a paper whose marking is not final, where there is nothing to dispute. */
  canRaise: boolean;
  submissionId: string;
}): JSX.Element | null {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: challenges, isPending } = useQuery({
    queryFn: () => listScriptChallenges(submissionId),
    queryKey: queryKeys.submissionChallenges(submissionId)
  });

  const raise = useMutation({
    mutationFn: async () => raiseScriptChallenge(submissionId, { reason: reason.trim() }),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: async () => {
      setReason("");
      setError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.submissionChallenges(submissionId)
      });
      // The paper goes back to SUBMITTED, so its own card is stale too.
      await queryClient.invalidateQueries({ queryKey: queryKeys.testSubmission(submissionId) });
    }
  });

  if (isPending) {
    // A marker who cannot raise one is shown nothing until it is known there is
    // a challenge to read, rather than a skeleton mid-workspace for a card that
    // will usually turn out to be absent.
    return canRaise ? (
      <Card style={{ gap: spacing.sm }}>
        <SkeletonBlock height={20} width="55%" />
        <SkeletonBlock height={60} />
      </Card>
    ) : null;
  }

  const raised = challenges ?? [];
  const latest = raised[0] ?? null;
  const hasOpenChallenge = latest?.status === "OPEN";

  // Nothing raised and nothing to raise: the reader is the marker, and an empty
  // card headed "Challenge the marking" on a paper nobody disputed is noise in
  // the middle of the grading workspace.
  if (!canRaise && raised.length === 0) {
    return null;
  }

  const submit = (): void => {
    if (reason.trim().length < REASON_MIN_LENGTH) {
      setError(t("challenge.reasonTooShort", { min: REASON_MIN_LENGTH }));

      return;
    }

    raise.mutate();
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <Title>{t("challenge.title")}</Title>
        {latest ? (
          <Badge tone={latest.status === "OPEN" ? "attention" : "success"}>
            {latest.status === "OPEN" ? t("challenge.statusOpen") : t("challenge.statusResolved")}
          </Badge>
        ) : null}
      </View>
      <Body muted>{t("challenge.lead")}</Body>

      {error ? <ErrorNotice message={error} /> : null}

      {raised.map((challenge) => (
        <View key={challenge.id} style={styles.entry}>
          <Caption tone="faint">
            {t("challenge.raisedOn", { when: format.date(challenge.createdAt) })} ·{" "}
            {t("challenge.withTeacher", { name: challenge.assignedTeacher.name })}
          </Caption>
          <Body muted>{challenge.reason}</Body>

          {challenge.status === "OPEN" ? (
            <Caption>{t("challenge.awaitingReview")}</Caption>
          ) : (
            <>
              <Body>
                {challenge.scoreAfterReview === challenge.scoreAtChallenge
                  ? t("challenge.scoreUnchanged", { score: challenge.scoreAfterReview ?? 0 })
                  : t("challenge.scoreChanged", {
                      after: challenge.scoreAfterReview ?? 0,
                      before: challenge.scoreAtChallenge ?? 0
                    })}
              </Body>
              {challenge.response ? <Body muted>{challenge.response}</Body> : null}
            </>
          )}
        </View>
      ))}

      {canRaise && !hasOpenChallenge ? (
        <View style={styles.form}>
          <Field
            label={t("challenge.reason")}
            maxLength={REASON_MAX_LENGTH}
            multiline
            onChangeText={setReason}
            placeholder={t("challenge.reasonPlaceholder")}
            style={styles.multiline}
            value={reason}
          />
          <Caption tone="faint">{t("challenge.reasonHint")}</Caption>
          <Button
            icon="flag"
            isBusy={raise.isPending}
            label={raise.isPending ? t("challenge.raising") : t("challenge.raise")}
            onPress={submit}
            stretch
            variant="outline"
          />
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  entry: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.md
  },
  form: {
    borderTopColor: colors.separator,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.lg
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" }
}));
