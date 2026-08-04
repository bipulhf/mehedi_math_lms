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
  Heading,
  PresenceDot,
  Screen,
  SkeletonBlock
} from "@/src/components/ui";
import {
  getConversation,
  markConversationRead,
  reportConversation,
  sendMessage
} from "@/src/lib/api";
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
      setNotice(t("msg.reportSent"));
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
        <ScrollView contentContainerStyle={styles.content}>
          {notice ? <Badge tone="faded">{notice}</Badge> : null}

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
                multiline
                onChangeText={setReportReason}
                placeholder={t("msg.whatHappened")}
                placeholderTextColor={colors.placeholder}
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
              <Button label={t("action.cancel")} onPress={() => setIsReporting(false)} variant="ghost" />
            </Card>
          ) : (
            <Pressable onPress={() => setIsReporting(true)} style={styles.reportLink}>
              <Caption>{t("msg.reportTitle")}</Caption>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.composer}>
          {isPeerTyping ? (
            <Caption>{t("msg.typing", { name: thread?.conversation.user.name ?? "" })}</Caption>
          ) : null}
          <TextInput
            multiline
            onChangeText={handleDraftChange}
            placeholder={t("msg.placeholder")}
            placeholderTextColor={colors.placeholder}
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
    borderRadius: radius.sm,
    gap: spacing.xs,
    maxWidth: "85%",
    padding: spacing.md
  },
  bubbleHidden: {
    backgroundColor: colors.panelWarm,
    borderColor: colors.hairline,
    borderStyle: "dashed",
    borderWidth: 1
  },
  bubbleOther: { alignSelf: "flex-start", backgroundColor: colors.card },
  bubbleOwn: { alignSelf: "flex-end", backgroundColor: colors.chipActive },
  composer: {
    backgroundColor: colors.card,
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  composerInput: {
    backgroundColor: colors.panelWarm,
    borderRadius: radius.sm,
    color: colors.ink,
    maxHeight: 120,
    minHeight: 48,
    padding: spacing.md
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
