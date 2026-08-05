import { Eye, X } from "lucide-react";
import type { ChangeEvent, JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { uploadQuestionImage } from "@/lib/api/uploads";
import { isEmptyHtml } from "@/lib/html";
import { useT } from "@/lib/i18n/locale-context";

export interface WrittenQuestionImage {
  fileUrl: string;
  uploadId: string;
}

export interface WrittenDraft {
  images: WrittenQuestionImage[];
  markingGuide: string;
  marks: number;
  questionText: string;
}

export function createEmptyWrittenDraft(): WrittenDraft {
  return { images: [], markingGuide: "", marks: 5, questionText: "" };
}

export function isValidWrittenDraft(draft: WrittenDraft): boolean {
  return !isEmptyHtml(draft.questionText) && draft.marks > 0;
}

const maxQuestionImages = 8;

/**
 * The written question form.
 *
 * A written question has no options — the student answers it on paper — so what
 * it carries instead is its marks, any diagrams, and the marking guide the
 * teacher marks against. The guide is staff-only and never reaches a student.
 */
export function WrittenQuestionForm({
  draft,
  isEditing,
  isOpen,
  isWorking,
  onCancel,
  onChange,
  onToggle,
  onSave
}: {
  draft: WrittenDraft;
  isEditing: boolean;
  isOpen: boolean;
  isWorking: boolean;
  onCancel: () => void;
  onChange: (draft: WrittenDraft) => void;
  onToggle: () => void;
  onSave: () => void;
}): JSX.Element {
  const t = useT();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImages = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      const uploaded = await Promise.all(
        files.slice(0, maxQuestionImages).map(async (file) => uploadQuestionImage(file))
      );

      onChange({
        ...draft,
        images: [
          ...draft.images,
          ...uploaded.map((upload) => ({ fileUrl: upload.fileUrl, uploadId: upload.id }))
        ].slice(0, maxQuestionImages)
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("script.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border border-hairline bg-card">
      <button
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center gap-4 p-5 text-left sm:p-6"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-medium text-ink">{t("author.writtenQuestion")}</span>
          <span className="mt-1 block text-sm font-light text-muted">
            {isEditing ? t("action.edit") : t("author.writtenAnswerHint")}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl font-light text-accent">
          {isOpen ? "-" : "+"}
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-5 border-t border-hairline p-5 sm:p-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("author.writtenQuestion")}</Label>
              <RichTextEditor
                placeholder={t("author.writtenQuestionPlaceholder")}
                value={draft.questionText}
                onChange={(value) => onChange({ ...draft, questionText: value })}
              />
            </div>
            <div className="max-w-xs space-y-2">
              <Label>{t("qe.marks")}</Label>
              {/* Half marks are ordinary in maths marking, so the step is 0.5
                  rather than 1. ADR-0008. */}
              <Input
                min={0.5}
                step={0.5}
                type="number"
                value={draft.marks}
                onChange={(event) => onChange({ ...draft, marks: Number(event.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="label-mono text-xs uppercase text-muted-faint">{t("qe.images")}</p>
              <p className="mt-1 text-sm font-light text-muted">{t("author.writtenAnswerHint")}</p>
            </div>
            {draft.images.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {draft.images.map((image) => (
                  <div className="space-y-2 border border-hairline bg-panel-warm p-2" key={image.uploadId}>
                    <ResponsiveImage
                      alt=""
                      className="block w-full"
                      sizes="(min-width: 640px) 14rem, 45vw"
                      src={image.fileUrl}
                    />
                    <Button
                      className="h-9 w-full"
                      variant="ghost"
                      onClick={() =>
                        onChange({
                          ...draft,
                          images: draft.images.filter((item) => item.uploadId !== image.uploadId)
                        })
                      }
                    >
                      <X className="size-4" />
                      {t("qe.removeImage")}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              accept="image/*"
              className="hidden"
              multiple
              ref={imageInputRef}
              type="file"
              onChange={(event) => void handleImages(event)}
            />
            <Button
              className="h-11"
              disabled={isUploading || draft.images.length >= maxQuestionImages}
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
            >
              {t("qe.addImage")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t("qe.markingGuide")}</Label>
            <p className="text-sm font-light text-muted">{t("qe.markingGuideHint")}</p>
            <RichTextEditor
              placeholder={t("qe.markingGuide")}
              value={draft.markingGuide}
              onChange={(value) => onChange({ ...draft, markingGuide: value })}
            />
          </div>

          <WrittenQuestionPreview draft={draft} />

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
            {isEditing ? (
              <Button className="h-11" variant="ghost" onClick={onCancel}>
                {t("action.cancel")}
              </Button>
            ) : null}
            <Button className="h-11" disabled={isWorking} onClick={onSave}>
              {t("qe.save")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WrittenQuestionPreview({ draft }: { draft: WrittenDraft }): JSX.Element {
  const t = useT();
  const hasQuestion = !isEmptyHtml(draft.questionText);

  return (
    <section className="space-y-4 border border-hairline bg-panel-warm/45 p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-hairline pb-4">
        <Eye className="mt-0.5 size-5 text-accent" />
        <div>
          <h4 className="text-lg font-medium text-ink">{t("editor.preview")}</h4>
          <p className="mt-1 text-sm font-light text-muted">{t("author.writtenAnswerHint")}</p>
        </div>
      </div>

      {hasQuestion ? (
        <RichTextContent
          className="text-base font-medium leading-relaxed text-ink"
          html={draft.questionText}
        />
      ) : (
        <p className="text-base font-light italic text-muted-faint">
          {t("author.writtenQuestionPlaceholder")}
        </p>
      )}

      {draft.images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {draft.images.map((image) => (
            <ResponsiveImage
              alt=""
              className="block w-full border border-hairline"
              key={image.uploadId}
              sizes="(min-width: 640px) 45vw, 90vw"
              src={image.fileUrl}
            />
          ))}
        </div>
      ) : null}

      <div className="border border-dashed border-dot-idle bg-card p-5 text-center text-sm font-light text-muted-faint">
        {t("script.empty")}
      </div>
    </section>
  );
}
