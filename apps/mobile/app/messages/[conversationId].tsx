import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
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
import { colors, radius, spacing } from "@/src/theme/tokens";

const MINIMUM_REPORT_LENGTH = 10;

export default function ConversationScreen(): JSX.Element {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: thread, isPending } = useQuery({
    // Polled rather than socket-driven: a WebSocket that reconnects on every
    // backgrounding is a worse experience on mobile than a short poll.
    queryFn: async () => getConversation(conversationId),
    queryKey: queryKeys.conversation(conversationId),
    refetchInterval: 10_000
  });

  useEffect(() => {
    void markConversationRead(conversationId).then(async () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() })
    );
  }, [conversationId, queryClient]);

  const send = useMutation({
    mutationFn: async (content: string) => sendMessage(conversationId, content),
    onSuccess: async () => {
      setDraft("");
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
          <TextInput
            multiline
            onChangeText={setDraft}
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
