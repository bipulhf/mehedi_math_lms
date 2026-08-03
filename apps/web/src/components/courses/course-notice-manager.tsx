import { createCourseNoticeSchema } from "@genex/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, Trash2 } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CourseNotice,
  createCourseNotice,
  deleteCourseNotice,
  listCourseNotices,
  updateCourseNotice
} from "@/lib/api/course-notices";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export function CourseNoticeManager({ courseId }: { courseId: string }): JSX.Element {
  const t = useT();

  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: notices = [], isPending: loading } = useQuery<readonly CourseNotice[]>({
    queryFn: async () => listCourseNotices(courseId),
    queryKey: queryKeys.notices.course(courseId)
  });

  const load = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.notices.course(courseId) });
  };

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    const parsed = createCourseNoticeSchema.safeParse({
      content: content.trim(),
      isPinned,
      title: title.trim()
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");

      return;
    }

    setSubmitting(true);
    try {
      await createCourseNotice(courseId, parsed.data);
      toast.success(t("notice.posted"));
      setTitle("");
      setContent("");
      setIsPinned(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePin(notice: CourseNotice): Promise<void> {
    try {
      await updateCourseNotice(notice.id, { isPinned: !notice.isPinned });
      await load();
    } catch {
      toast.error(t("notice.updateFailed"));
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<CourseNotice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function executeDelete(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCourseNotice(deleteTarget.id);
      toast.success(t("notice.removed"));
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error(t("notice.deleteFailed"));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notice.title")}</CardTitle>
        <CardDescription>
          Post updates for enrolled students. They see these inside the learning player under Course notices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-[calc(var(--radius)-0.125rem)] border border-hairline/60 bg-panel-warm/60 p-4">
          <div className="space-y-2">
            <Label htmlFor="notice-title">{t("bugs.fieldTitle")}</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notice-body">{t("notice.message")}</Label>
            <textarea
              id="notice-body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              maxLength={8000}
              className="w-full rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm px-4 py-3 text-sm text-ink shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 resize-y min-h-[100px]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />{t("notice.pin")}</label>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish notice"}
          </Button>
        </form>

        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">{t("notice.published")}</p>
          {loading ? (
            <p className="text-sm text-ink/60">{t("common.loading")}</p>
          ) : notices.length === 0 ? (
            <p className="text-sm text-ink/60">{t("notice.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {notices.map((notice) => (
                <li
                  key={notice.id}
                  className="flex flex-col gap-2 rounded-[calc(var(--radius)-0.125rem)] border border-hairline/50 bg-panel-warm/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{notice.title}</p>
                    <p className="text-xs text-ink/55">
                      {notice.author.name} · {new Date(notice.createdAt).toLocaleDateString()}
                      {notice.isPinned ? " · pinned" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void togglePin(notice)}
                    >
                      <Pin className="size-4" />
                      {notice.isPinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-error"
                      onClick={() => setDeleteTarget(notice)}
                    >
                      <Trash2 className="size-4" />{t("disc.delete")}</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        cancelLabel="Cancel"
        dangerous
        confirmLabel="Delete notice"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}"? Enrolled students will no longer see it.`
            : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void executeDelete()}
        open={deleteTarget !== null}
        pending={isDeleting}
        title="Delete notice"
      />
    </Card>
  );
}
