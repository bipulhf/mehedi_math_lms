import { MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { CommentThreadSkeleton } from "@/components/common/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/hooks/use-auth-session";
import { queryKeys } from "@/lib/query/keys";
import type { LectureComment } from "@/lib/api/comments";
import {
  createLectureComment,
  deleteComment,
  listLectureComments,
  updateComment
} from "@/lib/api/comments";

interface LectureDiscussionProps {
  lectureId: string;
}

function roleTone(role: LectureComment["user"]["role"]): "blue" | "gray" | "green" | "violet" {
  if (role === "ADMIN") {
    return "violet";
  }

  if (role === "TEACHER") {
    return "blue";
  }

  if (role === "STUDENT") {
    return "green";
  }

  return "gray";
}

function Avatar({ comment }: { comment: LectureComment }): JSX.Element {
  if (comment.user.image) {
    return (
      <ResponsiveImage
        sizes="40px"
        alt={comment.user.name}
        className="size-10 rounded-full object-cover"
        src={comment.user.image}
      />
    );
  }

  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-surface-container-highest text-sm font-semibold text-on-surface">
      {comment.user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function CommentComposer({
  isPending,
  onCancel,
  onSubmit,
  placeholder,
  submitLabel,
  value
}: {
  isPending: boolean;
  onCancel?: (() => void) | undefined;
  onSubmit: (value: string) => Promise<void>;
  placeholder: string;
  submitLabel: string;
  value?: string | undefined;
}): JSX.Element {
  const [content, setContent] = useState(value ?? "");

  useEffect(() => {
    setContent(value ?? "");
  }, [value]);

  return (
    <div className="space-y-3">
      <Textarea
        className="min-h-24"
        placeholder={placeholder}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={isPending || content.trim().length === 0}
          onClick={() => void onSubmit(content)}
        >
          {isPending ? "Saving" : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  onUpdate,
  replyTargetId,
  submittingReplyId,
  updatingId
}: {
  comment: LectureComment;
  currentUserId?: string | undefined;
  onDelete: (id: string) => Promise<void>;
  onReply: (parentId: string, content: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
  replyTargetId: string | null;
  submittingReplyId: string | null;
  updatingId: string | null;
}): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-start gap-3">
        <Avatar comment={comment} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-on-surface">{comment.user.name}</p>
            <Badge tone={roleTone(comment.user.role)}>{comment.user.role}</Badge>
            {comment.isOwn ? <Badge tone="gray">You</Badge> : null}
            <span className="text-xs text-on-surface/54">
              {new Date(comment.createdAt).toLocaleString()}
            </span>
          </div>

          {isEditing ? (
            <CommentComposer
              isPending={updatingId === comment.id}
              placeholder="Refine your comment"
              submitLabel="Save changes"
              value={comment.content ?? ""}
              onCancel={() => setIsEditing(false)}
              onSubmit={async (value) => {
                await onUpdate(comment.id, value);
                setIsEditing(false);
              }}
            />
          ) : (
            <p className="text-sm leading-7 text-on-surface/72">
              {comment.isDeleted ? "This comment has been deleted." : comment.content}
            </p>
          )}

          {!comment.isDeleted ? (
            <div className="flex flex-wrap gap-2">
              {comment.parentId === null ? (
                <Button
                  variant="ghost"
                  onClick={() => onReply(comment.id, "")}
                >
                  <Reply className="size-4" />
                  Reply
                </Button>
              ) : null}
              {comment.isEditable ? (
                <Button variant="ghost" onClick={() => setIsEditing(true)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              ) : null}
              {comment.isEditable ? (
                <Button variant="ghost" onClick={() => void onDelete(comment.id)}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {replyTargetId === comment.id ? (
        <div className="pl-13">
          <CommentComposer
            isPending={submittingReplyId === comment.id}
            placeholder="Write a reply"
            submitLabel="Post reply"
            onCancel={() => onReply("", "")}
            onSubmit={(value) => onReply(comment.id, value)}
          />
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="space-y-3 border-l border-outline-variant/15 pl-4 md:pl-6">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              onUpdate={onUpdate}
              replyTargetId={replyTargetId}
              submittingReplyId={submittingReplyId}
              updatingId={updatingId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface CommentPage {
  data: readonly LectureComment[];
  pagination: { page: number; pages: number };
}

export function LectureDiscussion({ lectureId }: LectureDiscussionProps): JSX.Element {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const currentUserId = session?.user.id;
  const canDiscuss =
    session?.session.role === "STUDENT" ||
    session?.session.role === "TEACHER" ||
    session?.session.role === "ADMIN";

  const commentsQueryKey = queryKeys.comments.lecture(lectureId);
  const {
    data: commentPages,
    fetchNextPage,
    hasNextPage,
    isPending: isLoading
  } = useInfiniteQuery<CommentPage>({
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      listLectureComments(lectureId, { limit: 10, page: pageParam as number }),
    queryKey: commentsQueryKey
  });
  const comments: readonly LectureComment[] =
    commentPages?.pages.flatMap((commentPage) => commentPage.data) ?? [];

  /**
   * Posting, editing and deleting all update the loaded pages in place. The
   * server round trip has already succeeded by the time this runs, so there is
   * nothing to roll back -- this only spares the thread a full refetch.
   */
  const patchLoadedComments = (
    update: (loaded: readonly LectureComment[]) => readonly LectureComment[]
  ): void => {
    queryClient.setQueryData<{ pageParams: unknown[]; pages: CommentPage[] }>(
      commentsQueryKey,
      (current) => {
        if (!current) {
          return current;
        }

        const flattened = update(current.pages.flatMap((commentPage) => commentPage.data));
        let cursor = 0;

        return {
          ...current,
          pages: current.pages.map((commentPage) => {
            const slice = flattened.slice(cursor, cursor + commentPage.data.length);

            cursor += commentPage.data.length;

            return { ...commentPage, data: slice };
          })
        };
      }
    );
  };

  const totalLoaded = useMemo(() => comments.length, [comments.length]);

  return (
    <Card className="border-outline-variant/60 bg-surface-container-low/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          Discussion
        </CardTitle>
        <CardDescription>
          Ask questions, leave context for future learners, and keep the lecture conversation attached to the material.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canDiscuss ? (
          <CommentComposer
            isPending={isCreating}
            placeholder="Add a question, idea, or clarification for this lecture"
            submitLabel="Post comment"
            onSubmit={async (value) => {
              setIsCreating(true);

              try {
                const createdComment = await createLectureComment({
                  content: value.trim(),
                  lectureId
                });
                patchLoadedComments((loaded) => [createdComment, ...loaded]);
                toast.success("Comment posted");
              } finally {
                setIsCreating(false);
              }
            }}
          />
        ) : null}

        {isLoading && comments.length === 0 ? (
          <CommentThreadSkeleton />
        ) : comments.length === 0 ? (
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface p-4 text-sm leading-7 text-on-surface/68">
            No comments yet. Start the lecture conversation here.
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onDelete={async (id) => {
                  if (!window.confirm("Delete this comment?")) {
                    return;
                  }

                  await deleteComment(id);
                  patchLoadedComments((loaded) =>
                    loaded.map((item) =>
                      item.id === id
                        ? {
                            ...item,
                            content: null,
                            isDeleted: true,
                            isEditable: false
                          }
                        : {
                            ...item,
                            replies: item.replies.map((reply) =>
                              reply.id === id
                                ? {
                                    ...reply,
                                    content: null,
                                    isDeleted: true,
                                    isEditable: false
                                  }
                                : reply
                            )
                          }
                    )
                  );
                  toast.success("Comment deleted");
                }}
                onReply={async (parentId, content) => {
                  if (content === "") {
                    setReplyTargetId(parentId || null);
                    return;
                  }

                  setSubmittingReplyId(parentId);

                  try {
                    const createdReply = await createLectureComment({
                      content: content.trim(),
                      lectureId,
                      parentId
                    });
                    patchLoadedComments((loaded) =>
                      loaded.map((item) =>
                        item.id === parentId
                          ? {
                              ...item,
                              replies: [...item.replies, createdReply]
                            }
                          : item
                      )
                    );
                    setReplyTargetId(null);
                    toast.success("Reply posted");
                  } finally {
                    setSubmittingReplyId(null);
                  }
                }}
                onUpdate={async (id, content) => {
                  setUpdatingId(id);

                  try {
                    const updatedComment = await updateComment(id, {
                      content: content.trim()
                    });
                    patchLoadedComments((loaded) =>
                      loaded.map((item) =>
                        item.id === id
                          ? updatedComment
                          : {
                              ...item,
                              replies: item.replies.map((reply) =>
                                reply.id === id ? updatedComment : reply
                              )
                            }
                      )
                    );
                    toast.success("Comment updated");
                  } finally {
                    setUpdatingId(null);
                  }
                }}
                replyTargetId={replyTargetId}
                submittingReplyId={submittingReplyId}
                updatingId={updatingId}
              />
            ))}
          </div>
        )}

        {hasNextPage ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
            >
              Load more comments ({totalLoaded} loaded)
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
