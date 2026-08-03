import {
  FileCheck,
  GripVertical,
  NotebookPen,
  Plus,
  Shapes,
  Trash2,
  VideoIcon,
  X
} from "lucide-react";
import type { ChangeEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AddChapterSection,
  BuilderSummaryBar,
  ChapterMaterialsSection,
  EmptyContentState,
  LectureForm
} from "@/components/courses/course-content-builder-sections";
import { initialLectureDraft, type LectureDraft } from "@/components/courses/lecture-draft";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useT } from "@/lib/i18n/locale-context";

interface CourseContentBuilderProps {
  content: readonly ContentChapter[];
  course: CourseDetail;
  onRefresh: () => Promise<void>;
}

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
  const t = useT();

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
      toast.error(t("cbx.needChapterTitle"));
      return;
    }

    setIsWorking(true);
    try {
      await createChapter(course.id, chapterDraft);
      setChapterDraft({ description: "", title: "" });
      await onRefresh();
      toast.success(t("cbx.chapterCreated"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveChapter = async (chapterId: string): Promise<void> => {
    const draft = chapterEditDraft[chapterId];
    if (!draft || !draft.title.trim()) {
      toast.error(t("cbx.needChapterTitle"));
      return;
    }

    setIsWorking(true);
    try {
      // API endpoint for chapter update is not available yet, so this keeps the current behavior.
      setEditingChapterId(null);
      await onRefresh();
      toast.success(t("cbx.chapterUpdated"));
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
      toast.success(t("cbx.chapterDeleted"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateLecture = async (chapterId: string): Promise<void> => {
    const draft = lectureDrafts[chapterId] ?? initialLectureDraft;
    if (!draft.title.trim()) {
      toast.error(t("cbx.needLessonTitle"));
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
      toast.success(t("cbx.lessonCreated"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveLecture = async (lectureId: string): Promise<void> => {
    const draft = lectureEditDrafts[lectureId];
    if (!draft || !draft.title.trim()) {
      toast.error(t("cbx.needLessonTitle"));
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
      toast.success(t("cbx.lessonUpdated"));
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
      toast.success(t("cbx.lessonDeleted"));
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
      toast.error(t("cbx.needFile"));
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
      toast.success(t("cbx.fileAdded"));
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
      toast.success(t("cbx.fileDeleted"));
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
      toast.success(t("cbx.chapterReordered"));
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
      toast.success(t("cbx.lessonReordered"));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <BuilderSummaryBar
          chapterCount={content.length}
          courseId={course.id}
          status={course.status}
          totalLectures={totalLectures}
        />
      </div>

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
              "group/chapter rounded-3xl border bg-card/70 shadow-sm transition-all duration-300",
              draggedChapterId === chapter.id
                ? "scale-[0.99] border-dashed border-ink/40 opacity-50"
                : "border-hairline/25 hover:border-ink/25"
            )}
            onDragStart={() => setDraggedChapterId(chapter.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void handleReorderChapters(chapter.id)}
          >
            <div className="flex flex-col gap-4 border-b border-hairline/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <button className="flex h-9 w-7 shrink-0 items-center justify-center text-ink/25 transition-colors hover:text-ink">
                  <GripVertical className="size-5" />
                </button>
                <div>
                  <h6 className="font-body text-lg font-medium leading-tight tracking-tight text-ink transition-colors group-hover/chapter:text-ink">
                    {chapter.title}
                  </h6>
                  <div className="mt-1.5 flex items-center gap-3 text-[0.62rem] font-bold uppercase tracking-widest text-ink/45">
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
                  className="h-9 border-hairline/25 px-3 text-[0.64rem] font-bold uppercase tracking-widest"
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
                  <NotebookPen className="mr-2 size-3.5" />{t("action.edit")}</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-ink/35 transition-all hover:bg-red-500/5 hover:text-red-500"
                  onClick={() => void handleDeleteChapter(chapter.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-5">
              {editingChapterId === chapter.id ? (
                <div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">{t("cb.chapterTitle")}</Label>
                      <Input
                        className="h-11 bg-white border-hairline/25"
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
                      <Label className="ml-1 text-[0.62rem] font-bold uppercase tracking-widest opacity-55">{t("cbx.chapterDescription")}</Label>
                      <Input
                        className="h-11 bg-white border-hairline/25"
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
                      className="h-10 px-4 font-bold"
                      onClick={() => setEditingChapterId(null)}
                    >{t("common.cancel")}</Button>
                    <Button
                      className="h-10 bg-ink px-5 font-medium"
                      onClick={() => void handleSaveChapter(chapter.id)}
                    >{t("cbx.saveChapter")}</Button>
                  </div>
                </div>
              ) : chapter.description ? (
                <p className="pl-10 text-sm italic leading-relaxed text-ink/60">
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
                <div className="flex items-center justify-between border-b border-hairline/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                      <VideoIcon className="size-4" />
                    </div>
                    <h6 className="text-[0.68rem] font-medium uppercase tracking-widest text-ink">{t("cbx.lessons")}</h6>
                  </div>
                  <Badge
                    tone="neutral"
                    className="rounded-full border border-hairline/20 bg-chip-active px-2.5 py-1 text-[0.6rem] font-bold"
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
                          ? "border-dashed border-ink/30 bg-ink/5 opacity-30"
                          : "border-hairline/15 bg-white hover:border-ink/25"
                      )}
                      onDragStart={() =>
                        setDraggedLecture({ chapterId: chapter.id, lectureId: lecture.id })
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => void handleReorderLecture(chapter.id, lecture.id)}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <button className="flex h-8 w-5 shrink-0 items-center justify-center text-ink/15 transition-colors hover:text-ink">
                            <GripVertical className="size-4.5" />
                          </button>
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-body font-bold text-ink">
                                {lecture.title}
                              </p>
                              <Badge className="border-none bg-ink/5 px-2 text-[0.58rem] font-bold text-ink/45">
                                {getLectureTypeLabel(lecture.type)}
                              </Badge>
                              {lecture.isPreview ? (
                                <Badge
                                  tone="neutral"
                                  className="border-none px-2.5 text-[0.55rem] font-medium uppercase tracking-[0.15em]"
                                >{t("cbx.preview")}</Badge>
                              ) : null}
                            </div>
                            {lecture.description ? (
                              <p className="text-xs italic leading-relaxed text-ink/45">
                                {lecture.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg border-hairline/25 px-3 text-[0.62rem] font-bold uppercase tracking-widest"
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
                          >{t("action.edit")}</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg p-0 text-ink/25 transition-all hover:bg-red-500/5 hover:text-red-500"
                            onClick={() => void handleDeleteLecture(lecture.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {editingLectureId === lecture.id ? (
                        <div>
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
                        </div>
                      ) : null}
                    </div>
                  ))}

                  <div className="pt-1">
                    <Button
                      variant="outline"
                      className="h-11 w-full border-dashed border-hairline/35 font-body font-bold transition-all hover:border-ink/40 hover:bg-ink/5 hover:text-ink"
                      onClick={() =>
                        setLectureDrafts((currentValue) => ({
                          ...currentValue,
                          [chapter.id]: initialLectureDraft
                        }))
                      }
                    >
                      <Plus className="mr-2.5 size-4.5" />{t("cbx.addLesson")}</Button>

                    {lectureDrafts[chapter.id] ? (
                      <div className="mt-4 space-y-5 border border-ink/20 bg-ink/5 p-5">
                        <div className="flex items-center justify-between">
                          <h6 className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-ink">{t("cbx.newLesson")}</h6>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 rounded-full p-0 text-ink/35 hover:bg-red-500/10"
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


export function CourseContentBuilderSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full border border-hairline/30 bg-card" />
      <Skeleton className="h-52 w-full border border-hairline/30 bg-card" />
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-80 w-full border border-hairline/30 bg-card"
        />
      ))}
    </div>
  );
}
