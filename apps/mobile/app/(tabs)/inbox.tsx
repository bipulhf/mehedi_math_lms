import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback } from "react";
import { Text, View } from "react-native";

import {
  EmptyState,
  IconButton,
  Screen,
  SkeletonBlock,
  tabScrollInset
} from "@/src/components/ui";
import { LinkPressable } from "@/src/components/link-pressable";
import {
  SkeletonBody,
  SkeletonHeader,
  SkeletonRows
} from "@/src/components/skeletons";
import { CurvedHeader, HeaderBar } from "@/src/components/ui-layout";
import { Avatar, PresenceDot } from "@/src/components/ui-display";
import { listConversations, type MessageConversation } from "@/src/lib/api/messages";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { usePushRegistration } from "@/src/lib/use-push-registration";
import { useSession } from "@/src/lib/use-session";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * Conversations, and only conversations. Notifications used to share this tab
 * behind a segmented control; they are their own screen now, reached from the
 * bell on the home header — see `app/notifications.tsx`.
 *
 * The list is one white sheet with hairlines between rows rather than a stack
 * of floating cards. A feed is a single continuous thing, and forty shadows
 * down a screen is the fastest way to make a phone app look like a web page.
 */

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
    <LinkPressable
      accessibilityLabel={conversation.user.name}
      href={{
        params: { conversationId: conversation.id },
        pathname: "/messages/[conversationId]"
      }}
      pressedStyle={styles.rowPressed}
      style={styles.row}
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
    </LinkPressable>
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

export default function InboxScreen(): JSX.Element {
  const styles = useStyles();
  const router = useRouter();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const canMessage = session?.session.role === "STUDENT" || session?.session.role === "TEACHER";

  usePushRegistration(Boolean(session));

  if (isSessionPending) {
    return (
      <Screen>
        <SkeletonHeader hasAction overlap={false} />
        <SkeletonBody tabInset>
          <SkeletonRows leading="avatar" rows={5} />
        </SkeletonBody>
      </Screen>
    );
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
          title={t("nav.messages")}
        />
      </CurvedHeader>

      <MessagesPane canMessage={canMessage} />
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
