import { useQueries } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import { Badge, Body, Button, Caption, Card, Screen, SkeletonBlock, Title } from "@/src/components/ui";
import { getSubmissionDetail, getTestDetail } from "@/src/lib/api";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, radius, spacing } from "@/src/theme/tokens";

/**
 * What a submitted attempt shows: the headline score while the attempt is
 * ungraded, then each question with the student's answer once it is.
 */
export default function SubmissionResultScreen(): JSX.Element {
  const { submissionId, testId } = useLocalSearchParams<{
    submissionId: string;
    testId: string;
  }>();
  const router = useRouter();
  const t = useT();

  const [testQuery, submissionQuery] = useQueries({
    queries: [
      {
        queryFn: () => getTestDetail(testId, true),
        queryKey: queryKeys.testWithAnswers(testId)
      },
      {
        queryFn: () => getSubmissionDetail(submissionId),
        queryKey: queryKeys.testSubmission(submissionId)
      }
    ]
  });

  const test = testQuery?.data ?? null;
  const submission = submissionQuery?.data ?? null;
  const isLoading = Boolean(testQuery?.isPending) || Boolean(submissionQuery?.isPending);

  if (isLoading || !test || !submission) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={26} width="60%" />
          <SkeletonBlock height={90} />
          <SkeletonBlock height={120} />
        </ScrollView>
      </Screen>
    );
  }

  const answerMap = new Map(submission.answers.map((answer) => [answer.questionId, answer]));

  return (
    <Screen>
      <Stack.Screen options={{ title: test.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: spacing.md }}>
          <Title>{test.title}</Title>
          <Caption>
            {submission.status === "GRADED" ? t("test.finalResult") : t("test.submissionReceived")}
          </Caption>
          <View style={styles.badgesRow}>
            <Badge tone="quiet">
              {t("test.attemptLabel", { number: submission.attemptNumber })}
            </Badge>
            <Badge>{submission.status}</Badge>
            <Badge>
              {t("test.score", {
                max: submission.maxScore ?? test.totalMarks,
                score: submission.score ?? 0
              })}
            </Badge>
            {test.passingScore !== null ? (
              <Badge tone="quiet">{t("test.passScore", { count: test.passingScore })}</Badge>
            ) : null}
            {submission.passed !== null ? (
              <Badge tone={submission.passed ? "neutral" : "attention"}>
                {submission.passed ? t("test.passed") : t("test.failed")}
              </Badge>
            ) : null}
          </View>
          <Button
            label={t("test.viewHistory")}
            variant="outline"
            onPress={() =>
              router.push({ params: { testId }, pathname: "/tests/[testId]/history" })
            }
          />
        </Card>

        {test.questions.map((question) => {
          const answer = answerMap.get(question.id);

          return (
            <Card key={question.id} style={{ gap: spacing.sm }}>
              <Caption>
                {question.type} · {question.marks}
              </Caption>
              <HtmlContent html={question.questionText} />
              {question.type === "MCQ" ? (
                <View style={{ gap: spacing.xs }}>
                  {question.options.map((option) => {
                    const isSelected = option.id === answer?.selectedOptionId;
                    const isCorrectOption = option.isCorrect === true;

                    return (
                      <View
                        key={option.id}
                        style={[
                          styles.optionRow,
                          isCorrectOption ? styles.optionRowCorrect : null
                        ]}
                      >
                        <Body>{option.optionText}</Body>
                        <View style={styles.badgesRow}>
                          {isSelected ? (
                            <Badge tone={isCorrectOption ? "neutral" : "attention"}>
                              {t("test.yourAnswer")}
                            </Badge>
                          ) : null}
                          {isCorrectOption ? (
                            <Badge tone="neutral">{t("test.correctAnswer")}</Badge>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                  {!answer?.selectedOptionId ? <Caption>{t("test.noOption")}</Caption> : null}
                </View>
              ) : (
                <Caption>
                  {t("test.yourAnswer")}: {answer?.writtenAnswer ?? t("test.noAnswer")}
                </Caption>
              )}
              {question.type === "WRITTEN" && question.expectedAnswer ? (
                <View style={{ gap: spacing.xs }}>
                  <Caption>{t("test.correctAnswer")}</Caption>
                  <HtmlContent html={question.expectedAnswer} />
                </View>
              ) : null}
              <Caption>
                {t("test.awardedMarks", { count: answer?.awardedMarks ?? 0 })}
                {answer?.isCorrect !== null && answer?.isCorrect !== undefined
                  ? ` · ${answer.isCorrect ? t("test.markedCorrect") : t("test.markedIncorrect")}`
                  : ""}
              </Caption>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgesRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  content: { gap: spacing.md, padding: spacing.lg },
  optionRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md
  },
  optionRowCorrect: { backgroundColor: colors.chipActive, borderColor: colors.accent }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";