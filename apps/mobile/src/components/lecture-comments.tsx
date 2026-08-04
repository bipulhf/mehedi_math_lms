import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JSX } from "react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  Body,
  Button,
  Caption,
  Card,
  ErrorNotice,
  Field,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { createLectureComment, listLectureComments, type LectureComment } from "@/src/lib/api";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { colors, spacing } from "@/src/theme/tokens";

/**
 * Lecture discussion — the one place a student asks a question mid-lesson.
 *
 * Replies are one level deep, the same as the web client. A deleted comment
 * keeps its place as a tombstone rather than vanishing, so a reply below it
 * still has something to hang from.
 */

function CommentBody({ comment }: { comment: LectureComment }): JSX.Element {
  const t = useT();

  if (comment.isDeleted) {
    return <Body muted>{t("comment.removed")}</Body>;
  }

  return <Body>{comment.content}</Body>;
}

function CommentThread({
  comment,
  onReply
}: {
  comment: LectureComment;
  onReply: (parentId: string) => void;
}): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <View style={styles.thread}>
      <View style={styles.comment}>
        <View style={styles.commentHeader}>
          <Caption>{comment.user.name}</Caption>
          <Caption>{format.date(comment.createdAt)}</Caption>
        </View>
        <CommentBody comment={comment} />
        {comment.isDeleted ? null : (
          <Button label={t("disc.reply")} onPress={() => onReply(comment.id)} variant="ghost" />
        )}
      </View>
      {comment.replies.map((reply) => (
        <View key={reply.id} style={styles.reply}>
          <View style={styles.commentHeader}>
            <Caption>{reply.user.name}</Caption>
            <Caption>{format.date(reply.createdAt)}</Caption>
          </View>
          <CommentBody comment={reply} />
        </View>
      ))}
    </View>
  );
}

export function LectureComments({ lectureId }: { lectureId: string }): JSX.Element {
  const t = useT();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: comments = [], isPending } = useQuery({
    queryFn: async () => listLectureComments(lectureId),
    queryKey: queryKeys.lectureComments(lectureId)
  });

  const post = useMutation({
    mutationFn: async () =>
      createLectureComment({
        content: draft.trim(),
        lectureId,
        parentId: replyTo ?? undefined
      }),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: async () => {
      setDraft("");
      setReplyTo(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.lectureComments(lectureId) });
    }
  });

  return (
    <Card>
      <Title>{t("disc.title")}</Title>
      <View style={{ height: spacing.md }} />

      {error ? (
        <>
          <ErrorNotice message={error} />
          <View style={{ height: spacing.md }} />
        </>
      ) : null}

      <View style={styles.composer}>
        {replyTo === null ? null : (
          <View style={styles.replyBanner}>
            <Caption>{t("comment.replyingTo")}</Caption>
            <Button label={t("action.cancel")} onPress={() => setReplyTo(null)} variant="ghost" />
          </View>
        )}
        <Field
          label={replyTo === null ? t("comment.askLabel") : t("comment.replyLabel")}
          multiline
          onChangeText={setDraft}
          placeholder={t("comment.placeholder")}
          style={styles.multiline}
          value={draft}
        />
        <Button
          disabled={draft.trim().length === 0}
          isBusy={post.isPending}
          label={t("comment.post")}
          onPress={() => {
            setError(null);
            post.mutate();
          }}
        />
      </View>

      {isPending ? (
        <View style={styles.skeleton}>
          <SkeletonBlock height={14} width="40%" />
          <SkeletonBlock height={14} />
        </View>
      ) : comments.length === 0 ? (
        <Body muted>{t("comment.empty")}</Body>
      ) : (
        comments.map((comment) => (
          <CommentThread comment={comment} key={comment.id} onReply={setReplyTo} />
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  comment: { gap: spacing.xs },
  commentHeader: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  composer: { gap: spacing.md, paddingBottom: spacing.lg },
  multiline: { minHeight: 80, paddingTop: spacing.md, textAlignVertical: "top" },
  reply: {
    borderLeftColor: colors.hairline,
    borderLeftWidth: 2,
    gap: spacing.xs,
    marginLeft: spacing.md,
    paddingLeft: spacing.md
  },
  replyBanner: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  skeleton: { gap: spacing.sm },
  thread: { gap: spacing.sm, paddingVertical: spacing.sm }
});
