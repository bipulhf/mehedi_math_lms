import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Stack, useRouter } from "expo-router";
import type { JSX } from "react";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { Button, EmptyState, Screen, SkeletonBlock } from "@/src/components/ui";
import { SkeletonRows, SkeletonScreen } from "@/src/components/skeletons";
import { IconTile } from "@/src/components/ui-display";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord
} from "@/src/lib/api/notifications";
import { stripHtml } from "@/src/lib/html";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { fonts, radius, spacing, type TintName } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * Notifications, on their own screen.
 *
 * They used to be the second half of the inbox, behind a segmented control
 * beside messages. The two are not the same kind of thing: a message is a
 * conversation you are part of and go back to, a notification is a receipt you
 * read once and dismiss. Putting them in one tab meant the bell on the home
 * screen could only open the inbox on its *other* segment, and it cost a tap
 * every time to reach what the bell was pointing at. Now the bell opens this,
 * and the inbox is messages.
 */

function notificationHref(record: NotificationRecord): string | null {
  const data = record.data;

  if (data && typeof data.courseId === "string") {
    return `/learn/${data.courseId}`;
  }

  if (data && typeof data.conversationId === "string") {
    return `/messages/${data.conversationId}`;
  }

  return null;
}

/** Colour by what the notification is about, so the feed is scannable. */
function notificationLook(record: NotificationRecord): {
  icon: keyof typeof Ionicons.glyphMap;
  tint: TintName;
} {
  const data = record.data;

  if (data && typeof data.conversationId === "string") {
    return { icon: "chatbubble", tint: "mint" };
  }

  if (data && typeof data.courseId === "string") {
    return { icon: "school", tint: "brand" };
  }

  if (data && typeof data.paymentId === "string") {
    return { icon: "card", tint: "gold" };
  }

  return { icon: "notifications", tint: "sky" };
}

export default function NotificationsScreen(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();
  const { isPending: isSessionPending, session } = useSession();

  const { data, isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: listNotifications,
    queryKey: queryKeys.notifications()
  });
  const refreshAll = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotifications() })
    ]);
  };
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await refreshAll();
    }
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await refreshAll();
    }
  });

  const renderItem = useCallback(
    ({ item }: { item: NotificationRecord }) => {
      const href = notificationHref(item);
      const look = notificationLook(item);
      const isUnread = item.readAt === null;

      return (
        <Pressable
          accessibilityLabel={item.title}
          accessibilityRole="button"
          disabled={Boolean(item.readAt)}
          onPress={() => {
            markRead.mutate(item.id);
            if (href !== null) {
              router.push(href as never);
            }
          }}
          style={({ pressed }) => [
            styles.row,
            isUnread ? styles.rowUnread : null,
            pressed ? styles.rowPressed : null
          ]}
        >
          <IconTile icon={look.icon} size={46} tint={look.tint} />
          <View style={styles.rowText}>
            <View style={styles.rowHead}>
              <Text numberOfLines={1} style={styles.rowName}>
                {item.title}
              </Text>
              {isUnread ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text numberOfLines={2} style={styles.rowBody}>
              {stripHtml(item.body)}
            </Text>
            <Text style={styles.rowTime}>{format.dateTime(item.createdAt)}</Text>
          </View>
          {href === null ? null : (
            <Ionicons color={colors.mutedFaint} name="chevron-forward" size={16} />
          )}
        </Pressable>
      );
    },
    [colors, format, markRead, router, styles]
  );
  const keyExtractor = useCallback((item: NotificationRecord) => item.id, []);

  if (isSessionPending) {
    return (
      <SkeletonScreen>
        <SkeletonRows leading="tile" rows={5} />
      </SkeletonScreen>
    );
  }

  // A notification feed is nobody's until there is a somebody.
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  const items = data?.items ?? [];
  const hasUnread = items.some((item) => item.readAt === null);

  return (
    <Screen>
      <Stack.Screen options={{ title: t("nav.notify") }} />
      {isPending ? (
        <View style={styles.sheet}>
          {[0, 1, 2].map((key) => (
            <View key={key} style={styles.row}>
              <SkeletonBlock height={46} style={styles.skeletonTile} width={46} />
              <View style={styles.rowText}>
                <SkeletonBlock height={16} width="50%" />
                <View style={{ height: spacing.sm }} />
                <SkeletonBlock height={13} />
              </View>
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <View style={styles.padded}>
          <EmptyState message={t("notifications.emptyLead")} title={t("notifications.emptyTitle")} />
        </View>
      ) : (
        <View style={styles.sheet}>
          {hasUnread ? (
            <View style={styles.sheetAction}>
              <Button
                icon="checkmark-done"
                isBusy={markAllRead.isPending}
                label={t("notifications.markAllRead")}
                onPress={() => markAllRead.mutate()}
                size="xs"
                variant="soft"
              />
            </View>
          ) : null}
          <FlashList
            contentContainerStyle={styles.list}
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { paddingBottom: spacing.xxl },
  padded: { paddingTop: spacing.lg },
  row: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 84,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  rowBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  rowHead: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  rowName: { color: colors.ink, flex: 1, fontFamily: fonts.displayBold, fontSize: 16 },
  rowPressed: { backgroundColor: colors.rowHover },
  rowText: { flex: 1, gap: 2 },
  rowTime: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 10,
    letterSpacing: 0.6
  },
  rowUnread: { backgroundColor: colors.accentSoft },
  sheet: { backgroundColor: colors.card, flex: 1, overflow: "hidden" },
  sheetAction: { alignItems: "flex-end", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  skeletonTile: { borderRadius: radius.tile },
  unreadDot: { backgroundColor: colors.accent, borderRadius: radius.full, height: 9, width: 9 }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
