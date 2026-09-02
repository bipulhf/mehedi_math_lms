import { useMutation, useQuery } from "@tanstack/react-query";
import { Redirect, Stack, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  Body,
  Caption,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
  Heading,
  Screen,
  ScreenSkeleton
} from "@/src/components/ui";
import { Avatar, PresenceDot } from "@/src/components/ui-display";
import { createConversation, searchMessageParticipants } from "@/src/lib/api/messages";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

const MIN_SEARCH = 2;

export default function NewConversationScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  const canSearch = debounced.length >= MIN_SEARCH;
  const { data: participants = [], isPending } = useQuery({
    enabled: canSearch,
    queryFn: () => searchMessageParticipants(debounced),
    queryKey: queryKeys.participantSearch(debounced)
  });

  const startConversation = useMutation({
    mutationFn: createConversation,
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: (conversation) => {
      router.replace({
        params: { conversationId: conversation.id },
        pathname: "/messages/[conversationId]"
      });
    }
  });

  if (isSessionPending) {
    return <ScreenSkeleton rows={2} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("messages.newTitle") }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading>{t("messages.newTitle")}</Heading>
        <Body muted>{t("messages.searchLabel")}</Body>

        <Field
          autoCorrect={false}
          label={t("messages.searchLabel")}
          onChangeText={setSearch}
          placeholder={t("messages.searchPlaceholder")}
          value={search}
        />

        {error ? <ErrorNotice message={error} /> : null}

        {!canSearch ? (
          <EmptyState message={t("messages.searchPrompt", { count: MIN_SEARCH })} />
        ) : isPending ? (
          <ScreenSkeleton rows={3} />
        ) : participants.length === 0 ? (
          <EmptyState message={t("messages.noMatch")} />
        ) : (
          participants.map((participant) => (
            <Pressable
              accessibilityLabel={`${t("messages.start")} ${participant.name}`}
              accessibilityRole="button"
              accessibilityState={{
                busy: startConversation.isPending,
                disabled: startConversation.isPending
              }}
              disabled={startConversation.isPending}
              key={participant.id}
              onPress={() => {
                setError(null);
                startConversation.mutate({ participantId: participant.id });
              }}
            >
              <Card style={styles.participantRow}>
                <Avatar name={participant.name} photo={participant.image} size={40} />
                <View style={styles.participantBody}>
                  <Body>{participant.name}</Body>
                  <View style={styles.participantPresence}>
                    <PresenceDot isOnline={participant.isOnline} />
                    <Caption>
                      {participant.role} ·{" "}
                      {participant.isOnline ? t("msg.online") : t("msg.offline")}
                    </Caption>
                  </View>
                </View>
                <Caption tone="faint">{t("messages.start")}</Caption>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  participantBody: { flex: 1, gap: spacing.xs },
  participantPresence: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  participantRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  participantStart: { padding: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
