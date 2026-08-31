import { useQueries } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Badge, Body, Caption, Card, EmptyState, Screen, SkeletonBlock, Title } from "@/src/components/ui";
import { getTestDetail, listMySubmissions } from "@/src/lib/api/tests";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { spacing } from "@/src/theme/tokens";

export default function TestHistoryScreen(): JSX.Element {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const router = useRouter();
  const t = useT();
  const format = useFormat();

  const [testQuery, submissionsQuery] = useQueries({
    queries: [
      {
        queryFn: () => getTestDetail(testId),
        queryKey: queryKeys.test(testId)
      },
      {
        queryFn: () => listMySubmissions(testId),
        queryKey: queryKeys.myTestSubmissions(testId)
      }
    ]
  });

  const test = testQuery?.data ?? null;
  const submissions = submissionsQuery?.data ?? [];
  const isLoading = Boolean(testQuery?.isPending) || Boolean(submissionsQuery?.isPending);

  if (isLoading || !test) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={26} width="60%" />
          <SkeletonBlock height={90} />
          <SkeletonBlock height={90} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: test.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Title>{test.title}</Title>
        <Caption>{t("test.historyLead")}</Caption>

        {submissions.length === 0 ? <EmptyState message={t("test.historyEmpty")} /> : null}

        {submissions.map((submission) => (
          <Pressable
            key={submission.id}
            onPress={() =>
              router.push({
                params: { submissionId: submission.id, testId },
                pathname: "/tests/[testId]/results/[submissionId]"
              })
            }
          >
            <Card style={{ gap: spacing.sm }}>
              <Body>{t("test.attemptLabel", { number: submission.attemptNumber })}</Body>
              <Caption>{format.date(submission.createdAt)}</Caption>
              <View style={styles.badgesRow}>
                <Badge tone="quiet">{submission.status}</Badge>
                <Badge tone="quiet">
                  {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
                </Badge>
                {submission.passed !== null ? (
                  <Badge tone={submission.passed ? "neutral" : "attention"}>
                    {submission.passed ? t("test.passed") : t("test.failed")}
                  </Badge>
                ) : null}
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgesRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  content: { gap: spacing.md, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
