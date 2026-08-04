import { useQueries } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { HtmlContent } from "@/src/components/html-content";
import { Badge, Body, Caption, Card, Screen, SkeletonBlock, Title } from "@/src/components/ui";
import { getSubmissionDetail, getTestDetail } from "@/src/lib/api";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { spacing } from "@/src/theme/tokens";

/**
 * What a submitted attempt shows: the headline score while the attempt is
 * ungraded, then each question with the student's answer once it is.
 */
export default function SubmissionResultScreen(): JSX.Element {
  const { submissionId, testId } = useLocalSearchParams<{
    submissionId: string;
    testId: string;
  }>();
  const t = useT();

  const [testQuery, submissionQuery] = useQueries({
    queries: [
      { queryFn: () => getTestDetail(testId), queryKey: queryKeys.test(testId) },
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
        </Card>

        {test.questions.map((question) => {
          const answer = answerMap.get(question.id);
          const selectedOption = question.options.find(
            (option) => option.id === answer?.selectedOptionId
          );

          return (
            <Card key={question.id} style={{ gap: spacing.sm }}>
              <Caption>
                {question.type} · {question.marks}
              </Caption>
              <HtmlContent html={question.questionText} />
              <Body>
                {question.type === "MCQ"
                  ? (selectedOption?.optionText ?? t("test.noOption"))
                  : (answer?.writtenAnswer ?? t("test.noAnswer"))}
              </Body>
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
  content: { gap: spacing.md, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";