import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Redirect } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  Caption,
  Card,
  EmptyState,
  Heading,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { listConversations, type MessageConversation } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

const ConversationRow = memo(function ConversationRow({
  conversation
}: {
  conversation: MessageConversation;
}): JSX.Element {
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
            <Title>{conversation.user.name}</Title>
            {conversation.unreadCount > 0 ? <Badge>{conversation.unreadCount}</Badge> : null}
          </View>
          <Body muted numberOfLines={1}>
            {conversation.lastMessage?.content ?? "No messages yet"}
          </Body>
          {conversation.lastMessageAt ? (
            <Caption>{new Date(conversation.lastMessageAt).toLocaleDateString()}</Caption>
          ) : null}
        </Card>
      </Pressable>
    </Link>
  );
});

export default function MessagesScreen(): JSX.Element {
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
        <EmptyState
          message="Messaging is between students and teachers."
          title="Messaging unavailable"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>Messages</Heading>
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
        <EmptyState
          message="Start one from a course page on the web, and it will appear here."
          title="No conversations"
        />
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
  header: { padding: spacing.lg },
  list: { padding: spacing.lg },
  padded: { padding: spacing.lg },
  row: { marginBottom: spacing.md },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  skeletonList: { gap: spacing.md, padding: spacing.lg }
});
