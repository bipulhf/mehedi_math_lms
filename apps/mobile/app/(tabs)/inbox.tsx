import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Heading,
  PresenceDot,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Tabs,
  Title
} from "@/src/components/ui";
import { listConversations, type MessageConversation } from "@/src/lib/api/messages";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/src/lib/api/notifications";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { stripHtml } from "@/src/lib/html";
import { usePushRegistration } from "@/src/lib/use-push-registration";
import { useSession } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

/**
 * Messages and notifications, one tab instead of two — the 2026 edtech
 * complaint every source agreed on was notification overload from too many
 * separate feeds, not too few. A segmented control inside one Inbox keeps
 * both reachable without spending two of the four tab slots on them.
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

const ConversationRow = memo(function ConversationRow({
  conversation
}: {
  conversation: MessageConversation;
}): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <Link
      asChild
      href={{
        params: { conversationId: conversation.id },
        pathname: "/messages/[conversationId]"
      }}
    >
      <Pressable style={styles.row}>
        <Card>
          <View style={styles.rowHeader}>
            <View style={styles.rowName}>
              <PresenceDot isOnline={conversation.user.isOnline} />
              <Title>{conversation.user.name}</Title>
            </View>
            {conversation.unreadCount > 0 ? <Badge>{conversation.unreadCount}</Badge> : null}
          </View>
          <Body muted numberOfLines={1}>
            {conversation.lastMessage?.content ?? t("messages.noMessages")}
          </Body>
          {conversation.lastMessageAt ? (
            <Caption>{format.date(conversation.lastMessageAt)}</Caption>
          ) : null}
        </Card>
      </Pressable>
    </Link>
  );
});

function MessagesPane({ canMessage }: { canMessage: boolean }): JSX.Element {
  const router = useRouter();
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
        <EmptyState message={t("messages.unavailableLead")} title={t("messages.unavailable")} />
      </View>
    );
  }

  return (
    <View style={styles.pane}>
      <View style={styles.paneAction}>
        <Button label={t("messages.new")} onPress={() => router.push("/messages/new")} size="sm" />
      </View>

      {isPending ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((key) => (
            <Card key={key}>
              <SkeletonBlock height={18} width="45%" />
              <View style={{ height: spacing.sm }} />
              <SkeletonBlock height={14} width="85%" />
            </Card>
          ))}
        </View>
      ) : conversations.length === 0 ? (
        <EmptyState message={t("messages.emptyLead")} title={t("messages.emptyTitle")} />
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={conversations}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

function NotificationsPane(): JSX.Element {
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

      return (
        <Pressable
          disabled={Boolean(item.readAt)}
          onPress={() => {
            markRead.mutate(item.id);
            if (href !== null) {
              router.push(href as never);
            }
          }}
          style={styles.row}
        >
          <Card style={item.readAt ? styles.cardRead : undefined}>
            <Title>{item.title}</Title>
            <View style={{ height: spacing.xs }} />
            <Body muted>{stripHtml(item.body)}</Body>
            <View style={{ height: spacing.sm }} />
            <Caption>{format.dateTime(item.createdAt)}</Caption>
          </Card>
        </Pressable>
      );
    },
    [format, markRead, router]
  );
  const keyExtractor = useCallback((item: NotificationRecord) => item.id, []);

  const hasUnread = (data?.items ?? []).some((item) => item.readAt === null);

  return (
    <View style={styles.pane}>
      {hasUnread ? (
        <View style={styles.paneAction}>
          <Button
            isBusy={markAllRead.isPending}
            label={t("notifications.markAllRead")}
            onPress={() => markAllRead.mutate()}
            size="sm"
            variant="outline"
          />
        </View>
      ) : null}

      {isPending ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((key) => (
            <Card key={key}>
              <SkeletonBlock height={16} width="40%" />
              <View style={{ height: spacing.sm }} />
              <SkeletonBlock height={14} />
            </Card>
          ))}
        </View>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState message={t("notifications.emptyLead")} title={t("notifications.emptyTitle")} />
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={data?.items ?? []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

export default function InboxScreen(): JSX.Element {
  const t = useT();
  const router = useRouter();
  const [segment, setSegment] = useState<InboxSegment>("messages");
  const { isPending: isSessionPending, session } = useSession();
  const canMessage = session?.session.role === "STUDENT" || session?.session.role === "TEACHER";

  usePushRegistration(Boolean(session));

  // An effect, not a render-time <Redirect>: redirecting during the tab
  // navigator's own mount raced Fabric's view mounting and crashed with
  // "child already has a parent" — see app/(tabs)/index.tsx.
  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/sign-in");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session) {
    return <ScreenSkeleton noHeader rows={4} />;
  }

  return (
    <Screen noHeader>
      <View style={styles.header}>
        <Heading>{t("nav.inbox")}</Heading>
      </View>
      <Tabs
        label={t("nav.inbox")}
        onChange={setSegment}
        tabs={[
          { isActive: segment === "messages", label: t("nav.messages"), value: "messages" },
          { isActive: segment === "notifications", label: t("nav.notify"), value: "notifications" }
        ]}
        value={segment}
      />
      {segment === "messages" ? (
        <MessagesPane canMessage={canMessage} />
      ) : (
        <NotificationsPane />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardRead: { backgroundColor: colors.panelWarm },
  header: { padding: spacing.lg },
  list: { padding: spacing.lg },
  padded: { padding: spacing.lg },
  pane: { flex: 1 },
  paneAction: { alignItems: "flex-end", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  row: { marginBottom: spacing.md },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  rowName: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm },
  skeletonList: { gap: spacing.md, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
