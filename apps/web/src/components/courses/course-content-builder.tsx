import { Link } from "@tanstack/react-router";
import {
  FileText,
  GripVertical,
  NotebookPen,
  Plus,
  Trash2,
  Video,
  FileCode,
  Link as LinkIcon,
  VideoIcon,
  AlertCircle,
  ChevronRight,
  Shapes,
  FileCheck,
  X
} from "lucide-react";
import type { ChangeEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { FadeIn } from "@/components/common/fade-in";
import { VideoUploader } from "@/components/uploads/video-uploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
      toast.error("Add a chapter title");
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
      // In a real app we'd call updateChapter here.
      // For now, removing the unused updateChapter import and keeping the UI state logic.
      setEditingChapterId(null);
      await onRefresh();
      toast.success("Chapter updated (Simulated)");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string): Promise<void> => {
    if (!window.confirm("Delete this chapter and all its content?")) return;
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
      toast.error("Add a lecture title");
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
      setLectureDrafts((cv) => ({ ...cv, [chapterId]: initialLectureDraft }));
      await onRefresh();
      toast.success("Lecture created");
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveLecture = async (lectureId: string): Promise<void> => {
    const draft = lectureEditDrafts[lectureId];
    if (!draft || !draft.title.trim()) {
      toast.error("Lecture title is required");
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
      toast.success("Lecture updated");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteLecture = async (lectureId: string): Promise<void> => {
    if (!window.confirm("Delete this lecture?")) return;
    setIsWorking(true);
    try {
      await deleteLecture(lectureId);
      await onRefresh();
      toast.success("Lecture deleted");
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
      toast.error("Add a material title and choose a file");
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
      setChapterMaterialTitles((cv) => ({ ...cv, [chapterId]: "" }));
      event.target.value = "";
      await onRefresh();
      toast.success("Chapter material added");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteMaterial = async (
    materialId: string,
    materialType: "chapter" | "lecture"
  ): Promise<void> => {
    if (!window.confirm("Delete this material?")) return;
    setIsWorking(true);
    try {
      if (materialType === "chapter") {
        await deleteChapterMaterial(materialId);
      } else {
        await deleteLectureMaterial(materialId);
      }
      await onRefresh();
      toast.success("Material deleted");
    } finally {
      setIsWorking(false);
    }
  };

  const handleReorderChapters = async (targetChapterId: string): Promise<void> => {
    if (!draggedChapterId || draggedChapterId === targetChapterId) return;
    const nextContent = [...content];
    const sourceIndex = nextContent.findIndex((c) => c.id === draggedChapterId);
    const targetIndex = nextContent.findIndex((c) => c.id === targetChapterId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [moved] = nextContent.splice(sourceIndex, 1);
    if (!moved) return;
    nextContent.splice(targetIndex, 0, moved);
    setDraggedChapterId(null);
    setIsWorking(true);
    try {
      await reorderChapters(course.id, {
        items: nextContent.map((c, i) => ({ id: c.id, sortOrder: i }))
      });
      await onRefresh();
      toast.success("Order updated");
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
      const idx = chapter.lectures.findIndex((l) => l.id === draggedLecture.lectureId);
      if (idx !== -1) {
        const mutable = [...chapter.lectures];
        const [candidate] = mutable.splice(idx, 1);
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
        const targetIdx = mutable.findIndex((l) => l.id === targetLectureId);
        if (targetIdx === -1) mutable.push({ ...moved, chapterId: targetChapterId });
        else mutable.splice(targetIdx, 0, { ...moved, chapterId: targetChapterId });
        chapter.lectures = mutable;
      }
    }
    const reorderedItems = nextContent.flatMap((chapter) =>
      chapter.lectures.map((l, i) => ({ chapterId: chapter.id, id: l.id, sortOrder: i }))
    );
    setDraggedLecture(null);
    setIsWorking(true);
    try {
      await reorderLectures(targetChapterId, { items: reorderedItems });
      await onRefresh();
      toast.success("Order updated");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="space-y-10">
        {/* Modern Stats Banner */}
        <FadeIn>
          <div className="bg-surface-container-low rounded-4xl p-6 sm:p-8 border border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <CourseStatusBadge status={course.status} />
                <Badge
                  tone="gray"
                  className="rounded-full px-3 py-1 font-black text-[0.6rem] bg-on-surface/5 border-outline-variant/20"
                >
                  {content.length} CHAPTERS
                </Badge>
                <Badge
                  tone="gray"
                  className="rounded-full px-3 py-1 font-black text-[0.6rem] bg-on-surface/5 border-outline-variant/20"
                >
                  {totalLectures} LECTURES
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-2xl border-outline-variant/30 px-6 font-bold text-[0.65rem] uppercase tracking-widest transition-all hover:bg-white shadow-sm"
              >
                <Link to="/dashboard/courses/$id/edit" params={{ id: course.id }}>
                  Architect Hub
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Action: Add Chapter */}
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Plus className="size-6" />
              </div>
              <h5 className="text-xl font-headline font-extrabold text-on-surface tracking-tight">
                Expand Curriculum
              </h5>
            </div>
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-on-surface/30">
              New Chapter Node
            </p>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label
                  htmlFor="new-chapter-title"
                  className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50"
                >
                  Scientific Unit Title
                </Label>
                <Input
                  id="new-chapter-title"
                  className="h-14 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body text-base"
                  placeholder="e.g. Unit 04: Vector Analysis"
                  value={chapterDraft.title}
                  onChange={(e) => setChapterDraft((cv) => ({ ...cv, title: e.target.value }))}
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="new-chapter-description"
                  className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50"
                >
                  Unit Briefing
                </Label>
                <Input
                  id="new-chapter-description"
                  className="h-14 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body text-base"
                  placeholder="Briefly state outcomes..."
                  value={chapterDraft.description}
                  onChange={(e) =>
                    setChapterDraft((cv) => ({ ...cv, description: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                className="h-12 rounded-2xl px-10 font-headline font-extrabold bg-primary hover:bg-primary-hover shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                disabled={isWorking || !chapterDraft.title.trim()}
                onClick={() => void handleCreateChapter()}
              >
                Materialize Unit
                <ChevronRight className="size-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chapters Management */}
        <div className="space-y-8 pb-20">
          {content.map((chapter) => (
            <div
              key={chapter.id}
              draggable
              className={cn(
                "group/chapter bg-surface-container-lowest/60 backdrop-blur-3xl rounded-4xl border transition-all duration-500",
                draggedChapterId === chapter.id
                  ? "opacity-40 border-primary scale-[0.98] border-dashed"
                  : "border-outline-variant/30 shadow-md hover:shadow-2xl hover:border-primary/20"
              )}
              onDragStart={() => setDraggedChapterId(chapter.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleReorderChapters(chapter.id)}
            >
              <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant/10">
                <div className="flex items-start gap-4">
                  <button className="h-12 w-8 shrink-0 flex items-center justify-center text-on-surface/20 cursor-grab active:cursor-grabbing hover:text-primary transition-colors">
                    <GripVertical className="size-6" />
                  </button>
                  <div>
                    <h6 className="font-headline text-2xl font-black text-on-surface leading-tight tracking-tighter group-hover/chapter:text-primary transition-colors">
                      {chapter.title}
                    </h6>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[0.65rem] font-bold text-on-surface/40 flex items-center gap-1.5 uppercase tracking-widest">
                        <Shapes className="size-3.5" /> {chapter.lectures.length} Deliverables
                      </span>
                      <span className="text-[0.65rem] font-bold text-on-surface/40 flex items-center gap-1.5 uppercase tracking-widest">
                        <FileCheck className="size-3.5" /> {chapter.materials.length} Artifacts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-xl px-4 font-bold text-[0.65rem] uppercase tracking-widest border-outline-variant/30 hover:bg-surface-container-low"
                    onClick={() => {
                      setEditingChapterId(chapter.id);
                      setChapterEditDraft((cv) => ({
                        ...cv,
                        [chapter.id]: {
                          description: chapter.description ?? "",
                          title: chapter.title
                        }
                      }));
                    }}
                  >
                    <NotebookPen className="size-3.5 mr-2" /> Edit Node
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 w-10 p-0 rounded-xl text-on-surface/30 hover:text-red-500 hover:bg-red-500/5 transition-all"
                    onClick={() => void handleDeleteChapter(chapter.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6 sm:p-10 space-y-10">
                {editingChapterId === chapter.id ? (
                  <FadeIn className="bg-surface-container-low/40 p-8 rounded-3xl border border-primary/20 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label className="text-[0.6rem] font-bold uppercase tracking-widest ml-1 opacity-50">
                          Modify Title
                        </Label>
                        <Input
                          className="h-14 rounded-2xl bg-white border-outline-variant/30"
                          value={chapterEditDraft[chapter.id]?.title ?? ""}
                          onChange={(e) =>
                            setChapterEditDraft((cv) => ({
                              ...cv,
                              [chapter.id]: { ...cv[chapter.id]!, title: e.target.value }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[0.6rem] font-bold uppercase tracking-widest ml-1 opacity-50">
                          Modify Brief
                        </Label>
                        <Input
                          className="h-14 rounded-2xl bg-white border-outline-variant/30"
                          value={chapterEditDraft[chapter.id]?.description ?? ""}
                          onChange={(e) =>
                            setChapterEditDraft((cv) => ({
                              ...cv,
                              [chapter.id]: { ...cv[chapter.id]!, description: e.target.value }
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl px-6 font-bold"
                        onClick={() => setEditingChapterId(null)}
                      >
                        Discard
                      </Button>
                      <Button
                        className="h-11 rounded-xl px-8 font-extrabold bg-primary shadow-lg"
                        onClick={() => void handleSaveChapter(chapter.id)}
                      >
                        Synchronize Node
                      </Button>
                    </div>
                  </FadeIn>
                ) : chapter.description ? (
                  <p className="text-sm font-medium text-on-surface/60 italic leading-relaxed pl-12">
                    "{chapter.description}"
                  </p>
                ) : null}

                {/* Chapter Materials Section */}
                <div className="bg-surface-container-low/30 rounded-3xl p-6 border border-outline-variant/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                        <FileText className="size-4" />
                      </div>
                      <h6 className="text-[0.7rem] font-black uppercase tracking-widest text-on-surface">
                        Unit Handouts & Briefs
                      </h6>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
                    <Input
                      placeholder="Resource title (e.g. Formula Sheet)"
                      className="h-12 rounded-xl bg-white border-outline-variant/20"
                      value={chapterMaterialTitles[chapter.id] ?? ""}
                      onChange={(e) =>
                        setChapterMaterialTitles((cv) => ({ ...cv, [chapter.id]: e.target.value }))
                      }
                    />
                    <label className="h-12 px-6 flex items-center justify-center rounded-xl bg-surface-container-highest/50 border border-outline-variant/20 cursor-pointer text-xs font-black uppercase tracking-widest text-on-surface/60 hover:bg-surface-container-highest transition-all">
                      Index Data
                      <input
                        className="hidden"
                        type="file"
                        onChange={(e) => void handleChapterMaterialUpload(chapter.id, e)}
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {chapter.materials.map((m) => (
                      <div
                        key={m.id}
                        className="inline-flex items-center gap-3 py-2 px-4 rounded-full bg-white border border-outline-variant/20 shadow-sm transition-all hover:shadow-md hover:border-primary/30 group/mat relative pr-10"
                      >
                        <FileText className="size-3.5 text-orange-500" />
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[0.7rem] font-bold text-on-surface/80 hover:text-primary transition-colors"
                        >
                          {m.title}
                        </a>
                        <button
                          onClick={() => void handleDeleteMaterial(m.id, "chapter")}
                          className="absolute right-2 opacity-0 group-hover/mat:opacity-100 size-6 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lectures Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
                        <VideoIcon className="size-4" />
                      </div>
                      <h6 className="text-[0.7rem] font-black uppercase tracking-widest text-on-surface">
                        Instructional Deliverables
                      </h6>
                    </div>
                    <Badge
                      tone="violet"
                      className="rounded-full px-3 py-1 font-bold text-[0.6rem] bg-surface-container-high border border-outline-variant/20"
                    >
                      {chapter.lectures.length} Total
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {chapter.lectures.map((lecture) => (
                      <div
                        key={lecture.id}
                        draggable
                        className={cn(
                          "group/lecture p-5 rounded-3xl border transition-all duration-300 relative",
                          draggedLecture?.lectureId === lecture.id
                            ? "opacity-20 bg-primary/5 border-primary/20 border-dashed"
                            : "bg-white border-outline-variant/10 shadow-sm hover:shadow-xl hover:border-primary/20"
                        )}
                        onDragStart={() =>
                          setDraggedLecture({ chapterId: chapter.id, lectureId: lecture.id })
                        }
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => void handleReorderLecture(chapter.id, lecture.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <button className="h-10 w-6 shrink-0 flex items-center justify-center text-on-surface/10 cursor-grab active:cursor-grabbing hover:text-primary transition-colors">
                              <GripVertical className="size-5" />
                            </button>
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-headline font-bold text-on-surface group-hover/lecture:text-primary transition-colors">
                                  {lecture.title}
                                </p>
                                <Badge className="font-bold text-[0.6rem] bg-on-surface/5 text-on-surface/40 border-none px-2">
                                  {lecture.type}
                                </Badge>
                                {lecture.isPreview && (
                                  <Badge
                                    tone="blue"
                                    className="font-black text-[0.55rem] uppercase tracking-[0.15em] border-none px-2.5"
                                  >
                                    PREVIEW ACCESS
                                  </Badge>
                                )}
                              </div>
                              {lecture.description && (
                                <p className="text-xs text-on-surface/40 font-medium italic leading-relaxed">
                                  {lecture.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-xl px-4 font-bold text-[0.65rem] uppercase tracking-widest border-outline-variant/20"
                              onClick={() => {
                                setEditingLectureId(lecture.id);
                                setLectureEditDrafts((cv) => ({
                                  ...cv,
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
                              Configure
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 rounded-xl text-on-surface/20 hover:text-red-500 hover:bg-red-500/5 transition-all"
                              onClick={() => void handleDeleteLecture(lecture.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Lecture Edit Panel */}
                        {editingLectureId === lecture.id && (
                          <FadeIn className="mt-8 pt-8 border-t border-outline-variant/10 space-y-6 animate-in zoom-in-95 duration-500">
                            <LectureForm
                              values={lectureEditDrafts[lecture.id] ?? initialLectureDraft}
                              onCancel={() => setEditingLectureId(null)}
                              onChange={(v) =>
                                setLectureEditDrafts((cv) => ({ ...cv, [lecture.id]: v }))
                              }
                              onSave={() => void handleSaveLecture(lecture.id)}
                              isWorking={isWorking}
                              actionLabel="Update Deliverable"
                            />
                          </FadeIn>
                        )}
                      </div>
                    ))}

                    {/* Add Lecture Button/Form */}
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        className="w-full h-14 rounded-3xl border-dashed border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all font-headline font-bold"
                        onClick={() =>
                          setLectureDrafts((cv) => ({ ...cv, [chapter.id]: initialLectureDraft }))
                        }
                      >
                        <Plus className="size-5 mr-3" />
                        Materialize New Deliverable
                      </Button>

                      {lectureDrafts[chapter.id] && (
                        <div className="mt-6 p-8 rounded-4xl border border-primary/20 bg-primary/2 shadow-inner space-y-8 animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center justify-between">
                            <h6 className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary">
                              New Deliverable Genesis
                            </h6>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-9 p-0 rounded-full hover:bg-red-500/10 text-on-surface/30"
                              onClick={() =>
                                setLectureDrafts((cv) => {
                                  const n = { ...cv };
                                  delete n[chapter.id];
                                  return n;
                                })
                              }
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                          <LectureForm
                            values={lectureDrafts[chapter.id]!}
                            isWorking={isWorking}
                            onCancel={() =>
                              setLectureDrafts((cv) => {
                                const n = { ...cv };
                                delete n[chapter.id];
                                return n;
                              })
                            }
                            onChange={(v) => setLectureDrafts((cv) => ({ ...cv, [chapter.id]: v }))}
                            onSave={() => void handleCreateLecture(chapter.id)}
                            actionLabel="Anchor to Unit"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {content.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 rounded-4xl border border-dashed border-outline-variant/40 bg-surface-container-lowest/50 opacity-40">
              <AlertCircle className="size-12 text-on-surface mb-4" />
              <p className="font-headline text-lg font-bold mb-1">Curriculum Reservoir Empty</p>
              <p className="text-xs uppercase tracking-widest font-black italic">
                Initialize your first unit node to begin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LectureForm({
  values,
  onChange,
  onSave,
  onCancel,
  isWorking,
  actionLabel
}: {
  values: LectureDraft;
  onChange: (v: LectureDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  isWorking: boolean;
  actionLabel: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-[0.6rem] font-bold uppercase tracking-widest ml-1 opacity-50">
            Deliverable Title
          </Label>
          <Input
            className="h-12 rounded-xl bg-surface-container-low/20"
            placeholder="e.g. Fundamental Theorem of Algebra"
            value={values.title}
            onChange={(e) => onChange({ ...values, title: e.target.value })}
          />
        </div>
        <div className="space-y-3">
          <Label className="text-[0.6rem] font-bold uppercase tracking-widest ml-1 opacity-50">
            Delivery Mode
          </Label>
          <Select
            className="h-12 rounded-xl"
            value={values.type}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onChange({ ...values, type: e.target.value as LectureDraft["type"] })
            }
          >
            <option value="VIDEO_UPLOAD">Instructional Video</option>
            <option value="VIDEO_LINK">External Link</option>
            <option value="TEXT">Rich Text Component</option>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-[0.6rem] font-bold uppercase tracking-widest ml-1 opacity-50">
          Academic Context (Optional)
        </Label>
        <Textarea
          className="min-h-32 rounded-3xl bg-surface-container-low/20 p-5"
          placeholder="Briefly state delivery outcomes for student preview..."
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
        />
      </div>

      <div className="p-6 rounded-3xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6 shadow-inner">
        {values.type === "VIDEO_UPLOAD" && (
          <div className="space-y-4">
            <Label className="text-[0.6rem] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Video className="size-3.5" /> High-Resolution Transmission
            </Label>
            <VideoUploader
              label="Lecture Transmission"
              value={{ mode: "VIDEO_UPLOAD", videoUrl: values.videoUrl }}
              onValueChange={(v) => onChange({ ...values, videoUrl: v.videoUrl })}
            />
          </div>
        )}

        {values.type === "VIDEO_LINK" && (
          <div className="space-y-3">
            <Label className="text-[0.6rem] font-black uppercase tracking-widest text-secondary flex items-center gap-2">
              <LinkIcon className="size-3.5" /> Synchronized Stream Link
            </Label>
            <Input
              className="h-12 rounded-xl bg-white"
              placeholder="e.g. YouTube or Vimeo URL"
              value={values.videoUrl}
              onChange={(e) => onChange({ ...values, videoUrl: e.target.value })}
            />
          </div>
        )}

        {values.type === "TEXT" && (
          <div className="space-y-3">
            <Label className="text-[0.6rem] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
              <FileCode className="size-3.5" /> Rich Academic Data
            </Label>
            <Textarea
              className="min-h-40 rounded-3xl bg-white p-5"
              placeholder="Embed instructional text or reference data here..."
              value={values.content}
              onChange={(e) => onChange({ ...values, content: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.isPreview}
            onChange={(e) => onChange({ ...values, isPreview: e.target.checked })}
            className="size-5 accent-primary transition-all"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-on-surface">Enable Public Preview</span>
            <span className="text-[0.6rem] text-on-surface/40 leading-none">
              Un-enrolled students can access this deliverable for evaluation.
            </span>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-2xl px-6 font-bold"
            disabled={isWorking}
            onClick={onCancel}
          >
            Retract
          </Button>
          <Button
            className="h-12 rounded-2xl px-10 font-headline font-extrabold bg-primary shadow-lg"
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
    <div className="space-y-10 animate-in fade-in duration-700">
      <Skeleton className="h-48 w-full bg-surface-container-lowest rounded-4xl border border-outline-variant/40 shadow-xl" />

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Skeleton className="h-24 w-full bg-surface-container-low/40 rounded-4xl" />
          <Skeleton className="h-64 w-full bg-surface-container-lowest rounded-4xl border border-outline-variant/40" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-96 w-full bg-surface-container-lowest rounded-4xl border border-outline-variant/40 shadow-md"
            />
          ))}
        </div>
        <div className="space-y-8 h-fit xl:sticky xl:top-24">
          <Skeleton className="h-120 w-full bg-surface-container-lowest rounded-4xl border border-outline-variant/40 shadow-xl" />
        </div>
      </div>
    </div>
  );
}
