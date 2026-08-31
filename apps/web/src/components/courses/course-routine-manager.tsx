import { isEmptyRichText } from "@mma/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, X } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUploader } from "@/components/uploads/file-uploader";
import {
  type CourseRoutine,
  deleteCourseRoutine,
  getCourseRoutine,
  saveCourseRoutine
} from "@/lib/api/course-routines";
import { uploadCourseMaterial } from "@/lib/api/uploads";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/**
 * Write a course's routine, attach one, or do both.
 *
 * There is one routine per course, so this is an editor seeded from whatever
 * is saved rather than a composer that stacks entries the way the noticeboard
 * does. Saving replaces; the two halves are independent and either alone is a
 * complete routine.
 */
export function CourseRoutineManager({ courseId }: { courseId: string }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const { data: routine = null, isPending } = useQuery<CourseRoutine | null>({
    queryFn: async () => getCourseRoutine(courseId),
    queryKey: queryKeys.routines.course(courseId)
  });

  // Seeded from the server copy whenever it changes, so opening the page on a
  // course that already has a routine starts from it rather than from blank.
  useEffect(() => {
    setContent(routine?.content ?? "");
    setAttachmentUrl(routine?.attachmentUrl ?? "");
    setAttachmentName(routine?.attachmentName ?? "");
  }, [routine]);

  const reload = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.routines.course(courseId) });
  };

  const hasWritten = content.length > 0 && !isEmptyRichText(content);
  const hasAttachment = attachmentUrl.trim().length > 0;

  const handleSave = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (!hasWritten && !hasAttachment) {
      toast.error(t("routine.needSomething"));

      return;
    }

    setIsSaving(true);

    try {
      await saveCourseRoutine(courseId, {
        attachmentName: hasAttachment ? attachmentName.trim() : null,
        attachmentUrl: hasAttachment ? attachmentUrl.trim() : null,
        content: hasWritten ? content : null
      });
      toast.success(t("routine.saved"));
      await reload();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);

    try {
      await deleteCourseRoutine(courseId);
      toast.success(t("routine.removed"));
      setContent("");
      setAttachmentUrl("");
      setAttachmentName("");
      await reload();
    } catch {
      toast.error(t("routine.deleteFailed"));
    } finally {
      setIsConfirmingDelete(false);
      setIsDeleting(false);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-6 border border-hairline bg-card p-5 sm:p-6"
        onSubmit={(event) => void handleSave(event)}
      >
        <div className="space-y-2">
          <Label htmlFor="routine-body">{t("routine.written")}</Label>
          <RichTextEditor
            id="routine-body"
            onChange={(value) => setContent(value)}
            placeholder={t("routine.writtenPlaceholder")}
            value={content}
          />
          <p className="text-xs text-muted-light">{t("routine.writtenHint")}</p>
        </div>

        <div className="space-y-3 border-t border-hairline pt-6">
          <FileUploader
            accept="application/pdf"
            buttonLabel={t("routine.chooseFile")}
            description={t("routine.attachmentHint")}
            disabled={isSaving}
            id="routine-attachment"
            label={t("routine.attachment")}
            onUploadFile={async (file, onProgress) => {
              // The uploader hands back only a URL, so the file's own name is
              // captured here or the link would read as a bare URL later.
              setAttachmentName(file.name);

              return uploadCourseMaterial(file, onProgress);
            }}
            onValueChange={setAttachmentUrl}
            successMessage={t("routine.attachmentUploaded")}
            value={attachmentUrl}
          />

          {hasAttachment ? (
            <div className="space-y-2">
              <Label htmlFor="routine-attachment-name">{t("routine.attachmentName")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="routine-attachment-name"
                  maxLength={255}
                  onChange={(event) => setAttachmentName(event.target.value)}
                  placeholder={t("routine.attachmentNamePlaceholder")}
                  value={attachmentName}
                />
                <Button
                  className="shrink-0"
                  onClick={() => {
                    setAttachmentUrl("");
                    setAttachmentName("");
                  }}
                  type="button"
                  variant="outline"
                >
                  <X className="size-4" />
                  {t("routine.clearAttachment")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-light">
            {routine
              ? t("routine.lastSaved", {
                  name: routine.updatedBy.name,
                  when: format.date(routine.updatedAt)
                })
              : t("routine.neverSaved")}
          </p>
          <div className="flex gap-3">
            {routine ? (
              <Button
                className="text-error"
                disabled={isSaving}
                onClick={() => setIsConfirmingDelete(true)}
                type="button"
                variant="outline"
              >
                <Trash2 className="size-4" />
                {t("routine.delete")}
              </Button>
            ) : null}
            <Button className="h-11" disabled={isSaving} type="submit">
              {isSaving ? t("routine.saving") : t("routine.save")}
            </Button>
          </div>
        </div>
      </form>

      {hasAttachment ? (
        <a
          className="flex items-center gap-3 border border-hairline bg-card px-5 py-4 text-sm text-ink transition-colors hover:bg-row-hover"
          href={attachmentUrl}
          rel="noreferrer"
          target="_blank"
        >
          <FileText aria-hidden="true" className="size-4 shrink-0 text-accent" />
          <span className="truncate">{attachmentName.trim() || attachmentUrl}</span>
        </a>
      ) : null}

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        confirmLabel={t("routine.delete")}
        dangerous
        description={t("routine.deleteConfirm")}
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={() => void handleDelete()}
        open={isConfirmingDelete}
        pending={isDeleting}
        title={t("routine.delete")}
      />
    </div>
  );
}
