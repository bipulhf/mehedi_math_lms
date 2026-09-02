import { useQueries } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  Caption,
  Card,
  EmptyState,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { getTestDetail, getTestLeaderboard } from "@/src/lib/api/tests";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, spacing } from "@/src/theme/tokens";

/**
 * The same board a browser shows, and the same rows for a student and a
 * teacher. The reader's own line is the only thing marked out.
 */
export default function TestLeaderboardScreen(): JSX.Element {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const t = useT();
  const format = useFormat();

  const [testQuery, boardQuery] = useQueries({
    queries: [
      {
        queryFn: () => getTestDetail(testId),
        queryKey: queryKeys.test(testId)
      },
      {
        queryFn: () => getTestLeaderboard(testId),
        queryKey: queryKeys.leaderboard(testId)
      }
    ]
  });

  const test = testQuery?.data ?? null;
  const entries = boardQuery?.data ?? [];
  const isLoading = Boolean(testQuery?.isPending) || Boolean(boardQuery?.isPending);

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
      <Stack.Screen options={{ title: t("leaderboard.title") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Title>{test.title}</Title>
        <Caption>{t("leaderboard.lead")}</Caption>

        {entries.length === 0 ? <EmptyState message={t("leaderboard.empty")} /> : null}

        {entries.map((entry) => (
          <Card
            key={entry.submissionId}
            style={entry.isCurrentUser ? styles.ownRow : undefined}
          >
            <View style={styles.row}>
              <Title>{format.number(entry.rank)}</Title>
              <View style={styles.rowBody}>
                <Body>
                  {entry.isCurrentUser
                    ? `${entry.user.name} (${t("leaderboard.you")})`
                    : entry.user.name}
                </Body>
                <View style={styles.badgesRow}>
                  <Badge tone="quiet">
                    {entry.score}/{entry.maxScore ?? test.totalMarks}
                  </Badge>
                  <Badge tone="quiet">
                    {entry.durationMs === null
                      ? t("leaderboard.noTime")
                      : t("leaderboard.minutes", {
                          count: format.number(Math.max(1, Math.round(entry.durationMs / 60000)))
                        })}
                  </Badge>
                  {entry.attempts > 1 ? (
                    <Badge tone="quiet">
                      {t("leaderboard.attemptsLabel", { count: format.number(entry.attempts) })}
                    </Badge>
                  ) : null}
                </View>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgesRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  content: { gap: spacing.md, padding: spacing.lg },
  ownRow: { borderColor: colors.accent },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rowBody: { flex: 1, gap: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
