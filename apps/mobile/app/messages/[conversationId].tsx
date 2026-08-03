import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  Screen,
  SkeletonBlock
} from "@/src/components/ui";
import {
  getConversation,
  markConversationRead,
  reportConversation,
  sendMessage
} from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { useMessagingSocket } from "@/src/lib/use-messaging-socket";
import { useSession } from "@/src/lib/use-session";
import { colors, radius, spacing } from "@/src/theme/tokens";

const MINIMUM_REPORT_LENGTH = 10;
const POLL_INTERVAL_MS = 10_000;
/** Long enough to cover a pause between words, short enough to stop feeling stuck. */
const TYPING_IDLE_MS = 2_000;

export default function ConversationScreen(): JSX.Element {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (typingTimeout.current !== null) {
        clearTimeout(typingTimeout.current);
      }
    },
    []
  );

  const { session } = useSession();
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const { isConnected, sendTyping } = useMessagingSocket({
    conversationId,
    currentUserId: session?.user.id ?? null,
    enabled: Boolean(session),
    onTypingChange: setIsPeerTyping
  });

  const { data: thread, isPending } = useQuery({
    queryFn: async () => getConversation(conversationId),
    queryKey: queryKeys.conversation(conversationId),
    // The socket is the fast path; the poll is what is left when it is down —
    // on a bad network, or while the app is in the background. Neither is the
    // rule on its own.
    refetchInterval: isConnected ? false : POLL_INTERVAL_MS
  });

  useEffect(() => {
    // Nothing awaits this, and failing to clear a badge is not worth an error
    // banner — but an uncaught rejection here would take the screen down
    // through its error boundary while the thread itself loaded fine.
    void markConversationRead(conversationId)
      .then(async () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations() }))
      .catch(() => undefined);
  }, [conversationId, queryClient]);

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
    onSuccess: async () => {
      setDraft("");
      sendTyping("typing:stop");
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    }
  });

  const report = useMutation({
    mutationFn: async (reason: string) => reportConversation(conversationId, reason),
    onSuccess: () => {
      setIsReporting(false);
      setReportReason("");
      setNotice("Reported. An administrator will review this conversation.");
    }
  });

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
      <Stack.Screen options={{ title: thread?.conversation.user.name ?? "Conversation" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {notice ? <Badge tone="positive">{notice}</Badge> : null}

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
              <Caption>{new Date(message.createdAt).toLocaleTimeString()}</Caption>
            </View>
          ))}

          {isReporting ? (
            <Card>
              <Heading>Report this conversation</Heading>
              <View style={{ height: spacing.sm }} />
              <Body muted>
                An administrator will be able to read this conversation while the report is open.
                Every time they do, it is recorded.
              </Body>
              <View style={{ height: spacing.md }} />
              <TextInput
                multiline
                onChangeText={setReportReason}
                placeholder="Describe what you are reporting"
                placeholderTextColor={colors.outline}
                style={styles.reportInput}
                value={reportReason}
              />
              <View style={{ height: spacing.md }} />
              <Button
                disabled={reportReason.trim().length < MINIMUM_REPORT_LENGTH}
                isBusy={report.isPending}
                label="Submit report"
                onPress={() => report.mutate(reportReason.trim())}
              />
              <View style={{ height: spacing.sm }} />
              <Button label="Cancel" onPress={() => setIsReporting(false)} variant="ghost" />
            </Card>
          ) : (
            <Pressable onPress={() => setIsReporting(true)} style={styles.reportLink}>
              <Caption>Report this conversation</Caption>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.composer}>
          {isPeerTyping ? <Caption>Typing…</Caption> : null}
          <TextInput
            multiline
            onChangeText={handleDraftChange}
            placeholder="Write a message"
            placeholderTextColor={colors.outline}
            style={styles.composerInput}
            value={draft}
          />
          <Button
            disabled={draft.trim().length === 0}
            isBusy={send.isPending}
            label="Send"
            onPress={() => send.mutate(draft.trim())}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radius.lg,
    gap: spacing.xs,
    maxWidth: "85%",
    padding: spacing.md
  },
  bubbleHidden: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderStyle: "dashed",
    borderWidth: 1
  },
  bubbleOther: { alignSelf: "flex-start", backgroundColor: colors.surfaceContainerLowest },
  bubbleOwn: { alignSelf: "flex-end", backgroundColor: colors.secondaryContainer },
  composer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.lg
  },
  composerInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    color: colors.onSurface,
    maxHeight: 120,
    minHeight: 48,
    padding: spacing.md
  },
  content: { gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1 },
  reportInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    color: colors.onSurface,
    minHeight: 96,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  reportLink: { alignSelf: "center", padding: spacing.md }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
