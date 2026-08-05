import { FileText, Plus } from "lucide-react";
import type { ChangeEvent, JSX } from "react";
import { useRef } from "react";

import {
  LectureChaptersEditor,
  type DraftVideoChapter
} from "@/components/courses/lecture-chapters-editor";
import { PdfLecturePreview, VideoLecturePreview } from "@/components/courses/course-lecture-preview";
import { VideoUploader } from "@/components/uploads/video-uploader";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/locale-context";

export type AuthoringLectureType = "EXAM" | "PDF" | "VIDEO";
export type VideoMode = "VIDEO_LINK" | "VIDEO_UPLOAD";

export interface LectureDraft {
  chapters: readonly DraftVideoChapter[];
  description: string;
  /**
   * Only read when `type` is EXAM. A Test is one kind for its whole life, and
   * the rest of these are the same settings the exam page saves — set here so a
   * teacher does not have to open the exam again just to cap its attempts.
   */
  examDurationInMinutes: number | null;
  examIsPublished: boolean;
  examLockAnswerOnSelect: boolean;
  examMaxAttempts: number | null;
  examPassingScore: number | null;
  examType: "MCQ" | "WRITTEN";
  existingPdfUrl: string;
  isPreview: boolean;
  isPublished: boolean;
  pdfFile: File | null;
  title: string;
  type: AuthoringLectureType;
  videoMode: VideoMode;
  videoUrl: string;
}


/**
 * The add/edit composer for a chapter's items: a lecture, a PDF, or an exam.
 *
 * Split out of `CourseLectureBuilder` when the exam branch grew its own kind
 * picker and settings — the parent was over the repo's 800-line ceiling, and
 * the composer only ever reads and writes one draft.
 */
