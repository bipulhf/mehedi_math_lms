import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import type { JSX } from "react";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Heading,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord
} from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { stripHtml } from "@/src/lib/html";
import { usePushRegistration } from "@/src/lib/use-push-registration";
import { useSession } from "@/src/lib/use-session";
import { useFormat, useT } from "@/src/lib/locale";
import { colors, spacing } from "@/src/theme/tokens";

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

export default function NotificationsScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();
  const { isPending: isSessionPending, session } = useSession();

  usePushRegistration(Boolean(session));

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

  if (isSessionPending) {
    return <ScreenSkeleton rows={3} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  const hasUnread = (data?.items ?? []).some((item) => item.readAt === null);

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>{t("nav.notify")}</Heading>
        {hasUnread ? (
          <Button
            isBusy={markAllRead.isPending}
            label={t("notifications.markAllRead")}
            onPress={() => markAllRead.mutate()}
            size="sm"
            variant="outline"
          />
        ) : null}
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
        <EmptyState message={t("notifications.emptyLead")} title={t("notifications.emptyTitle")} />
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
  cardRead: { backgroundColor: colors.panelWarm },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  list: { padding: spacing.lg },
  row: { marginBottom: spacing.md },
  skeletonList: { gap: spacing.md, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
