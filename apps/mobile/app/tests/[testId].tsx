import { useMutation, useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
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
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: test, isPending } = useQuery({
    queryFn: async () => getTestDetail(testId),
    queryKey: queryKeys.test(testId)
  });

  /**
   * Starting an attempt is a write -- it creates the submission, or resumes the
   * open one -- so it stays an effect rather than a cached read, and must run
   * exactly once per test.
   */
  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      try {
        const started = await startSubmission(testId);

        if (isCancelled) {
          return;
        }

        setSubmission(started);
        setAnswers(
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
      } catch (startError) {
        if (!isCancelled) {
          setError(startError instanceof Error ? startError.message : "Could not start this test");
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [testId]);

  const deadline = useMemo(() => {
    if (!test?.durationInMinutes || !submission?.startedAt) {
      return null;
    }

    return new Date(submission.startedAt).getTime() + test.durationInMinutes * 60_000;
  }, [submission?.startedAt, test?.durationInMinutes]);

  useEffect(() => {
    if (deadline === null) {
      return;
    }

    const tick = (): void => {
      setRemainingSeconds(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    };

    tick();

    const interval = setInterval(tick, 1_000);

    return () => {
      clearInterval(interval);
    };
  }, [deadline]);

  const answerPayload = useMemo(
    () =>
      Object.entries(answers).map(([questionId, draft]) => ({
        questionId,
        selectedOptionId: draft.selectedOptionId,
        writtenAnswer: draft.writtenAnswer
      })),
    [answers]
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!submission) {
        throw new Error("No submission in progress");
      }

      return saveSubmissionAnswers(submission.id, { answers: answerPayload });
    }
  });

  const submit = useMutation({
    mutationFn: async () => submitTest(testId, { answers: answerPayload }),
    onError: (submitError: Error) => {
      setError(submitError.message);
    },
    onSuccess: () => {
      router.back();
    }
  });

  if (isPending) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={26} width="60%" />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={120} />
        </ScrollView>
      </Screen>
    );
  }

  if (!test) {
    return (
      <Screen style={styles.padded}>
        <Title>Test not found</Title>
      </Screen>
    );
  }

  const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: test.title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading>{test.title}</Heading>
        <View style={styles.metaRow}>
          <Badge>{test.type}</Badge>
          {test.passingScore !== null ? <Caption>Pass mark {test.passingScore}</Caption> : null}
          {remainingSeconds !== null ? (
            <Badge tone={isExpired ? "warning" : "neutral"}>
              {isExpired ? "Time is up" : formatRemaining(remainingSeconds)}
            </Badge>
          ) : null}
        </View>

        {error ? <Body>{error}</Body> : null}

        {test.questions.map((question, index) => (
          <Card key={question.id}>
            <Caption>
              Question {index + 1} · {question.marks} marks
            </Caption>
            <View style={{ height: spacing.sm }} />
            <Body>{question.prompt}</Body>
            <View style={{ height: spacing.md }} />

            {question.type === "MCQ" ? (
              question.options.map((option) => {
                const isSelected = answers[question.id]?.selectedOptionId === option.id;

                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    key={option.id}
                    onPress={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: { selectedOptionId: option.id }
                      }))
                    }
                    style={[styles.option, isSelected ? styles.optionSelected : null]}
                  >
                    <Body>{option.text}</Body>
                  </Pressable>
                );
              })
            ) : (
              <TextInput
                multiline
                onChangeText={(value) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: { writtenAnswer: value }
                  }))
                }
                placeholder="Write your answer"
                placeholderTextColor={colors.outline}
                style={styles.written}
                value={answers[question.id]?.writtenAnswer ?? ""}
              />
            )}
          </Card>
        ))}

        <Button
          isBusy={save.isPending}
          label="Save progress"
          onPress={() => save.mutate()}
          variant="outline"
        />
        <Button isBusy={submit.isPending} label="Submit test" onPress={() => submit.mutate()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg },
  metaRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  option: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    padding: spacing.lg
  },
  optionSelected: { backgroundColor: colors.secondaryContainer, borderColor: colors.primary },
  padded: { padding: spacing.lg },
  written: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.onSurface,
    minHeight: 120,
    padding: spacing.lg,
    textAlignVertical: "top"
  }
});
