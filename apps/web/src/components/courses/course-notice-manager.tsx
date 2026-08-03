import { createCourseNoticeSchema } from "@genex/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff, Trash2 } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type CourseNotice,
  createCourseNotice,
  deleteCourseNotice,
  listCourseNotices,
  updateCourseNotice
} from "@/lib/api/course-notices";
import { queryKeys } from "@/lib/query/keys";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * Publish and curate the notices a course's enrolled students read in the
 * player. Admins and the course's own teachers reach it; the API enforces that.
 */
export function CourseNoticeManager({ courseId }: { courseId: string }): JSX.Element {
  const t = useT();
  const format = useFormat();

  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseNotice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: notices = [], isPending } = useQuery<readonly CourseNotice[]>({
    queryFn: async () => listCourseNotices(courseId),
    queryKey: queryKeys.notices.course(courseId)
  });

  const reload = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.notices.course(courseId) });
  };

  const handleCreate = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    const parsed = createCourseNoticeSchema.safeParse({
      content: content.trim(),
      isPinned,
      title: title.trim()
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("notice.updateFailed"));

      return;
    }

    setIsSubmitting(true);

    try {
      await createCourseNotice(courseId, parsed.data);
      toast.success(t("notice.posted"));
      setTitle("");
      setContent("");
      setIsPinned(false);
      await reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePin = async (notice: CourseNotice): Promise<void> => {
    try {
      await updateCourseNotice(notice.id, { isPinned: !notice.isPinned });
      await reload();
    } catch {
      toast.error(t("notice.updateFailed"));
    }
  };

  const executeDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteCourseNotice(deleteTarget.id);
      toast.success(t("notice.removed"));
      await reload();
    } catch {
      toast.error(t("notice.deleteFailed"));
    } finally {
      setDeleteTarget(null);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form className="space-y-4 border border-hairline bg-card p-5 sm:p-6" onSubmit={(event) => void handleCreate(event)}>
        <div className="space-y-2">
          <Label htmlFor="notice-title">{t("bugs.fieldTitle")}</Label>
          <Input
            id="notice-title"
            maxLength={255}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notice-body">{t("notice.message")}</Label>
          <Textarea
            id="notice-body"
            maxLength={8000}
            onChange={(event) => setContent(event.target.value)}
            required
            rows={5}
            value={content}
          />
        </div>

        <label className="flex items-center gap-2.5 text-base font-light text-ink">
          <input
            checked={isPinned}
            className="size-4 accent-[var(--color-accent)]"
            onChange={(event) => setIsPinned(event.target.checked)}
            type="checkbox"
          />
          {t("notice.pin")}
        </label>

        <div className="border-t border-hairline pt-5">
          <Button className="h-11" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("notice.publishing") : t("notice.publish")}
          </Button>
        </div>
      </form>

      <div className="border border-hairline bg-card">
        <p className="border-b border-hairline px-5 py-4 text-base text-muted">
          {t("notice.published")}
        </p>

        {isPending ? (
          <p className="px-5 py-6 text-base font-light text-muted">{t("common.loading")}</p>
        ) : notices.length === 0 ? (
          <EmptyState className="m-5" message={t("notice.empty")} />
        ) : (
          <ul>
            {notices.map((notice) => (
              <li
                className="flex flex-col gap-3 border-b border-hairline-fainter px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                key={notice.id}
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {notice.title}
                    {notice.isPinned ? (
                      <span className="label-mono rounded-[var(--radius-pill)] border border-hairline px-2 py-0.5 text-[11px] uppercase text-accent">
                        {t("notice.pinned")}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-light">
                    {notice.author.name} · {format.date(notice.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap text-base font-light leading-relaxed text-muted">
                    {notice.content}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button onClick={() => void togglePin(notice)} size="sm" type="button" variant="outline">
                    {notice.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                    {notice.isPinned ? t("notice.unpin") : t("notice.pinAction")}
                  </Button>
                  <Button
                    className="text-error"
                    onClick={() => setDeleteTarget(notice)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="size-4" />
                    {t("disc.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        confirmLabel={t("notice.deleteTitle")}
        dangerous
        description={
          deleteTarget ? t("notice.deleteConfirm", { title: deleteTarget.title }) : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void executeDelete()}
        open={deleteTarget !== null}
        pending={isDeleting}
        title={t("notice.deleteTitle")}
      />
    </div>
  );
}
