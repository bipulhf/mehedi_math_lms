import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
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

  const isLoading = isPending || isStartingSubmission;

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
          <Badge>
            {t("test.answered", { count: answeredCount, total: test.questions.length })}
          </Badge>
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
            currentQuestion.options.map((option) => {
              const isSelected = draftAnswers[currentQuestion.id]?.selectedOptionId === option.id;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  key={option.id}
                  onPress={() =>
                    setDraftAnswers((current) => ({
                      ...current,
                      [currentQuestion.id]: { selectedOptionId: option.id }
                    }))
                  }
                  style={[styles.option, isSelected ? styles.optionSelected : null]}
                >
                  <Body>{option.optionText}</Body>
                </Pressable>
              );
            })
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
            <Button
              disabled={currentQuestionIndex === test.questions.length - 1}
              label={t("common.next")}
              onPress={() =>
                setCurrentQuestionIndex((value) =>
                  Math.min(test.questions.length - 1, value + 1)
                )
              }
            />
          </View>
        </Card>

        <Button
          isBusy={isSubmitting}
          label={isSubmitting ? t("test.submitting") : t("test.submit")}
          onPress={() => void handleSubmit()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  optionSelected: { backgroundColor: colors.chipActive, borderColor: colors.chipActive },
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