import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import {
  Button,
  EmptyState,
  IconButton,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  tabScrollInset
} from "@/src/components/ui";
import { CurvedHeader, HeaderBar } from "@/src/components/ui-layout";
import { Avatar, IconTile, PresenceDot, Tabs } from "@/src/components/ui-display";
import { listConversations, type MessageConversation } from "@/src/lib/api/messages";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord
} from "@/src/lib/api/notifications";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { stripHtml } from "@/src/lib/html";
import { usePushRegistration } from "@/src/lib/use-push-registration";
import { useSession } from "@/src/lib/use-session";
import { fonts, radius, spacing, type TintName } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * Messages and notifications, one tab instead of two — the complaint every
 * source agreed on was notification overload from too many separate feeds, not
 * too few.
 *
 * The list is one white sheet with hairlines between rows rather than a stack
 * of floating cards. A feed is a single continuous thing, and forty shadows
 * down a screen is the fastest way to make a phone app look like a web page.
 */

type InboxSegment = "messages" | "notifications";

/**
 * Where a notification should take the student. Mirrors the web app's
 * `resolveNotificationLink`, routed by id because mobile addresses courses and
 * conversations by id rather than by slug.
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

const ConversationRow = memo(function ConversationRow({
  conversation
}: {
  conversation: MessageConversation;
}): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      asChild
      href={{
        params: { conversationId: conversation.id },
        pathname: "/messages/[conversationId]"
      }}
    >
      <Pressable
        accessibilityLabel={conversation.user.name}
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      >
        <View>
          <Avatar name={conversation.user.name} photo={conversation.user.image} size={50} />
          <View style={styles.presenceAnchor}>
            <PresenceDot isOnline={conversation.user.isOnline} />
          </View>
        </View>
        <View style={styles.rowText}>
          <View style={styles.rowHead}>
            <Text numberOfLines={1} style={styles.rowName}>
              {conversation.user.name}
            </Text>
            {conversation.lastMessageAt ? (
              <Text style={styles.rowTime}>{format.date(conversation.lastMessageAt)}</Text>
            ) : null}
          </View>
          <View style={styles.rowHead}>
            <Text
              numberOfLines={1}
              style={[styles.rowPreview, hasUnread ? styles.rowPreviewUnread : null]}
            >
              {conversation.lastMessage?.content ?? t("messages.noMessages")}
            </Text>
            {hasUnread ? (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>{conversation.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
});

function MessagesPane({ canMessage }: { canMessage: boolean }): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const { data: conversations = [], isPending } = useQuery({
    enabled: canMessage,
    queryFn: listConversations,
    queryKey: queryKeys.conversations()
  });

  const renderItem = useCallback(
    ({ item }: { item: MessageConversation }) => <ConversationRow conversation={item} />,
    []
  );
  const keyExtractor = useCallback((item: MessageConversation) => item.id, []);

  if (!canMessage) {
    return (
      <View style={styles.padded}>
        <EmptyState
          icon="bubble.left"
          message={t("messages.unavailableLead")}
          title={t("messages.unavailable")}
        />
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={styles.sheet}>
        {[0, 1, 2, 3].map((key) => (
          <View key={key} style={styles.row}>
            <SkeletonBlock height={50} style={styles.skeletonAvatar} width={50} />
            <View style={styles.rowText}>
              <SkeletonBlock height={16} width="45%" />
              <View style={{ height: spacing.sm }} />
              <SkeletonBlock height={13} width="80%" />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.padded}>
        <EmptyState
          icon="bubble.left"
          message={t("messages.emptyLead")}
          title={t("messages.emptyTitle")}
        />
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <FlashList
        contentContainerStyle={styles.list}
        data={conversations}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function NotificationsPane(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
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

  const hasUnread = (data?.items ?? []).some((item) => item.readAt === null);

  if (isPending) {
    return (
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
    );
  }

  if ((data?.items.length ?? 0) === 0) {
    return (
      <View style={styles.padded}>
        <EmptyState message={t("notifications.emptyLead")} title={t("notifications.emptyTitle")} />
      </View>
    );
  }

  return (
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
        data={data?.items ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default function InboxScreen(): JSX.Element {
  const styles = useStyles();
  const router = useRouter();
  const t = useT();
  const [segment, setSegment] = useState<InboxSegment>("messages");
  const { isPending: isSessionPending, session } = useSession();
  const canMessage = session?.session.role === "STUDENT" || session?.session.role === "TEACHER";

  usePushRegistration(Boolean(session));

  if (isSessionPending) {
    return <ScreenSkeleton noHeader rows={4} />;
  }

  // Signed out, this tab is not in the bar at all; anybody who reaches it by
  // deep link belongs on the way in, not on an empty feed.
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen>
      <CurvedHeader overlap={false} style={styles.header}>
        <HeaderBar
          right={
            canMessage ? (
              <IconButton
                accessibilityLabel={t("messages.new")}
                icon="create"
                onPress={() => router.push("/messages/new")}
                tone="onPaper"
              />
            ) : undefined
          }
          subtitle={t("nav.inbox")}
          title={segment === "messages" ? t("nav.messages") : t("nav.notify")}
        />
      </CurvedHeader>

      <View style={styles.tabsWrap}>
        <Tabs
          inset={false}
          label={t("nav.inbox")}
          onChange={setSegment}
          tabs={[
            { isActive: segment === "messages", label: t("nav.messages"), value: "messages" },
            { isActive: segment === "notifications", label: t("nav.notify"), value: "notifications" }
          ]}
          value={segment}
        />
      </View>

      {segment === "messages" ? <MessagesPane canMessage={canMessage} /> : <NotificationsPane />}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { paddingBottom: spacing.lg },
  list: { paddingBottom: tabScrollInset },
  padded: { paddingTop: spacing.lg },
  presenceAnchor: { bottom: 0, position: "absolute", right: 0 },
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
  rowPreview: { color: colors.muted, flex: 1, fontFamily: fonts.body, fontSize: 14 },
  rowPreviewUnread: { color: colors.ink, fontFamily: fonts.bodySemiBold },
  rowText: { flex: 1, gap: 2 },
  rowTime: { color: colors.mutedFaint, fontFamily: fonts.monoLabel, fontSize: 10, letterSpacing: 0.6 },
  rowUnread: { backgroundColor: colors.accentSoft },
  // The feed is one plate with its top corners curved into the page, not a
  // stack of cards. It runs to the bottom of the screen behind the nav bar.
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.curve,
    borderTopRightRadius: radius.curve,
    flex: 1,
    marginTop: spacing.md,
    overflow: "hidden"
  },
  sheetAction: { alignItems: "flex-end", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  skeletonAvatar: { borderRadius: radius.full },
  skeletonTile: { borderRadius: radius.tile },
  tabsWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  unreadDot: { backgroundColor: colors.accent, borderRadius: radius.full, height: 9, width: 9 },
  unreadPill: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  unreadPillText: { color: colors.onAccent, fontFamily: fonts.displayBold, fontSize: 12 }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
