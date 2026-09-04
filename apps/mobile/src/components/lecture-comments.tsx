import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JSX } from "react";
import { useState } from "react";
import { Alert, Text, View } from "react-native";

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
import { Avatar } from "@/src/components/ui-display";
import {
  createLectureComment,
  deleteLectureComment,
  type LectureComment,
  listLectureComments,
  updateLectureComment
} from "@/src/lib/api/comments";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

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

function CommentEntry({
  comment,
  isUpdating,
  onDelete,
  onReply,
  onUpdate
}: {
  comment: LectureComment;
  isUpdating: boolean;
  onDelete: (id: string) => void;
  onReply?: (parentId: string) => void;
  onUpdate: (id: string, content: string) => void;
}): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content ?? "");

  const confirmDelete = (): void => {
    Alert.alert(
      t("disc.delete"),
      "Delete this comment? Replies keep their own author and stay visible.",
      [
        { style: "cancel", text: t("action.cancel") },
        { onPress: () => onDelete(comment.id), style: "destructive", text: t("disc.delete") }
      ]
    );
  };

  return (
    <View style={styles.comment}>
      <View style={styles.commentHeader}>
        <Avatar name={comment.user.name} photo={null} size={32} />
        <Text numberOfLines={1} style={styles.commentAuthor}>
          {comment.user.name}
        </Text>
        <Text style={styles.commentTime}>{format.date(comment.createdAt)}</Text>
      </View>

      {isEditing ? (
        <View style={styles.composer}>
          <Field
            label={t("disc.editPlaceholder")}
            multiline
            onChangeText={setDraft}
            style={styles.multiline}
            value={draft}
          />
          <View style={styles.editActions}>
            <Button
              disabled={draft.trim().length === 0}
              isBusy={isUpdating}
              label={t("action.save")}
              onPress={() => {
                onUpdate(comment.id, draft.trim());
                setIsEditing(false);
              }}
            />
            <Button
              label={t("action.cancel")}
              onPress={() => setIsEditing(false)}
              variant="ghost"
            />
          </View>
        </View>
      ) : (
        <CommentBody comment={comment} />
      )}

      {comment.isDeleted || isEditing ? null : (
        <View style={styles.actionsRow}>
          {onReply ? (
            <Button label={t("disc.reply")} onPress={() => onReply(comment.id)} variant="ghost" />
          ) : null}
          {comment.isEditable ? (
            <>
              <Button
                label={t("action.edit")}
                onPress={() => {
                  setDraft(comment.content ?? "");
                  setIsEditing(true);
                }}
                variant="ghost"
              />
              <Button label={t("disc.delete")} onPress={confirmDelete} variant="ghost" />
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

function CommentThread({
  comment,
  isUpdating,
  onDelete,
  onReply,
  onUpdate
}: {
  comment: LectureComment;
  isUpdating: boolean;
  onDelete: (id: string) => void;
  onReply: (parentId: string) => void;
  onUpdate: (id: string, content: string) => void;
}): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.thread}>
      <CommentEntry
        comment={comment}
        isUpdating={isUpdating}
        onDelete={onDelete}
        onReply={onReply}
        onUpdate={onUpdate}
      />
      {comment.replies.map((reply) => (
        <View key={reply.id} style={styles.reply}>
          <CommentEntry
            comment={reply}
            isUpdating={isUpdating}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        </View>
      ))}
    </View>
  );
}

export function LectureComments({ lectureId }: { lectureId: string }): JSX.Element {
  const styles = useStyles();
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

  const update = useMutation({
    mutationFn: async ({ content, id }: { content: string; id: string }) =>
      updateLectureComment(id, content),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.lectureComments(lectureId) });
    }
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteLectureComment(id),
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: async () => {
      setError(null);
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
          icon="send"
          isBusy={post.isPending}
          label={t("comment.post")}
          onPress={() => {
            setError(null);
            post.mutate();
          }}
          stretch
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
          <CommentThread
            comment={comment}
            isUpdating={update.isPending}
            key={comment.id}
            onDelete={(id) => remove.mutate(id)}
            onReply={setReplyTo}
            onUpdate={(id, content) => update.mutate({ content, id })}
          />
        ))
      )}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  comment: { gap: spacing.sm },
  commentAuthor: { color: colors.ink, flex: 1, fontFamily: fonts.displaySemiBold, fontSize: 15 },
  commentHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  commentTime: { color: colors.mutedFaint, fontFamily: fonts.monoLabel, fontSize: 10 },
  composer: { gap: spacing.md, paddingBottom: spacing.lg },
  editActions: { flexDirection: "row", gap: spacing.sm },
  multiline: { minHeight: 80, paddingTop: spacing.md, textAlignVertical: "top" },
  // A reply is indented behind a cobalt rule rather than a grey hairline: it
  // is the one place in a thread where depth has to be read at a glance.
  reply: {
    borderLeftColor: colors.accentSoft,
    borderLeftWidth: 3,
    gap: spacing.xs,
    marginLeft: spacing.lg,
    paddingLeft: spacing.md
  },
  replyBanner: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  skeleton: { gap: spacing.sm },
  thread: {
    borderTopColor: colors.separator,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingVertical: spacing.md
  }
}));
