import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ChevronRight,
  FileCode,
  FileText,
  Link as LinkIcon,
  Plus,
  Trash2,
  Video
} from "lucide-react";
import type { ChangeEvent, JSX } from "react";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import type { LectureDraft } from "@/components/courses/lecture-draft";
import { VideoUploader } from "@/components/uploads/video-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ContentChapter, CreateChapterInput } from "@/lib/api/content";
import type { CourseDetail } from "@/lib/api/courses";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The presentational pieces of the content builder: the summary bar, the
 * add-chapter card, the chapter file list, the empty state, and the lecture
 * form. Each takes props and holds no state — the builder above them owns all
 * of it, which is why they were extractable at all.
 */

export function BuilderSummaryBar({
  chapterCount,
  courseId,
  status,
  totalLectures
}: {
  chapterCount: number;
  courseId: string;
  status: CourseDetail["status"];
  totalLectures: number;
}): JSX.Element {
  const t = useT();

  return (
    <div className="flex flex-col gap-4 border border-hairline/10 bg-panel-warm p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <CourseStatusBadge status={status} />
        <Badge
          tone="quiet"
          className="rounded-full border-hairline/20 bg-ink/5 px-2.5 py-1 text-[0.6rem] font-medium"
        >
          {chapterCount} chapters
        </Badge>
        <Badge
          tone="quiet"
          className="rounded-full border-hairline/20 bg-ink/5 px-2.5 py-1 text-[0.6rem] font-medium"
        >
          {totalLectures} lessons
        </Badge>
      </div>
      <Button
        asChild
        variant="outline"
        className="h-10 border-hairline/25 px-4 text-[0.65rem] font-bold uppercase tracking-widest"
      >
        <Link to="/dashboard/courses/$id/edit" params={{ id: courseId }}>{t("cb.courseSettings")}</Link>
      </Button>
    </div>
  );
}

