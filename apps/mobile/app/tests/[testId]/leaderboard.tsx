import { FlashList } from "@shopify/flash-list";
import { useQueries } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  Badge,
  Caption,
  EmptyState,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { Avatar } from "@/src/components/ui-display";
import { getTestDetail, getTestLeaderboard, type LeaderboardEntry } from "@/src/lib/api/tests";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, radius, spacing, type TintName } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

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
  content: { paddingBottom: spacing.xxl },
  header: { gap: spacing.xs, padding: spacing.lg },
  name: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 15 },
  // The reader's own line, and only that, is tinted.
  ownRow: { backgroundColor: colors.accentSoft },
  rank: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderRadius: radius.md,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  rankText: { color: colors.muted, fontFamily: fonts.numeric, fontSize: 15 },
  row: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  rowBody: { flex: 1, gap: 2 },
  score: { color: colors.ink, fontFamily: fonts.numeric, fontSize: 18 },
  scoreMax: { color: colors.mutedFaint, fontFamily: fonts.body, fontSize: 13 }
}));

/** Gold, silver, bronze; everybody else gets their number in a quiet well. */
function rankTint(rank: number): TintName | null {
  if (rank === 1) {
    return "gold";
  }

  if (rank === 2) {
    return "sky";
  }

  if (rank === 3) {
    return "coral";
  }

  return null;
}

function LeaderboardRow({
  entry,
  totalMarks
}: {
  entry: LeaderboardEntry;
  totalMarks: number;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const t = useT();
  const format = useFormat();
  const tint = rankTint(entry.rank);

  return (
    <View style={[styles.row, entry.isCurrentUser ? styles.ownRow : null]}>
      <View
        style={[
          styles.rank,
          tint === null ? null : { backgroundColor: colors.tint[tint].bg }
        ]}
      >
        <Text
          style={[
            styles.rankText,
            tint === null ? null : { color: colors.tint[tint].fg }
          ]}
        >
          {format.number(entry.rank)}
        </Text>
      </View>
      <Avatar name={entry.user.name} photo={null} size={40} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.name}>
          {entry.isCurrentUser ? `${entry.user.name} (${t("leaderboard.you")})` : entry.user.name}
        </Text>
        <View style={styles.badgesRow}>
          <Caption tone="faint">
            {entry.durationMs === null
              ? t("leaderboard.noTime")
              : t("leaderboard.minutes", {
                  count: format.number(Math.max(1, Math.round(entry.durationMs / 60000)))
                })}
          </Caption>
          {entry.attempts > 1 ? (
            <Badge tone="quiet">
              {t("leaderboard.attemptsLabel", { count: format.number(entry.attempts) })}
            </Badge>
          ) : null}
        </View>
      </View>
      <Text style={styles.score}>
        {entry.score}
        <Text style={styles.scoreMax}>/{entry.maxScore ?? totalMarks}</Text>
      </Text>
    </View>
  );
}

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
