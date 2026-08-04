import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback } from "react";
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
  Title
} from "@/src/components/ui";
import { listConversations, type MessageConversation } from "@/src/lib/api";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

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

export default function MessagesScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const canMessage = session?.session.role === "STUDENT" || session?.session.role === "TEACHER";
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

  if (isSessionPending) {
    return <ScreenSkeleton rows={4} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!canMessage) {
    return (
      <Screen style={styles.padded}>
        <EmptyState message={t("messages.unavailableLead")} title={t("messages.unavailable")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>{t("nav.messages")}</Heading>
        <Button
          label={t("messages.new")}
          onPress={() => router.push("/messages/new")}
          size="sm"
        />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  list: { padding: spacing.lg },
  padded: { padding: spacing.lg },
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
