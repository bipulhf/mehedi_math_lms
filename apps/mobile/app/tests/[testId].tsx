import { MathBody } from "@/src/components/math/math-body";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AnswerScriptUploader } from "@/src/components/answer-script-uploader";
import { HtmlContent } from "@/src/components/html-content";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import {
  getTestDetail,
  listMySubmissions,
  saveSubmissionAnswers,
  type ScriptPageView,
  startSubmission,
  type SubmissionDetail,
  submitTest
} from "@/src/lib/api/tests";
import { useT } from "@/src/lib/locale";
import { useSession } from "@/src/lib/use-session";
import { queryKeys } from "@/src/lib/query";
import { colors, radius, spacing } from "@/src/theme/tokens";

interface DraftAnswer {
  selectedOptionId?: string | undefined;
}

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function TestScreen(): JSX.Element {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const router = useRouter();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const isStaff = session?.session.role === "TEACHER" || session?.session.role === "ADMIN";
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, DraftAnswer>>({});
  const [pagesByQuestionId, setPagesByQuestionId] = useState<
    Record<string, readonly ScriptPageView[]>
  >({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRetaking, setIsRetaking] = useState(false);
  const [isStartingSubmission, setIsStartingSubmission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Answers are hydrated from the server exactly once, after `startSubmission`
  // resolves. Until then the autosave must not fire on an empty draft.
  const isHydratingAnswersRef = useRef(true);
  const startedForRef = useRef<string | null>(null);

  const { data: test, isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: async () => getTestDetail(testId),
    queryKey: queryKeys.test(testId)
  });
  /**
   * What this student has already done with this exam, newest first.
   *
   * Read before anything is started, because starting is a write: coming back
   * out of the results screen lands here again, and without this the screen
   * silently opened a fresh attempt — or, on a one-attempt exam, showed the raw
   * refusal from the server.
   */
  const { data: attempts, isPending: isLoadingAttempts } = useQuery({
    enabled: Boolean(session),
    queryFn: async () => listMySubmissions(testId),
    queryKey: queryKeys.myTestSubmissions(testId),
    // Never from cache: landing here decides whether to write an attempt, and a
    // minute-old "no attempts yet" is exactly what a back gesture hands over a
    // second after a paper was submitted.
    refetchOnMount: "always" as const,
    staleTime: 0
  });

  const latestAttempt = attempts?.[0] ?? null;
  /** An attempt that is over. A `STARTED` one is resumed, not re-opened. */
  const finishedAttempt =
    latestAttempt !== null && latestAttempt.status !== "STARTED" ? latestAttempt : null;
  const isShowingFinishedAttempt = finishedAttempt !== null && !isRetaking;

  useEffect(() => {
    if (isLoadingAttempts) {
      return;
    }

    if (isShowingFinishedAttempt) {
      setIsStartingSubmission(false);

      return;
    }

    // Resuming and retaking are two different starts, so the guard is keyed on
    // which one this is rather than on the test alone.
    const startKey = `${testId}:${isRetaking ? "retake" : "open"}`;

    if (startedForRef.current === startKey) {
      return;
    }

    startedForRef.current = startKey;
    setIsStartingSubmission(true);

    void (async () => {
      try {
        const started = await startSubmission(testId);

        setSubmission(started);
        setDraftAnswers(
          Object.fromEntries(
            started.answers.map((answer) => [
              answer.questionId,
              { selectedOptionId: answer.selectedOptionId ?? undefined }
            ])
          )
        );
        setPagesByQuestionId(
          Object.fromEntries(
            started.answers.map((answer) => [answer.questionId, answer.scriptPages])
          )
        );
        isHydratingAnswersRef.current = true;
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Could not start this test");
      } finally {
        setIsStartingSubmission(false);
      }
    })();
  }, [isLoadingAttempts, isRetaking, isShowingFinishedAttempt, testId]);

  useEffect(() => {
    if (!test?.durationInMinutes || !submission?.startedAt) {
      setTimeRemainingSeconds(null);
      return;
    }

    const deadline = new Date(submission.startedAt).getTime() + test.durationInMinutes * 60_000;

    const tick = (): void => {
      setTimeRemainingSeconds(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    };

    tick();

    const interval = setInterval(tick, 1_000);

    return () => {
      clearInterval(interval);
    };
  }, [submission?.startedAt, test?.durationInMinutes]);

  // Debounced autosave: one effect, one 800ms timer per change, nothing saved
  // while the freshly-loaded answers are being written into the draft.
  // A written paper has nothing to autosave: its pages upload as they are
  // photographed, and there are no selections to keep.
  useEffect(() => {
    if (!submission || test?.type === "WRITTEN" || isHydratingAnswersRef.current) {
      isHydratingAnswersRef.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      const save = async (): Promise<void> => {
        try {
          await saveSubmissionAnswers(submission.id, {
            answers: Object.entries(draftAnswers).map(([questionId, draft]) => ({
              questionId,
              selectedOptionId: draft.selectedOptionId
            }))
          });
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : "Could not save your answers");
        }
      };

      void save();
    }, 800);

    return () => {
      clearTimeout(timeout);
    };
  }, [draftAnswers, submission, test?.type]);

  useEffect(() => {
    if (timeRemainingSeconds !== 0 || isSubmitting || !submission || !test) {
      return;
    }

    void handleSubmit();
  }, [isSubmitting, submission, test, timeRemainingSeconds]);

  const currentQuestion = useMemo(
    () => test?.questions[currentQuestionIndex] ?? null,
    [currentQuestionIndex, test]
  );

  const isAnswered = (questionId: string): boolean =>
    test?.type === "WRITTEN"
      ? (pagesByQuestionId[questionId]?.length ?? 0) > 0
      : draftAnswers[questionId]?.selectedOptionId !== undefined;

  const answeredCount = useMemo(
    () => test?.questions.filter((question) => isAnswered(question.id)).length ?? 0,
    [draftAnswers, pagesByQuestionId, test]
  );

  const handleSubmit = async (): Promise<void> => {
    if (!test) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitTest(test.id, {
        answers:
          test.type === "WRITTEN"
            ? []
            : Object.entries(draftAnswers).map(([questionId, draft]) => ({
                questionId,
                selectedOptionId: draft.selectedOptionId
              }))
      });

      // `replace`, not `push`: back from the results must not land on a
      // submitted attempt.
      router.replace({
        params: { submissionId: result.id, testId: test.id },
        pathname: "/tests/[testId]/results/[submissionId]"
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit this test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSubmit = (): void => {
    Alert.alert(
      t("test.confirmSubmitTitle"),
      t("test.confirmSubmitDescription", {
        answered: answeredCount,
        total: test?.questions.length ?? 0
      }),
      [
        { style: "cancel", text: t("common.cancel") },
        {
          onPress: () => void handleSubmit(),
          style: "default",
          text: t("test.confirmSubmitAction")
        }
      ]
    );
  };

  const isLoading = isPending || isLoadingAttempts || isStartingSubmission;

  if (isSessionPending) {
    return <ScreenSkeleton rows={3} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (isShowingFinishedAttempt && finishedAttempt !== null && !isLoading) {
    const canRetake = !test || test.attemptsRemaining === null || test.attemptsRemaining > 0;

    return (
      <Screen>
        <Stack.Screen options={{ title: test?.title ?? t("test.alreadySubmitted") }} />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={{ gap: spacing.md }}>
            <Title>{test?.title ?? t("test.alreadySubmitted")}</Title>
            <Body muted>{t("test.alreadySubmittedLead")}</Body>
            <Button
              label={t("test.seeResult")}
              onPress={() =>
                router.push({
                  params: { submissionId: finishedAttempt.id, testId },
                  pathname: "/tests/[testId]/results/[submissionId]"
                })
              }
            />
            {canRetake ? (
              <Button
                label={t("test.takeAgain")}
                onPress={() => setIsRetaking(true)}
                variant="outline"
              />
            ) : null}
            {test?.type === "MCQ" ? (
              <Button
                label={t("leaderboard.title")}
                onPress={() =>
                  router.push({ params: { testId }, pathname: "/tests/[testId]/leaderboard" })
                }
                variant="outline"
              />
            ) : null}
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (error && !submission) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <ErrorNotice message={error} />
        </ScrollView>
      </Screen>
    );
  }

  if (isLoading || !test || !submission || !currentQuestion) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={26} width="60%" />
          <SkeletonBlock height={90} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={120} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: test.title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: spacing.md }}>
          <Title>{test.title}</Title>
          {isStaff && test.type === "WRITTEN" ? (
            <Button
              label={t("marking.openPaper")}
              onPress={() =>
                router.push({ params: { testId: test.id }, pathname: "/tests/[testId]/marking" })
              }
              variant="outline"
            />
          ) : null}
          {test.type === "MCQ" ? (
            <Button
              label={t("leaderboard.title")}
              onPress={() =>
                router.push({
                  params: { testId: test.id },
                  pathname: "/tests/[testId]/leaderboard"
                })
              }
              variant="outline"
            />
          ) : null}
          <View style={styles.badgeRow}>
            <Badge>
              {t("test.answered", { count: answeredCount, total: test.questions.length })}
            </Badge>
            {test.maxAttempts !== null ? (
              <Badge>
                {t("test.attemptIndicator", {
                  current: (test.attemptsUsed ?? 0) + 1,
                  total: test.maxAttempts
                })}
              </Badge>
            ) : null}
          </View>
          {timeRemainingSeconds !== null ? (
            <View style={styles.timerPanel}>
              <Caption>{t("test.timeRemaining")}</Caption>
              <Body>{formatRemaining(timeRemainingSeconds)}</Body>
            </View>
          ) : null}
          <View style={styles.questionGrid}>
            {test.questions.map((question, index) => {
              const isCurrent = index === currentQuestionIndex;

              return (
                <Pressable
                  accessibilityLabel={t("test.question", { number: index + 1 })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  key={question.id}
                  onPress={() => setCurrentQuestionIndex(index)}
                  style={[styles.questionDot, isCurrent ? styles.questionDotCurrent : null]}
                >
                  <Caption tone={isAnswered(question.id) && !isCurrent ? "muted" : "faint"}>
                    {index + 1}
                  </Caption>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {error ? <ErrorNotice message={error} /> : null}

        <Card style={{ gap: spacing.md }}>
          <View style={styles.metaRow}>
            <Caption>{t("test.question", { number: currentQuestionIndex + 1 })}</Caption>
            <Caption tone="faint">
              {test.type === "WRITTEN" ? t("ab.written") : t("ab.mcq")} · {currentQuestion.marks}
            </Caption>
          </View>
          <HtmlContent html={currentQuestion.questionText} />

          {currentQuestion.images.map((image) => (
            <Image
              accessibilityLabel={t("test.question", { number: currentQuestionIndex + 1 })}
              accessibilityRole="image"
              contentFit="contain"
              key={image.id}
              source={{ uri: image.fileUrl }}
              style={styles.questionImage}
            />
          ))}

          {test.type === "MCQ" ? (
            <>
              {(() => {
                const selectedOptionId = draftAnswers[currentQuestion.id]?.selectedOptionId;
                const isLocked = test.lockAnswerOnSelect && Boolean(selectedOptionId);

                return currentQuestion.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  const isDisabled = isLocked && !isSelected;

                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                      disabled={isDisabled}
                      key={option.id}
                      onPress={() =>
                        setDraftAnswers((current) => ({
                          ...current,
                          [currentQuestion.id]: { selectedOptionId: option.id }
                        }))
                      }
                      style={[
                        styles.option,
                        isSelected ? styles.optionSelected : null,
                        isDisabled ? styles.optionDisabled : null
                      ]}
                    >
                      <MathBody text={option.optionText} />
                    </Pressable>
                  );
                });
              })()}
              {test.lockAnswerOnSelect && draftAnswers[currentQuestion.id]?.selectedOptionId ? (
                <Caption tone="faint">{t("test.optionLocked")}</Caption>
              ) : null}
            </>
          ) : (
            <AnswerScriptUploader
              onPagesChange={(pages) =>
                setPagesByQuestionId((current) => ({ ...current, [currentQuestion.id]: pages }))
              }
              pages={pagesByQuestionId[currentQuestion.id] ?? []}
              questionId={currentQuestion.id}
              submissionId={submission.id}
            />
          )}

          <View style={styles.prevNext}>
            <Button
              disabled={currentQuestionIndex === 0}
              label={t("common.previous")}
              onPress={() => setCurrentQuestionIndex((value) => Math.max(0, value - 1))}
              variant="outline"
            />
            {currentQuestionIndex === test.questions.length - 1 ? (
              <Button
                isBusy={isSubmitting}
                label={isSubmitting ? t("test.submitting") : t("test.confirmSubmitAction")}
                onPress={confirmSubmit}
              />
            ) : (
              <Button
                label={t("common.next")}
                onPress={() =>
                  setCurrentQuestionIndex((value) => Math.min(test.questions.length - 1, value + 1))
                }
              />
            )}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  content: { gap: spacing.md, padding: spacing.lg },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  option: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.lg
  },
  optionDisabled: { opacity: 0.5 },
  optionSelected: { backgroundColor: colors.chipActive, borderColor: colors.accent },
  prevNext: { flexDirection: "row", gap: spacing.md },
  questionDot: {
    alignItems: "center",
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  questionDotCurrent: { backgroundColor: colors.chipActive, borderColor: colors.chipActive },
  questionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  questionImage: { borderRadius: radius.sm, height: 200, width: "100%" },
  timerPanel: {
    backgroundColor: colors.panelWarm,
    gap: spacing.xs,
    padding: spacing.md
  }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
