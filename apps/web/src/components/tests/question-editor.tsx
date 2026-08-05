import type { ChangeEvent, JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { QuestionDraft } from "@/components/tests/question-draft";
import { OptionTextInput } from "@/components/tests/option-text-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { TestType } from "@/lib/api/tests";
import { uploadQuestionImage } from "@/lib/api/uploads";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The question form, used twice by `AssessmentBuilder` — once to add a question
 * and once to edit one in place. It owns no state; the builder holds the draft.
 */
export interface QuestionEditorProps {
  draft: QuestionDraft;
  isWorking: boolean;
  onCancel?: (() => void) | undefined;
  onChange: (draft: QuestionDraft) => void;
  onSave: () => void;
  /** The Test decides what a question needs — options, or a marking guide. */
  testType: TestType;
}

export function QuestionEditor({
  draft,
  isWorking,
  onCancel,
  onChange,
  onSave,
  testType
}: QuestionEditorProps): JSX.Element {
  const t = useT();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImages = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setIsUploadingImage(true);

    try {
      const uploaded = await Promise.all(files.slice(0, 8).map((file) => uploadQuestionImage(file)));
      onChange({
        ...draft,
        images: [
          ...draft.images,
          ...uploaded.map((upload) => ({ fileUrl: upload.fileUrl, uploadId: upload.id }))
        ].slice(0, 8)
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("script.uploadFailed"));
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[0.75fr_0.25fr]">
        <div className="space-y-1 md:col-start-2">
          <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/60">{t("qe.marks")}</Label>
          <Input
            className="h-10"
            min={0.5}
            step={0.5}
            type="number"
            value={draft.marks}
            onChange={(event) =>
              onChange({
                ...draft,
                marks: Number(event.target.value)
              })
            }
          />
        </div>
      </div>
      <RichTextEditor
        placeholder={t("qe.prompt")}
        value={draft.questionText}
        onChange={(value) =>
          onChange({
            ...draft,
            questionText: value
          })
        }
      />
      <div className="space-y-2">
        <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/60">
          {t("qe.images")}
        </Label>
        {draft.images.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {draft.images.map((image) => (
              <div
                key={image.uploadId}
                className="space-y-1 rounded-[var(--radius)] border border-hairline bg-panel-warm p-1.5"
              >
                <ResponsiveImage
                  alt=""
                  className="block w-full rounded-[calc(var(--radius)-0.125rem)]"
                  sizes="(min-width: 768px) 14rem, 45vw"
                  src={image.fileUrl}
                />
                <Button
                  size="xs"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onChange({
                      ...draft,
                      images: draft.images.filter((item) => item.uploadId !== image.uploadId)
                    })
                  }
                >
                  {t("qe.removeImage")}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <input
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          multiple
          type="file"
          onChange={(event) => void handleImages(event)}
        />
        <Button
          disabled={isUploadingImage || draft.images.length >= 8}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => imageInputRef.current?.click()}
        >
          {t("qe.addImage")}
        </Button>
      </div>
      {testType === "MCQ" ? (
        <div className="space-y-2.5">
          {draft.options.map((option, index) => (
            <div
              key={`${index}-${option.optionText}`}
              className="grid gap-2 md:grid-cols-[auto_1fr]"
            >
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  checked={option.isCorrect}
                  className="h-4 w-4 accent-(--secondary-container)"
                  type="checkbox"
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      options: draft.options.map((currentOption, optionIndex) =>
                        optionIndex === index
                          ? {
                              ...currentOption,
                              isCorrect: event.target.checked
                            }
                          : currentOption
                      )
                    })
                  }
                />{t("qe.correct")}</label>
              <OptionTextInput
                className="h-10"
                placeholder={`Option ${index + 1}`}
                value={option.optionText}
                onChange={(optionText) =>
                  onChange({
                    ...draft,
                    options: draft.options.map((currentOption, optionIndex) =>
                      optionIndex === index ? { ...currentOption, optionText } : currentOption
                    )
                  })
                }
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...draft,
                  options: [...draft.options, { isCorrect: false, optionText: "" }]
                })
              }
            >{t("qe.addOption")}</Button>
            {draft.options.length > 2 ? (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...draft,
                    options: draft.options.slice(0, -1)
                  })
                }
              >{t("qe.removeLast")}</Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/60">
            {t("qe.markingGuide")}
          </Label>
          <p className="text-xs text-ink/62">{t("qe.markingGuideHint")}</p>
          <RichTextEditor
            placeholder={t("qe.markingGuide")}
            value={draft.markingGuide}
            onChange={(value) =>
              onChange({
                ...draft,
                markingGuide: value
              })
            }
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-9" disabled={isWorking} onClick={onSave}>{t("qe.save")}</Button>
        {onCancel ? (
          <Button
            type="button"
            className="h-9"
            variant="outline"
            disabled={isWorking}
            onClick={onCancel}
          >{t("common.cancel")}</Button>
        ) : null}
      </div>
    </div>
  );
}