export function LectureComposer({
  draft,
  isEditing,
  isWorking,
  onCancel,
  onChange,
  onSave
}: {
  draft: LectureDraft;
  isEditing: boolean;
  isWorking: boolean;
  onCancel: () => void;
  onChange: (draft: LectureDraft) => void;
  onSave: () => void;
}): JSX.Element {
  const t = useT();
  // Read by the "add chapter at current time" button, updated on every
  // preview tick -- a ref rather than state so scrubbing the preview
  // doesn't re-render this whole form on every frame.
  const previewTimeRef = useRef(0);
  const availableTypes: readonly AuthoringLectureType[] = isEditing
    ? ["VIDEO", "PDF"]
    : ["VIDEO", "PDF", "EXAM"];

  const typeLabel: Record<AuthoringLectureType, string> = {
    EXAM: t("author.exam"),
    PDF: t("author.pdf"),
    VIDEO: t("author.video")
  };

  return (
    <section className="space-y-5 border border-hairline bg-card p-5 sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lecture-name">
            {t("author.lectureName")} <span className="text-error">*</span>
          </Label>
          <Input
            id="lecture-name"
            placeholder={
              draft.type === "EXAM"
                ? t("author.examTitlePlaceholder")
                : t("author.lectureNamePlaceholder")
            }
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lecture-description">{t("author.descriptionOptional")}</Label>
          <Input
            id="lecture-description"
            placeholder={t("author.lectureDescriptionPlaceholder")}
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("author.lectureType")}</Label>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((type) => (
            <FilterPill
              isSelected={draft.type === type}
              key={type}
              onClick={() => onChange({ ...draft, type })}
            >
              {typeLabel[type]}
            </FilterPill>
          ))}
        </div>
      </div>

      {draft.type === "VIDEO" ? (
        <div className="space-y-2 border-t border-hairline pt-5">
          <p className="text-base font-light text-muted">{t("author.videoHint")}</p>
          <VideoUploader
            disabled={isWorking}
            label={t("author.video")}
            value={{ mode: draft.videoMode, videoUrl: draft.videoUrl }}
            onValueChange={(value) =>
              onChange({ ...draft, videoMode: value.mode, videoUrl: value.videoUrl })
            }
          />
          <VideoLecturePreview
            chapters={draft.chapters}
            onTimeUpdate={(seconds) => {
              previewTimeRef.current = seconds;
            }}
            url={draft.videoUrl}
          />
          <LectureChaptersEditor
            chapters={draft.chapters}
            currentTimeSeconds={() => previewTimeRef.current}
            onChange={(next) => onChange({ ...draft, chapters: next })}
          />
        </div>
      ) : null}

      {draft.type === "PDF" ? (
        <div className="space-y-3 border-t border-hairline pt-5">
          <input
            accept="application/pdf"
            className="hidden"
            id="lecture-pdf"
            type="file"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...draft, pdfFile: event.target.files?.[0] ?? null })
            }
          />
          <label
            className="flex min-h-11 cursor-pointer items-center justify-center border border-dashed border-dot-idle bg-panel-warm px-4 text-sm font-medium text-ink hover:border-line-strong"
            htmlFor="lecture-pdf"
          >
            <FileText className="mr-2 size-4" />
            {t("author.pdfChoose")}
          </label>
          <p className="text-sm font-light text-muted">
            {draft.pdfFile
              ? t("author.pdfSelected", { name: draft.pdfFile.name })
              : t("author.pdfHint")}
          </p>
          <PdfLecturePreview existingUrl={draft.existingPdfUrl} file={draft.pdfFile} />
        </div>
      ) : null}

      {draft.type === "EXAM" ? (
        <div className="space-y-3 border-t border-hairline pt-5">
          <Label>{t("author.examKind")}</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["MCQ", "WRITTEN"] as const).map((examType) => (
              <button
                aria-pressed={draft.examType === examType}
                className={`border p-4 text-left transition-colors ${
                  draft.examType === examType
                    ? "border-accent bg-accent/8"
                    : "border-hairline bg-panel-warm/40 hover:border-line-strong"
                }`}
                key={examType}
                type="button"
                onClick={() => onChange({ ...draft, examType })}
              >
                <span className="block text-sm font-medium text-ink">
                  {examType === "MCQ" ? t("author.examKindMcq") : t("author.examKindWritten")}
                </span>
                <span className="mt-1 block text-sm font-light leading-relaxed text-muted">
                  {examType === "MCQ"
                    ? t("author.examKindMcqHint")
                    : t("author.examKindWrittenHint")}
                </span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="exam-duration">{t("ab.duration")}</Label>
              <Input
                id="exam-duration"
                min={1}
                type="number"
                value={draft.examDurationInMinutes ?? ""}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    examDurationInMinutes:
                      event.target.value === "" ? null : Number(event.target.value)
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-pass-score">{t("ab.passScore")}</Label>
              <Input
                id="exam-pass-score"
                min={0}
                step={0.5}
                type="number"
                value={draft.examPassingScore ?? ""}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    examPassingScore: event.target.value === "" ? null : Number(event.target.value)
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-max-attempts">{t("ab.maxAttempts")}</Label>
              <Input
                id="exam-max-attempts"
                min={1}
                placeholder={t("ab.maxAttemptsHint")}
                title={t("ab.maxAttemptsHint")}
                type="number"
                value={draft.examMaxAttempts ?? ""}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    examMaxAttempts: event.target.value === "" ? null : Number(event.target.value)
                  })
                }
              />
            </div>
          </div>

          {draft.examType === "MCQ" ? (
            <label className="flex min-h-11 items-start gap-3 border border-hairline bg-panel-warm/40 p-4">
              <input
                checked={draft.examLockAnswerOnSelect}
                className="mt-1 size-4 accent-accent"
                type="checkbox"
                onChange={(event) =>
                  onChange({ ...draft, examLockAnswerOnSelect: event.target.checked })
                }
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  {t("ab.lockAnswerOnSelect")}
                </span>
                <span className="mt-1 block text-sm font-light text-muted">
                  {t("ab.lockAnswerOnSelectHint")}
                </span>
              </span>
            </label>
          ) : null}

          <label className="flex min-h-11 items-start gap-3 border border-hairline bg-panel-warm/40 p-4">
            <input
              checked={draft.examIsPublished}
              className="mt-1 size-4 accent-accent"
              type="checkbox"
              onChange={(event) => onChange({ ...draft, examIsPublished: event.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium text-ink">{t("ab.publishNow")}</span>
              <span className="mt-1 block text-sm font-light text-muted">{t("ab.studentView")}</span>
            </span>
          </label>

          <p className="text-base font-light text-muted">{t("author.examLead")}</p>
        </div>
      ) : null}

      {draft.type !== "EXAM" ? (
        <div className="space-y-3 border-t border-hairline pt-5">
          <label className="flex min-h-11 items-center gap-3">
            <input
              checked={draft.isPreview}
              type="checkbox"
              onChange={(event) => onChange({ ...draft, isPreview: event.target.checked })}
            />
            <span className="text-sm text-ink">{t("cb.allowPreview")}</span>
          </label>
          <label className="flex min-h-11 items-start gap-3 border border-hairline bg-panel-warm/40 p-4">
            <input
              checked={draft.isPublished}
              className="mt-1 size-4 accent-accent"
              type="checkbox"
              onChange={(event) => onChange({ ...draft, isPublished: event.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium text-ink">{t("ab.publishNow")}</span>
              <span className="mt-1 block text-sm font-light text-muted">{t("ab.studentView")}</span>
            </span>
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3 border-t border-hairline pt-5">
        {isEditing ? (
          <Button className="h-11" variant="ghost" onClick={onCancel}>
            {t("action.cancel")}
          </Button>
        ) : null}
        <Button className="h-11" disabled={isWorking || !draft.title.trim()} onClick={onSave}>
          <Plus className="size-4" />
          {draft.type === "EXAM" ? t("author.saveExam") : t("author.saveLecture")}
        </Button>
      </div>
    </section>
  );
}