export function AddChapterSection({
  chapterDraft,
  isWorking,
  onChapterDraftChange,
  onCreateChapter
}: {
  chapterDraft: CreateChapterInput;
  isWorking: boolean;
  onChapterDraftChange: React.Dispatch<React.SetStateAction<CreateChapterInput>>;
  onCreateChapter: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <div className="overflow-hidden border border-hairline/30 bg-card/85">
      <div className="flex items-center justify-between border-b border-hairline/10 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-ink/10 text-ink">
            <Plus className="size-4.5" />
          </div>
          <h5 className="font-body text-lg font-medium tracking-tight text-ink">{t("cb.addChapter")}</h5>
        </div>
        <p className="text-[0.58rem] font-medium uppercase tracking-widest text-ink/35">{t("cb.quickCreate")}</p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="new-chapter-title"
              className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55"
            >{t("cb.chapterTitle")}</Label>
            <Input
              id="new-chapter-title"
              className="h-11 border-hairline/25 bg-panel-warm/50"
              placeholder={t("cb.chapterPlaceholder")}
              value={chapterDraft.title}
              onChange={(event) =>
                onChapterDraftChange((currentValue) => ({
                  ...currentValue,
                  title: event.target.value
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="new-chapter-description"
              className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55"
            >{t("cb.shortDescription")}</Label>
            <Input
              id="new-chapter-description"
              className="h-11 border-hairline/25 bg-panel-warm/50"
              placeholder={t("cb.optionalSummary")}
              value={chapterDraft.description}
              onChange={(event) =>
                onChapterDraftChange((currentValue) => ({
                  ...currentValue,
                  description: event.target.value
                }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="h-10 bg-ink px-6 font-body font-medium transition-all disabled:opacity-50"
            disabled={isWorking || !chapterDraft.title.trim()}
            onClick={onCreateChapter}
          >{t("cb.createChapter")}<ChevronRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChapterMaterialsSection({
  chapter,
  title,
  onDeleteMaterial,
  onTitleChange,
  onUpload
}: {
  chapter: ContentChapter;
  title: string;
  onDeleteMaterial: (materialId: string) => void;
  onTitleChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}): JSX.Element {
  const t = useT();

  return (
    <div className="border border-hairline/10 bg-panel-warm/30 p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
          <FileText className="size-4" />
        </div>
        <h6 className="text-[0.68rem] font-medium uppercase tracking-widest text-ink">{t("cb.chapterFiles")}</h6>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          className="h-10 rounded-lg border-hairline/20 bg-white"
          placeholder={t("cb.filePlaceholder")}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <label className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-hairline/20 bg-chip-active/45 px-4 text-[0.62rem] font-medium uppercase tracking-widest text-ink/60 transition-all hover:bg-chip-active">{t("cb.chooseFile")}<input className="hidden" type="file" onChange={onUpload} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chapter.materials.map((material) => (
          <div
            key={material.id}
            className="group/mat relative inline-flex items-center gap-2 rounded-full border border-hairline/20 bg-white py-1.5 pl-3 pr-8 text-xs"
          >
            <FileText className="size-3.5 text-orange-500" />
            <a
              href={material.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-ink/80 transition-colors hover:text-ink"
            >
              {material.title}
            </a>
            <button
              className="absolute right-1.5 flex size-5 items-center justify-center rounded-full text-red-500 opacity-0 transition-all group-hover/mat:opacity-100 hover:bg-red-500/10"
              onClick={() => onDeleteMaterial(material.id)}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyContentState(): JSX.Element {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-hairline/40 bg-card/60 py-20 text-center">
      <AlertCircle className="mb-3 size-10 text-ink/50" />
      <p className="font-body text-lg font-bold text-ink">{t("cb.noChapters")}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-ink/45">{t("cb.noChaptersLead")}</p>
    </div>
  );
}

export function LectureForm({
  actionLabel,
  isWorking,
  onCancel,
  onChange,
  onSave,
  values
}: {
  actionLabel: string;
  isWorking: boolean;
  onCancel: () => void;
  onChange: (value: LectureDraft) => void;
  onSave: () => void;
  values: LectureDraft;
}): JSX.Element {
  const t = useT();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">{t("cb.lessonTitle")}</Label>
          <Input
            className="h-10 rounded-lg bg-panel-warm/20"
            placeholder={t("cb.lessonPlaceholder")}
            value={values.title}
            onChange={(event) => onChange({ ...values, title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">{t("cb.lessonType")}</Label>
          <Select
            className="h-10 rounded-lg"
            value={values.type}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChange({
                ...values,
                type: event.target.value as LectureDraft["type"]
              })
            }
          >
            <option value="VIDEO_UPLOAD">{t("cb.uploadVideo")}</option>
            <option value="VIDEO_LINK">{t("cb.videoLink")}</option>
            <option value="TEXT">{t("cb.textLesson")}</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">{t("cb.optionalDescription")}</Label>
        <Textarea
          className="min-h-24 bg-panel-warm/20 p-4"
          placeholder={t("cb.lessonNote")}
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </div>

      <div className="space-y-4 border border-hairline/10 bg-panel-warm/30 p-4">
        {values.type === "VIDEO_UPLOAD" ? (
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-widest text-ink">
              <Video className="size-3.5" />{t("cb.uploadVideo")}</Label>
            <VideoUploader
              label={t("cb.lessonVideo")}
              value={{ mode: "VIDEO_UPLOAD", videoUrl: values.videoUrl }}
              onValueChange={(value) => onChange({ ...values, videoUrl: value.videoUrl })}
            />
          </div>
        ) : null}

        {values.type === "VIDEO_LINK" ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-widest text-accent">
              <LinkIcon className="size-3.5" />{t("cb.videoUrl")}</Label>
            <Input
              className="h-10 rounded-lg bg-white"
              placeholder={t("cb.pasteLink")}
              value={values.videoUrl}
              onChange={(event) => onChange({ ...values, videoUrl: event.target.value })}
            />
          </div>
        ) : null}

        {values.type === "TEXT" ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-widest text-amber-600">
              <FileCode className="size-3.5" />{t("cb.lessonText")}</Label>
            <Textarea
              className="min-h-28 bg-white p-4"
              placeholder={t("cb.writeContent")}
              value={values.content}
              onChange={(event) => onChange({ ...values, content: event.target.value })}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={values.isPreview}
            onChange={(event) => onChange({ ...values, isPreview: event.target.checked })}
            className="size-4 accent-ink"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-ink">{t("cb.allowPreview")}</span>
            <span className="text-[0.62rem] leading-none text-ink/45">{t("cb.allowPreviewLead")}</span>
          </div>
        </label>

        <div className="flex items-center gap-2 self-end">
          <Button
            variant="outline"
            className="h-10 px-4 font-bold"
            disabled={isWorking}
            onClick={onCancel}
          >{t("common.cancel")}</Button>
          <Button
            className="h-10 bg-ink px-5 font-body font-medium"
            disabled={isWorking || !values.title.trim()}
            onClick={onSave}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
