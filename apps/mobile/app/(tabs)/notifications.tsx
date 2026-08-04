import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import type { JSX } from "react";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
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
import { listNotifications, markNotificationRead, type NotificationRecord } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { stripHtml } from "@/src/lib/html";
import { usePushRegistration } from "@/src/lib/use-push-registration";
import { useSession } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

export default function NotificationsScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const { isPending: isSessionPending, session } = useSession();

  usePushRegistration(Boolean(session));

  const { data, isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: listNotifications,
    queryKey: queryKeys.notifications()
  });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotifications() })
      ]);
    }
  });

  const renderItem = useCallback(
    ({ item }: { item: NotificationRecord }) => (
      <Pressable
        disabled={Boolean(item.readAt)}
        onPress={() => markRead.mutate(item.id)}
        style={styles.row}
      >
        <Card style={item.readAt ? styles.cardRead : undefined}>
          <Title>{item.title}</Title>
          <View style={{ height: spacing.xs }} />
          <Body muted>{stripHtml(item.body)}</Body>
          <View style={{ height: spacing.sm }} />
          <Caption>{new Date(item.createdAt).toLocaleString()}</Caption>
        </Card>
      </Pressable>
    ),
    [markRead]
  );
  const keyExtractor = useCallback((item: NotificationRecord) => item.id, []);

  if (isSessionPending) {
    return <ScreenSkeleton rows={3} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>Notifications</Heading>
      </View>

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
        <EmptyState
          message="Enrolments, payments and course notices will show up here."
          title="Nothing yet"
        />
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={data?.items ?? []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardRead: { backgroundColor: colors.surfaceContainerLow },
  header: { padding: spacing.lg },
  list: { padding: spacing.lg },
  row: { marginBottom: spacing.md },
  skeletonList: { gap: spacing.md, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
