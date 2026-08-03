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
  return (
    <div className="flex flex-col gap-4 border border-outline-variant/10 bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <CourseStatusBadge status={status} />
        <Badge
          tone="gray"
          className="rounded-full border-outline-variant/20 bg-on-surface/5 px-2.5 py-1 text-[0.6rem] font-medium"
        >
          {chapterCount} chapters
        </Badge>
        <Badge
          tone="gray"
          className="rounded-full border-outline-variant/20 bg-on-surface/5 px-2.5 py-1 text-[0.6rem] font-medium"
        >
          {totalLectures} lessons
        </Badge>
      </div>
      <Button
        asChild
        variant="outline"
        className="h-10 border-outline-variant/25 px-4 text-[0.65rem] font-bold uppercase tracking-widest"
      >
        <Link to="/dashboard/courses/$id/edit" params={{ id: courseId }}>
          Course settings
        </Link>
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
  return (
    <div className="overflow-hidden border border-outline-variant/30 bg-surface-container-lowest/85">
      <div className="flex items-center justify-between border-b border-outline-variant/10 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus className="size-4.5" />
          </div>
          <h5 className="font-body text-lg font-medium tracking-tight text-on-surface">
            Add chapter
          </h5>
        </div>
        <p className="text-[0.58rem] font-medium uppercase tracking-widest text-on-surface/35">
          Quick create
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="new-chapter-title"
              className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55"
            >
              Chapter title
            </Label>
            <Input
              id="new-chapter-title"
              className="h-11 border-outline-variant/25 bg-surface-container-low/50"
              placeholder="Example: Unit 4 - Vectors"
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
            >
              Short description
            </Label>
            <Input
              id="new-chapter-description"
              className="h-11 border-outline-variant/25 bg-surface-container-low/50"
              placeholder="Optional summary"
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
            className="h-10 bg-primary px-6 font-body font-medium transition-all disabled:opacity-50"
            disabled={isWorking || !chapterDraft.title.trim()}
            onClick={onCreateChapter}
          >
            Create chapter
            <ChevronRight className="ml-2 size-4" />
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
  return (
    <div className="border border-outline-variant/10 bg-surface-container-low/30 p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
          <FileText className="size-4" />
        </div>
        <h6 className="text-[0.68rem] font-medium uppercase tracking-widest text-on-surface">
          Chapter files
        </h6>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          className="h-10 rounded-lg border-outline-variant/20 bg-white"
          placeholder="File title (example: Formula sheet)"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <label className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-highest/45 px-4 text-[0.62rem] font-medium uppercase tracking-widest text-on-surface/60 transition-all hover:bg-surface-container-highest">
          Choose file
          <input className="hidden" type="file" onChange={onUpload} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chapter.materials.map((material) => (
          <div
            key={material.id}
            className="group/mat relative inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-white py-1.5 pl-3 pr-8 text-xs"
          >
            <FileText className="size-3.5 text-orange-500" />
            <a
              href={material.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-on-surface/80 transition-colors hover:text-primary"
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
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-outline-variant/40 bg-surface-container-lowest/60 py-20 text-center">
      <AlertCircle className="mb-3 size-10 text-on-surface/50" />
      <p className="font-body text-lg font-bold text-on-surface">No chapters yet</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-on-surface/45">
        Add your first chapter to start building content
      </p>
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
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">
            Lesson title
          </Label>
          <Input
            className="h-10 rounded-lg bg-surface-container-low/20"
            placeholder="Example: Algebra basics"
            value={values.title}
            onChange={(event) => onChange({ ...values, title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">
            Lesson type
          </Label>
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
            <option value="VIDEO_UPLOAD">Upload video</option>
            <option value="VIDEO_LINK">Video link</option>
            <option value="TEXT">Text lesson</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">
          Description (optional)
        </Label>
        <Textarea
          className="min-h-24 bg-surface-container-low/20 p-4"
          placeholder="Short note for students"
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </div>

      <div className="space-y-4 border border-outline-variant/10 bg-surface-container-low/30 p-4">
        {values.type === "VIDEO_UPLOAD" ? (
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-widest text-primary">
              <Video className="size-3.5" /> Upload video
            </Label>
            <VideoUploader
              label="Lesson video"
              value={{ mode: "VIDEO_UPLOAD", videoUrl: values.videoUrl }}
              onValueChange={(value) => onChange({ ...values, videoUrl: value.videoUrl })}
            />
          </div>
        ) : null}

        {values.type === "VIDEO_LINK" ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-widest text-secondary">
              <LinkIcon className="size-3.5" /> Video URL
            </Label>
            <Input
              className="h-10 rounded-lg bg-white"
              placeholder="Paste YouTube or Vimeo link"
              value={values.videoUrl}
              onChange={(event) => onChange({ ...values, videoUrl: event.target.value })}
            />
          </div>
        ) : null}

        {values.type === "TEXT" ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-widest text-amber-600">
              <FileCode className="size-3.5" /> Lesson text
            </Label>
            <Textarea
              className="min-h-28 bg-white p-4"
              placeholder="Write the lesson content"
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
            className="size-4 accent-primary"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-on-surface">Allow preview</span>
            <span className="text-[0.62rem] leading-none text-on-surface/45">
              Students can view this lesson before enrollment.
            </span>
          </div>
        </label>

        <div className="flex items-center gap-2 self-end">
          <Button
            variant="outline"
            className="h-10 px-4 font-bold"
            disabled={isWorking}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-10 bg-primary px-5 font-body font-medium"
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
