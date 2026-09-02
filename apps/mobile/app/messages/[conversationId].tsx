import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Heading,
  Screen,
  ScreenSkeleton,
  SkeletonBlock
} from "@/src/components/ui";
import { PresenceDot } from "@/src/components/ui-display";
import {
  getConversation,
  markConversationRead,
  reportConversation,
  sendMessage
} from "@/src/lib/api/messages";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useMessagingSocket } from "@/src/lib/use-messaging-socket";
import { useSession } from "@/src/lib/use-session";
import { colors, fonts, radius, spacing } from "@/src/theme/tokens";

const MINIMUM_REPORT_LENGTH = 10;
const POLL_INTERVAL_MS = 10_000;
/** Long enough to cover a pause between words, short enough to stop feeling stuck. */
const TYPING_IDLE_MS = 2_000;

export default function ConversationScreen(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (typingTimeout.current !== null) {
        clearTimeout(typingTimeout.current);
      }
    },
    []
  );

  const { isPending: isSessionPending, session } = useSession();
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const { isConnected, sendTyping } = useMessagingSocket({
    conversationId,
    currentUserId: session?.user.id ?? null,
    enabled: Boolean(session),
    onTypingChange: setIsPeerTyping
  });

  const { data: thread, isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: async () => getConversation(conversationId),
    queryKey: queryKeys.conversation(conversationId),
    // The socket is the fast path; the poll is what is left when it is down —
    // on a bad network, or while the app is in the background. Neither is the
    // rule on its own.
    refetchInterval: isConnected ? false : POLL_INTERVAL_MS
  });

  useEffect(() => {
    if (!session) {
      return;
    }

    const markRead = async (): Promise<void> => {
      try {
        await markConversationRead(conversationId);
        await queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      } catch {
        // A badge that takes one more refresh is harmless; surfacing this would
        // interrupt the conversation the student did successfully open.
      }
    };

    void markRead();
  }, [conversationId, queryClient, session]);

  // Announced on the first keystroke and withdrawn after a pause, so the other
  // side sees "typing…" rather than one event per character.
  const handleDraftChange = (text: string): void => {
    setDraft(text);
    sendTyping("typing:start");

    if (typingTimeout.current !== null) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      sendTyping("typing:stop");
    }, TYPING_IDLE_MS);
  };

  const send = useMutation({
    mutationFn: async (content: string) => sendMessage(conversationId, content),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: async () => {
      setDraft("");
      setError(null);
      sendTyping("typing:stop");
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    }
  });

  const report = useMutation({
    mutationFn: async (reason: string) => reportConversation(conversationId, reason),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: () => {
      setError(null);
      setIsReporting(false);
      setReportReason("");
      setNotice(t("msg.reportSent"));
    }
  });

  if (isSessionPending) {
    return <ScreenSkeleton rows={4} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (isPending) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          {[0, 1, 2, 3].map((key) => (
            <SkeletonBlock height={64} key={key} width={key % 2 === 0 ? "70%" : "60%"} />
          ))}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerTitle: () =>
            thread ? (
              <View style={styles.headerTitle}>
                <Text numberOfLines={1} style={styles.headerName}>
                  {thread.conversation.user.name}
                </Text>
                <View style={styles.headerPresence}>
                  <PresenceDot isOnline={thread.conversation.user.isOnline} />
                  <Caption>
                    {thread.conversation.user.isOnline ? t("msg.online") : t("msg.offline")}
                  </Caption>
                </View>
              </View>
            ) : (
              <Text style={styles.headerName}>{t("msg.conversationTitle")}</Text>
            )
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {notice ? <Badge tone="faded">{notice}</Badge> : null}
          {error ? <ErrorNotice message={error} /> : null}

          {(thread?.items ?? []).map((message) => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.isOwn ? styles.bubbleOwn : styles.bubbleOther,
                message.isHidden ? styles.bubbleHidden : null
              ]}
            >
              {/* A hidden message keeps its place in the thread as a tombstone.
                  The original is retained server-side for admin review. ADR-0004. */}
              <Body muted={message.isHidden}>{message.content}</Body>
              <Caption>{format.dateTime(message.createdAt)}</Caption>
            </View>
          ))}

          {isReporting ? (
            <Card>
              <Heading>{t("msg.reportTitle")}</Heading>
              <View style={{ height: spacing.sm }} />
              <Body muted>{t("msg.reportDisclaimer")}</Body>
              <View style={{ height: spacing.md }} />
              <TextInput
                accessibilityLabel={t("msg.whatHappened")}
                multiline
                onChangeText={setReportReason}
                placeholder={t("msg.whatHappened")}
                placeholderTextColor={colors.placeholder}
                selectionColor={colors.accent}
                style={styles.reportInput}
                value={reportReason}
              />
              <View style={{ height: spacing.md }} />
              <Button
                disabled={reportReason.trim().length < MINIMUM_REPORT_LENGTH}
                isBusy={report.isPending}
                label={t("msg.submitReport")}
                onPress={() => report.mutate(reportReason.trim())}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                label={t("action.cancel")}
                onPress={() => setIsReporting(false)}
                variant="ghost"
              />
            </Card>
          ) : (
            <Pressable
              accessibilityLabel={t("msg.reportTitle")}
              accessibilityRole="button"
              onPress={() => setIsReporting(true)}
              style={styles.reportLink}
            >
              <Caption>{t("msg.reportTitle")}</Caption>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.composer}>
          {isPeerTyping ? (
            <Caption>{t("msg.typing", { name: thread?.conversation.user.name ?? "" })}</Caption>
          ) : null}
          <TextInput
            accessibilityLabel={t("msg.placeholder")}
            multiline
            onChangeText={handleDraftChange}
            placeholder={t("msg.placeholder")}
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.accent}
            style={styles.composerInput}
            value={draft}
          />
          <Button
            disabled={draft.trim().length === 0}
            isBusy={send.isPending}
            label={t("msg.send")}
            onPress={() => send.mutate(draft.trim())}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 18,
    gap: 4,
    maxWidth: "82%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  bubbleHidden: {
    backgroundColor: colors.panelWarm,
    borderColor: colors.hairlineFaint,
    borderStyle: "dashed",
    borderWidth: 0.5
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderBottomLeftRadius: 6
  },
  bubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: colors.chipActive,
    borderBottomRightRadius: 6,
    borderColor: colors.accent,
    borderWidth: 0.5
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: colors.background,
    borderTopColor: colors.hairlineFaint,
    borderTopWidth: 0.5,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  composerInput: {
    backgroundColor: colors.card,
    borderColor: colors.hairlineFaint,
    borderRadius: 20,
    borderWidth: 0.5,
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  content: { gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1 },
  headerName: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17 },
  headerPresence: { alignItems: "center", flexDirection: "row", gap: spacing.xs, marginTop: 2 },
  headerTitle: { maxWidth: 220 },
  reportInput: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.sm,
    color: colors.ink,
    minHeight: 96,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  reportLink: { alignSelf: "center", padding: spacing.md }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
