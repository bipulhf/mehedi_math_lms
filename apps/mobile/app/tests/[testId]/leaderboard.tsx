import { FlashList } from "@shopify/flash-list";
import { useQueries } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { ScrollView, View } from "react-native";

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
import { getTestDetail, getTestLeaderboard, type LeaderboardEntry } from "@/src/lib/api/tests";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * The same board a browser shows, and the same rows for a student and a
 * teacher. The reader's own line is the only thing marked out.
 */
export default function TestLeaderboardScreen(): JSX.Element {
  const styles = useStyles();
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const t = useT();

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
      <FlashList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(entry) => entry.submissionId}
        ListEmptyComponent={<EmptyState message={t("leaderboard.empty")} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Title>{test.title}</Title>
            <Caption>{t("leaderboard.lead")}</Caption>
          </View>
        }
        renderItem={({ item }) => <LeaderboardRow entry={item} totalMarks={test.totalMarks} />}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  badgesRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  content: { padding: spacing.lg },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  ownRow: { borderColor: colors.accent },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rowBody: { flex: 1, gap: spacing.sm },
  rowWrap: { paddingBottom: spacing.md }
}));

function LeaderboardRow({
  entry,
  totalMarks
}: {
  entry: LeaderboardEntry;
  totalMarks: number;
}): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();

  return (
    <View style={styles.rowWrap}>
      <Card style={entry.isCurrentUser ? styles.ownRow : undefined}>
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
                {entry.score}/{entry.maxScore ?? totalMarks}
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
    </View>
  );
}

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
