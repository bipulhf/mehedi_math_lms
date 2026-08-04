import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import {
  getTestDetail,
  saveSubmissionAnswers,
  startSubmission,
  submitTest,
  type SubmissionDetail
} from "@/src/lib/api";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, radius, spacing } from "@/src/theme/tokens";

interface DraftAnswer {
  selectedOptionId?: string | undefined;
  writtenAnswer?: string | undefined;
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
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, DraftAnswer>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isStartingSubmission, setIsStartingSubmission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Answers are hydrated from the server exactly once, after `startSubmission`
  // resolves. Until then the autosave must not fire on an empty draft.
  const isHydratingAnswersRef = useRef(true);

  const { data: test, isPending } = useQuery({
    queryFn: async () => getTestDetail(testId),
    queryKey: queryKeys.test(testId)
  });

  useEffect(() => {
    setIsStartingSubmission(true);

    void (async () => {
      try {
        const started = await startSubmission(testId);

        setSubmission(started);
        setDraftAnswers(
          Object.fromEntries(
            started.answers.map((answer) => [
              answer.questionId,
              {
                selectedOptionId: answer.selectedOptionId ?? undefined,
                writtenAnswer: answer.writtenAnswer ?? undefined
              }
            ])
          )
        );
        isHydratingAnswersRef.current = true;
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Could not start this test");
      } finally {
        setIsStartingSubmission(false);
      }
    })();
  }, [testId]);

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
  useEffect(() => {
    if (!submission || isHydratingAnswersRef.current) {
      isHydratingAnswersRef.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      void saveSubmissionAnswers(submission.id, {
        answers: Object.entries(draftAnswers).map(([questionId, draft]) => ({
          questionId,
          selectedOptionId: draft.selectedOptionId,
          writtenAnswer: draft.writtenAnswer
        }))
      });
    }, 800);

    return () => {
      clearTimeout(timeout);
    };
  }, [draftAnswers, submission]);

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

  const answeredCount = useMemo(
    () =>
      test?.questions.filter((question) => {
        const answer = draftAnswers[question.id];

        return question.type === "MCQ"
          ? Boolean(answer?.selectedOptionId)
          : Boolean(answer?.writtenAnswer?.trim());
      }).length ?? 0,
    [draftAnswers, test]
  );

  const isAnswered = (questionId: string): boolean => {
    const answer = draftAnswers[questionId];

    if (!answer) {
      return false;
    }

    return answer.selectedOptionId !== undefined || Boolean(answer.writtenAnswer?.trim());
  };

  const handleSubmit = async (): Promise<void> => {
    if (!test) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitTest(test.id, {
        answers: Object.entries(draftAnswers).map(([questionId, draft]) => ({
          questionId,
          selectedOptionId: draft.selectedOptionId,
          writtenAnswer: draft.writtenAnswer
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
    Alert.alert(t("test.confirmSubmitTitle"), t("test.confirmSubmitDescription", {
      answered: answeredCount,
      total: test?.questions.length ?? 0
    }), [
      { style: "cancel", text: t("common.cancel") },
      { onPress: () => void handleSubmit(), style: "default", text: t("test.confirmSubmitAction") }
    ]);
  };

  const isLoading = isPending || isStartingSubmission;

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
                  accessibilityState={{ selected: isCurrent }}
                  key={question.id}
                  onPress={() => setCurrentQuestionIndex(index)}
                  style={[styles.questionDot, isCurrent ? styles.questionDotCurrent : null]}
                >
                  <Caption
                    tone={isAnswered(question.id) && !isCurrent ? "muted" : "faint"}
                  >
                    {index + 1}
                  </Caption>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {error ? <Caption tone="error">{error}</Caption> : null}

        <Card style={{ gap: spacing.md }}>
          <View style={styles.metaRow}>
            <Caption>{t("test.question", { number: currentQuestionIndex + 1 })}</Caption>
            <Caption tone="faint">
              {currentQuestion.type} · {currentQuestion.marks}
            </Caption>
          </View>
          <HtmlContent html={currentQuestion.questionText} />

          {currentQuestion.type === "MCQ" ? (
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
                      <Body>{option.optionText}</Body>
                    </Pressable>
                  );
                });
              })()}
              {test.lockAnswerOnSelect && draftAnswers[currentQuestion.id]?.selectedOptionId ? (
                <Caption tone="faint">{t("test.optionLocked")}</Caption>
              ) : null}
            </>
          ) : (
            <TextInput
              multiline
              onChangeText={(value) =>
                setDraftAnswers((current) => ({
                  ...current,
                  [currentQuestion.id]: { writtenAnswer: value }
                }))
              }
              placeholder={t("test.writeAnswer")}
              placeholderTextColor={colors.placeholder}
              style={styles.written}
              value={draftAnswers[currentQuestion.id]?.writtenAnswer ?? ""}
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
                  setCurrentQuestionIndex((value) =>
                    Math.min(test.questions.length - 1, value + 1)
                  )
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
    height: 36,
    justifyContent: "center",
    width: 36
  },
  questionDotCurrent: { backgroundColor: colors.chipActive, borderColor: colors.chipActive },
  questionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timerPanel: {
    backgroundColor: colors.panelWarm,
    gap: spacing.xs,
    padding: spacing.md
  },
  written: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 120,
    padding: spacing.lg,
    textAlignVertical: "top"
  }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";