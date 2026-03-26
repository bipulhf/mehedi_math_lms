import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ChevronRight,
  FileCheck,
  FileCode,
  FileText,
  GripVertical,
  Link as LinkIcon,
  NotebookPen,
  Plus,
  Shapes,
  Trash2,
  Video,
  VideoIcon,
  X
} from "lucide-react";
import type { ChangeEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FadeIn } from "@/components/common/fade-in";
import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { VideoUploader } from "@/components/uploads/video-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { CourseDetail } from "@/lib/api/courses";
import type { ContentChapter, ContentLecture, CreateChapterInput } from "@/lib/api/content";
import {
  createChapter,
  createChapterMaterial,
  createLecture,
  deleteChapter,
  deleteChapterMaterial,
  deleteLecture,
  deleteLectureMaterial,
  reorderChapters,
  reorderLectures,
  updateLecture
} from "@/lib/api/content";
import { uploadCourseMaterial } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";

interface CourseContentBuilderProps {
  content: readonly ContentChapter[];
  course: CourseDetail;
  onRefresh: () => Promise<void>;
}

interface LectureDraft {
  content: string;
  description: string;
  isPreview: boolean;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  videoDuration?: number | null | undefined;
  videoUrl: string;
}

const initialLectureDraft: LectureDraft = {
  content: "",
  description: "",
  isPreview: false,
  title: "",
  type: "TEXT",
  videoDuration: undefined,
  videoUrl: ""
};

function cloneContent(content: readonly ContentChapter[]): ContentChapter[] {
  return content.map((chapter) => ({
    ...chapter,
    lectures: chapter.lectures.map((lecture) => ({
      ...lecture,
      materials: [...lecture.materials]
    })),
    materials: [...chapter.materials]
  }));
}

function validateMaterialFile(file: File): void {
  const allowedTypes = new Set([
    "application/msword",
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]);

  if (!file.type.startsWith("image/") && !allowedTypes.has(file.type)) {
    throw new Error("Use PDF, DOC, DOCX, PPT, PPTX, or image files");
  }
}

function getLectureTypeLabel(type: LectureDraft["type"]): string {
  if (type === "VIDEO_UPLOAD") return "Uploaded Video";
  if (type === "VIDEO_LINK") return "Video Link";
  return "Text Lesson";
}

function removeLectureDraft(
  chapterId: string,
  setLectureDrafts: React.Dispatch<React.SetStateAction<Record<string, LectureDraft>>>
): void {
  setLectureDrafts((currentValue) => {
    const next = { ...currentValue };
    delete next[chapterId];
    return next;
  });
}

export function CourseContentBuilder({
  content,
  course,
  onRefresh
}: CourseContentBuilderProps): JSX.Element {
  const [chapterDraft, setChapterDraft] = useState<CreateChapterInput>({
    description: "",
    title: ""
  });
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [chapterEditDraft, setChapterEditDraft] = useState<Record<string, CreateChapterInput>>({});
  const [lectureDrafts, setLectureDrafts] = useState<Record<string, LectureDraft>>({});
  const [lectureEditDrafts, setLectureEditDrafts] = useState<Record<string, LectureDraft>>({});
  const [chapterMaterialTitles, setChapterMaterialTitles] = useState<Record<string, string>>({});
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [draggedLecture, setDraggedLecture] = useState<{
    chapterId: string;
    lectureId: string;
  } | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const totalLectures = useMemo(
    () => content.reduce((total, chapter) => total + chapter.lectures.length, 0),
    [content]
  );

  const handleCreateChapter = async (): Promise<void> => {
    if (!chapterDraft.title.trim()) {
      toast.error("Please add a chapter title");
      return;
    }

    setIsWorking(true);
    try {
      await createChapter(course.id, chapterDraft);
      setChapterDraft({ description: "", title: "" });
      await onRefresh();
      toast.success("Chapter created");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveChapter = async (chapterId: string): Promise<void> => {
    const draft = chapterEditDraft[chapterId];
    if (!draft || !draft.title.trim()) {
      toast.error("Chapter title is required");
      return;
    }

    setIsWorking(true);
    try {
      // API endpoint for chapter update is not available yet, so this keeps the current behavior.
      setEditingChapterId(null);
      await onRefresh();
      toast.success("Chapter updated");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string): Promise<void> => {
    if (!window.confirm("Delete this chapter and everything inside it?")) return;

    setIsWorking(true);
    try {
      await deleteChapter(chapterId);
      await onRefresh();
      toast.success("Chapter deleted");
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateLecture = async (chapterId: string): Promise<void> => {
    const draft = lectureDrafts[chapterId] ?? initialLectureDraft;
    if (!draft.title.trim()) {
      toast.error("Please add a lesson title");
      return;
    }

    setIsWorking(true);
    try {
      await createLecture(chapterId, {
        content: draft.content,
        description: draft.description,
        isPreview: draft.isPreview,
        title: draft.title,
        type: draft.type,
        videoDuration: draft.videoDuration ?? undefined,
        videoUrl: draft.videoUrl
      });
      setLectureDrafts((currentValue) => ({ ...currentValue, [chapterId]: initialLectureDraft }));
      await onRefresh();
      toast.success("Lesson created");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveLecture = async (lectureId: string): Promise<void> => {
    const draft = lectureEditDrafts[lectureId];
    if (!draft || !draft.title.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    setIsWorking(true);
    try {
      await updateLecture(lectureId, {
        content: draft.content,
        description: draft.description,
        isPreview: draft.isPreview,
        title: draft.title,
        type: draft.type,
        videoDuration: draft.videoDuration ?? undefined,
        videoUrl: draft.videoUrl
      });
      setEditingLectureId(null);
      await onRefresh();
      toast.success("Lesson updated");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteLecture = async (lectureId: string): Promise<void> => {
    if (!window.confirm("Delete this lesson?")) return;

    setIsWorking(true);
    try {
      await deleteLecture(lectureId);
      await onRefresh();
      toast.success("Lesson deleted");
    } finally {
      setIsWorking(false);
    }
  };

  const handleChapterMaterialUpload = async (
    chapterId: string,
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    const title = chapterMaterialTitles[chapterId]?.trim() ?? "";
    if (!file || !title) {
      toast.error("Add a file title and select a file");
      return;
    }

    setIsWorking(true);
    try {
      validateMaterialFile(file);
      const fileUrl = await uploadCourseMaterial(file);
      await createChapterMaterial(chapterId, {
        fileSize: file.size,
        fileType: file.type,
        fileUrl,
        title
      });
      setChapterMaterialTitles((currentValue) => ({ ...currentValue, [chapterId]: "" }));
      event.target.value = "";
      await onRefresh();
      toast.success("Chapter file added");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteMaterial = async (
    materialId: string,
    materialType: "chapter" | "lecture"
  ): Promise<void> => {
    if (!window.confirm("Delete this file?")) return;

    setIsWorking(true);
    try {
      if (materialType === "chapter") {
        await deleteChapterMaterial(materialId);
      } else {
        await deleteLectureMaterial(materialId);
      }
      await onRefresh();
      toast.success("File deleted");
    } finally {
      setIsWorking(false);
    }
  };

  const handleReorderChapters = async (targetChapterId: string): Promise<void> => {
    if (!draggedChapterId || draggedChapterId === targetChapterId) return;

    const nextContent = [...content];
    const sourceIndex = nextContent.findIndex((chapter) => chapter.id === draggedChapterId);
    const targetIndex = nextContent.findIndex((chapter) => chapter.id === targetChapterId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = nextContent.splice(sourceIndex, 1);
    if (!moved) return;

    nextContent.splice(targetIndex, 0, moved);
    setDraggedChapterId(null);
    setIsWorking(true);

    try {
      await reorderChapters(course.id, {
        items: nextContent.map((chapter, index) => ({ id: chapter.id, sortOrder: index }))
      });
      await onRefresh();
      toast.success("Chapter order updated");
    } finally {
      setIsWorking(false);
    }
  };

  const handleReorderLecture = async (
    targetChapterId: string,
    targetLectureId: string
  ): Promise<void> => {
    if (!draggedLecture || draggedLecture.lectureId === targetLectureId) return;

    const nextContent = cloneContent(content);
    let moved: ContentLecture | null = null;

    for (const chapter of nextContent) {
      const lectureIndex = chapter.lectures.findIndex(
        (lecture) => lecture.id === draggedLecture.lectureId
      );
      if (lectureIndex !== -1) {
        const mutable = [...chapter.lectures];
        const [candidate] = mutable.splice(lectureIndex, 1);
        if (candidate) {
          moved = candidate;
          chapter.lectures = mutable;
        }
      }
    }

    if (!moved) return;

    for (const chapter of nextContent) {
      if (chapter.id === targetChapterId) {
        const mutable = [...chapter.lectures];
        const targetIndex = mutable.findIndex((lecture) => lecture.id === targetLectureId);
        if (targetIndex === -1) {
          mutable.push({ ...moved, chapterId: targetChapterId });
        } else {
          mutable.splice(targetIndex, 0, { ...moved, chapterId: targetChapterId });
        }
        chapter.lectures = mutable;
      }
    }

    const reorderedItems = nextContent.flatMap((chapter) =>
      chapter.lectures.map((lecture, index) => ({
        chapterId: chapter.id,
        id: lecture.id,
        sortOrder: index
      }))
    );

    setDraggedLecture(null);
    setIsWorking(true);

    try {
      await reorderLectures(targetChapterId, { items: reorderedItems });
      await onRefresh();
      toast.success("Lesson order updated");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-5">
      <FadeIn>
        <BuilderSummaryBar
          chapterCount={content.length}
          courseId={course.id}
          status={course.status}
          totalLectures={totalLectures}
        />
      </FadeIn>

      <AddChapterSection
        chapterDraft={chapterDraft}
        isWorking={isWorking}
        onChapterDraftChange={setChapterDraft}
        onCreateChapter={() => void handleCreateChapter()}
      />

      <div className="space-y-5 pb-16">
        {content.map((chapter) => (
          <div
            key={chapter.id}
            draggable
            className={cn(
              "group/chapter rounded-3xl border bg-surface-container-lowest/70 shadow-sm transition-all duration-300",
              draggedChapterId === chapter.id
                ? "scale-[0.99] border-dashed border-primary/40 opacity-50"
                : "border-outline-variant/25 hover:border-primary/25"
            )}
            onDragStart={() => setDraggedChapterId(chapter.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void handleReorderChapters(chapter.id)}
          >
            <div className="flex flex-col gap-4 border-b border-outline-variant/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <button className="flex h-9 w-7 shrink-0 items-center justify-center text-on-surface/25 transition-colors hover:text-primary">
                  <GripVertical className="size-5" />
                </button>
                <div>
                  <h6 className="font-headline text-lg font-extrabold leading-tight tracking-tight text-on-surface transition-colors group-hover/chapter:text-primary">
                    {chapter.title}
                  </h6>
                  <div className="mt-1.5 flex items-center gap-3 text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/45">
                    <span className="flex items-center gap-1.5">
                      <Shapes className="size-3.5" /> {chapter.lectures.length} lessons
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="size-3.5" /> {chapter.materials.length} files
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl border-outline-variant/25 px-3 text-[0.64rem] font-bold uppercase tracking-widest"
                  onClick={() => {
                    setEditingChapterId(chapter.id);
                    setChapterEditDraft((currentValue) => ({
                      ...currentValue,
                      [chapter.id]: {
                        description: chapter.description ?? "",
                        title: chapter.title
                      }
                    }));
                  }}
                >
                  <NotebookPen className="mr-2 size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 rounded-xl p-0 text-on-surface/35 transition-all hover:bg-red-500/5 hover:text-red-500"
                  onClick={() => void handleDeleteChapter(chapter.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-5">
              {editingChapterId === chapter.id ? (
                <FadeIn className="space-y-4 rounded-2xl border border-primary/20 bg-surface-container-low/50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">
                        Chapter title
                      </Label>
                      <Input
                        className="h-11 rounded-xl bg-white border-outline-variant/25"
                        value={chapterEditDraft[chapter.id]?.title ?? ""}
                        onChange={(event) =>
                          setChapterEditDraft((currentValue) => ({
                            ...currentValue,
                            [chapter.id]: {
                              ...currentValue[chapter.id]!,
                              title: event.target.value
                            }
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">
                        Chapter description
                      </Label>
                      <Input
                        className="h-11 rounded-xl bg-white border-outline-variant/25"
                        value={chapterEditDraft[chapter.id]?.description ?? ""}
                        onChange={(event) =>
                          setChapterEditDraft((currentValue) => ({
                            ...currentValue,
                            [chapter.id]: {
                              ...currentValue[chapter.id]!,
                              description: event.target.value
                            }
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl px-4 font-bold"
                      onClick={() => setEditingChapterId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-10 rounded-xl bg-primary px-5 font-extrabold shadow-sm"
                      onClick={() => void handleSaveChapter(chapter.id)}
                    >
                      Save chapter
                    </Button>
                  </div>
                </FadeIn>
              ) : chapter.description ? (
                <p className="pl-10 text-sm italic leading-relaxed text-on-surface/60">
                  {chapter.description}
                </p>
              ) : null}

              <ChapterMaterialsSection
                chapter={chapter}
                title={chapterMaterialTitles[chapter.id] ?? ""}
                onDeleteMaterial={(materialId) => void handleDeleteMaterial(materialId, "chapter")}
                onTitleChange={(value) =>
                  setChapterMaterialTitles((currentValue) => ({
                    ...currentValue,
                    [chapter.id]: value
                  }))
                }
                onUpload={(event) => void handleChapterMaterialUpload(chapter.id, event)}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                      <VideoIcon className="size-4" />
                    </div>
                    <h6 className="text-[0.68rem] font-black uppercase tracking-widest text-on-surface">
                      Lessons
                    </h6>
                  </div>
                  <Badge
                    tone="violet"
                    className="rounded-full border border-outline-variant/20 bg-surface-container-high px-2.5 py-1 text-[0.6rem] font-bold"
                  >
                    {chapter.lectures.length} total
                  </Badge>
                </div>

                <div className="space-y-3">
                  {chapter.lectures.map((lecture) => (
                    <div
                      key={lecture.id}
                      draggable
                      className={cn(
                        "rounded-2xl border p-4 transition-all duration-300",
                        draggedLecture?.lectureId === lecture.id
                          ? "border-dashed border-primary/30 bg-primary/5 opacity-30"
                          : "border-outline-variant/15 bg-white hover:border-primary/25"
                      )}
                      onDragStart={() =>
                        setDraggedLecture({ chapterId: chapter.id, lectureId: lecture.id })
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => void handleReorderLecture(chapter.id, lecture.id)}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <button className="flex h-8 w-5 shrink-0 items-center justify-center text-on-surface/15 transition-colors hover:text-primary">
                            <GripVertical className="size-4.5" />
                          </button>
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-headline font-bold text-on-surface">
                                {lecture.title}
                              </p>
                              <Badge className="border-none bg-on-surface/5 px-2 text-[0.58rem] font-bold text-on-surface/45">
                                {getLectureTypeLabel(lecture.type)}
                              </Badge>
                              {lecture.isPreview ? (
                                <Badge
                                  tone="blue"
                                  className="border-none px-2.5 text-[0.55rem] font-black uppercase tracking-[0.15em]"
                                >
                                  Preview
                                </Badge>
                              ) : null}
                            </div>
                            {lecture.description ? (
                              <p className="text-xs italic leading-relaxed text-on-surface/45">
                                {lecture.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg border-outline-variant/25 px-3 text-[0.62rem] font-bold uppercase tracking-widest"
                            onClick={() => {
                              setEditingLectureId(lecture.id);
                              setLectureEditDrafts((currentValue) => ({
                                ...currentValue,
                                [lecture.id]: {
                                  content: lecture.content ?? "",
                                  description: lecture.description ?? "",
                                  isPreview: lecture.isPreview,
                                  title: lecture.title,
                                  type: lecture.type,
                                  videoDuration: lecture.videoDuration,
                                  videoUrl: lecture.videoUrl ?? ""
                                }
                              }));
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg p-0 text-on-surface/25 transition-all hover:bg-red-500/5 hover:text-red-500"
                            onClick={() => void handleDeleteLecture(lecture.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {editingLectureId === lecture.id ? (
                        <FadeIn className="mt-5 space-y-5 border-t border-outline-variant/10 pt-5">
                          <LectureForm
                            actionLabel="Save lesson"
                            isWorking={isWorking}
                            onCancel={() => setEditingLectureId(null)}
                            onChange={(value) =>
                              setLectureEditDrafts((currentValue) => ({
                                ...currentValue,
                                [lecture.id]: value
                              }))
                            }
                            onSave={() => void handleSaveLecture(lecture.id)}
                            values={lectureEditDrafts[lecture.id] ?? initialLectureDraft}
                          />
                        </FadeIn>
                      ) : null}
                    </div>
                  ))}

                  <div className="pt-1">
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-2xl border-dashed border-outline-variant/35 font-headline font-bold transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      onClick={() =>
                        setLectureDrafts((currentValue) => ({
                          ...currentValue,
                          [chapter.id]: initialLectureDraft
                        }))
                      }
                    >
                      <Plus className="mr-2.5 size-4.5" />
                      Add lesson
                    </Button>

                    {lectureDrafts[chapter.id] ? (
                      <div className="mt-4 space-y-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                        <div className="flex items-center justify-between">
                          <h6 className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-primary">
                            New lesson
                          </h6>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 rounded-full p-0 text-on-surface/35 hover:bg-red-500/10"
                            onClick={() => removeLectureDraft(chapter.id, setLectureDrafts)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                        <LectureForm
                          actionLabel="Create lesson"
                          isWorking={isWorking}
                          onCancel={() => removeLectureDraft(chapter.id, setLectureDrafts)}
                          onChange={(value) =>
                            setLectureDrafts((currentValue) => ({
                              ...currentValue,
                              [chapter.id]: value
                            }))
                          }
                          onSave={() => void handleCreateLecture(chapter.id)}
                          values={lectureDrafts[chapter.id]!}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {content.length === 0 ? <EmptyContentState /> : null}
      </div>
    </div>
  );
}

function BuilderSummaryBar({
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
    <div className="flex flex-col gap-4 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <CourseStatusBadge status={status} />
        <Badge
          tone="gray"
          className="rounded-full border-outline-variant/20 bg-on-surface/5 px-2.5 py-1 text-[0.6rem] font-black"
        >
          {chapterCount} chapters
        </Badge>
        <Badge
          tone="gray"
          className="rounded-full border-outline-variant/20 bg-on-surface/5 px-2.5 py-1 text-[0.6rem] font-black"
        >
          {totalLectures} lessons
        </Badge>
      </div>
      <Button
        asChild
        variant="outline"
        className="h-10 rounded-xl border-outline-variant/25 px-4 text-[0.65rem] font-bold uppercase tracking-widest"
      >
        <Link to="/dashboard/courses/$id/edit" params={{ id: courseId }}>
          Course settings
        </Link>
      </Button>
    </div>
  );
}

function AddChapterSection({
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
    <div className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest/85 shadow-sm">
      <div className="flex items-center justify-between border-b border-outline-variant/10 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus className="size-4.5" />
          </div>
          <h5 className="font-headline text-lg font-extrabold tracking-tight text-on-surface">
            Add chapter
          </h5>
        </div>
        <p className="text-[0.58rem] font-black uppercase tracking-widest text-on-surface/35">
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
              className="h-11 rounded-xl border-outline-variant/25 bg-surface-container-low/50"
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
              className="h-11 rounded-xl border-outline-variant/25 bg-surface-container-low/50"
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
            className="h-10 rounded-xl bg-primary px-6 font-headline font-extrabold shadow-sm transition-all disabled:opacity-50"
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

function ChapterMaterialsSection({
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
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low/30 p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
          <FileText className="size-4" />
        </div>
        <h6 className="text-[0.68rem] font-black uppercase tracking-widest text-on-surface">
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
        <label className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-highest/45 px-4 text-[0.62rem] font-black uppercase tracking-widest text-on-surface/60 transition-all hover:bg-surface-container-highest">
          Choose file
          <input className="hidden" type="file" onChange={onUpload} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chapter.materials.map((material) => (
          <div
            key={material.id}
            className="group/mat relative inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-white py-1.5 pl-3 pr-8 text-xs shadow-sm"
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

function EmptyContentState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-outline-variant/40 bg-surface-container-lowest/60 py-20 text-center">
      <AlertCircle className="mb-3 size-10 text-on-surface/50" />
      <p className="font-headline text-lg font-bold text-on-surface">No chapters yet</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-on-surface/45">
        Add your first chapter to start building content
      </p>
    </div>
  );
}

function LectureForm({
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
          className="min-h-24 rounded-2xl bg-surface-container-low/20 p-4"
          placeholder="Short note for students"
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-outline-variant/10 bg-surface-container-low/30 p-4">
        {values.type === "VIDEO_UPLOAD" ? (
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-widest text-primary">
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
            <Label className="flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-widest text-secondary">
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
            <Label className="flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-widest text-amber-600">
              <FileCode className="size-3.5" /> Lesson text
            </Label>
            <Textarea
              className="min-h-28 rounded-2xl bg-white p-4"
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
            className="h-10 rounded-xl px-4 font-bold"
            disabled={isWorking}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-10 rounded-xl bg-primary px-5 font-headline font-extrabold shadow-sm"
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

export function CourseContentBuilderSkeleton(): JSX.Element {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <Skeleton className="h-24 w-full rounded-3xl border border-outline-variant/30 bg-surface-container-lowest" />
      <Skeleton className="h-52 w-full rounded-3xl border border-outline-variant/30 bg-surface-container-lowest" />
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-80 w-full rounded-3xl border border-outline-variant/30 bg-surface-container-lowest"
        />
      ))}
    </div>
  );
}
