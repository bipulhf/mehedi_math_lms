import { Link } from "@tanstack/react-router";
import { FileText, GripVertical, NotebookPen, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { FadeIn } from "@/components/common/fade-in";
import { VideoUploader } from "@/components/uploads/video-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CourseDetail } from "@/lib/api/courses";
import type { ContentChapter, ContentLecture, CreateChapterInput } from "@/lib/api/content";
import {
  createChapter,
  createChapterMaterial,
  createLecture,
  createLectureMaterial,
  deleteChapter,
  deleteChapterMaterial,
  deleteLecture,
  deleteLectureMaterial,
  reorderChapters,
  reorderLectures,
  updateChapter,
  updateChapterMaterial,
  updateLecture,
  updateLectureMaterial
} from "@/lib/api/content";
import { uploadCourseMaterial } from "@/lib/api/uploads";

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
  videoDuration?: number | undefined;
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
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [chapterEditDraft, setChapterEditDraft] = useState<Record<string, CreateChapterInput>>({});
  const [lectureDrafts, setLectureDrafts] = useState<Record<string, LectureDraft>>({});
  const [lectureEditDrafts, setLectureEditDrafts] = useState<Record<string, LectureDraft>>({});
  const [chapterMaterialTitles, setChapterMaterialTitles] = useState<Record<string, string>>({});
  const [lectureMaterialTitles, setLectureMaterialTitles] = useState<Record<string, string>>({});
  const [materialTitleDrafts, setMaterialTitleDrafts] = useState<Record<string, string>>({});
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
      await updateChapter(chapterId, draft);
      setEditingChapterId(null);
      await onRefresh();
      toast.success("Chapter updated");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string): Promise<void> => {
    if (!window.confirm("Delete this chapter and all of its content?")) {
      return;
    }

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
        videoDuration: draft.videoDuration,
        videoUrl: draft.videoUrl
      });
      setLectureDrafts((currentValues) => ({
        ...currentValues,
        [chapterId]: initialLectureDraft
      }));
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
        videoDuration: draft.videoDuration,
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
    if (!window.confirm("Delete this lecture?")) {
      return;
    }

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
      setChapterMaterialTitles((currentValues) => ({
        ...currentValues,
        [chapterId]: ""
      }));
      event.target.value = "";
      await onRefresh();
      toast.success("Chapter material added");
    } finally {
      setIsWorking(false);
    }
  };

  const handleLectureMaterialUpload = async (
    lectureId: string,
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    const title = lectureMaterialTitles[lectureId]?.trim() ?? "";

    if (!file || !title) {
      toast.error("Add a material title and choose a file");
      return;
    }

    setIsWorking(true);

    try {
      validateMaterialFile(file);
      const fileUrl = await uploadCourseMaterial(file);
      await createLectureMaterial(lectureId, {
        fileSize: file.size,
        fileType: file.type,
        fileUrl,
        title
      });
      setLectureMaterialTitles((currentValues) => ({
        ...currentValues,
        [lectureId]: ""
      }));
      event.target.value = "";
      await onRefresh();
      toast.success("Lecture material added");
    } finally {
      setIsWorking(false);
    }
  };

  const handleRenameMaterial = async (
    materialId: string,
    materialType: "chapter" | "lecture"
  ): Promise<void> => {
    const title = materialTitleDrafts[materialId]?.trim();

    if (!title) {
      toast.error("Material title is required");
      return;
    }

    setIsWorking(true);

    try {
      if (materialType === "chapter") {
        await updateChapterMaterial(materialId, { title });
      } else {
        await updateLectureMaterial(materialId, { title });
      }

      setEditingMaterialId(null);
      await onRefresh();
      toast.success("Material updated");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteMaterial = async (
    materialId: string,
    materialType: "chapter" | "lecture"
  ): Promise<void> => {
    if (!window.confirm("Delete this material?")) {
      return;
    }

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
    if (!draggedChapterId || draggedChapterId === targetChapterId) {
      return;
    }

    const nextContent = [...content];
    const sourceIndex = nextContent.findIndex((chapter) => chapter.id === draggedChapterId);
    const targetIndex = nextContent.findIndex((chapter) => chapter.id === targetChapterId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    const [movedChapter] = nextContent.splice(sourceIndex, 1);

    if (!movedChapter) {
      return;
    }

    nextContent.splice(targetIndex, 0, movedChapter);
    setDraggedChapterId(null);
    setIsWorking(true);

    try {
      await reorderChapters(course.id, {
        items: nextContent.map((chapter, index) => ({
          id: chapter.id,
          sortOrder: index
        }))
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
    if (!draggedLecture || draggedLecture.lectureId === targetLectureId) {
      return;
    }

    const nextContent = cloneContent(content);
    let movedLecture: ContentLecture | null = null;

    for (const chapter of nextContent) {
      const lectureIndex = chapter.lectures.findIndex(
        (lecture) => lecture.id === draggedLecture.lectureId
      );

      if (lectureIndex !== -1) {
        const mutableLectures = [...chapter.lectures];
        const [candidateLecture] = mutableLectures.splice(lectureIndex, 1);

        if (candidateLecture) {
          movedLecture = candidateLecture;
          chapter.lectures = mutableLectures;
        }
      }
    }

    if (!movedLecture) {
      return;
    }

    for (const chapter of nextContent) {
      if (chapter.id !== targetChapterId) {
        continue;
      }

      const mutableLectures = [...chapter.lectures];
      const targetIndex = mutableLectures.findIndex((lecture) => lecture.id === targetLectureId);

      if (targetIndex === -1) {
        mutableLectures.push({
          ...movedLecture,
          chapterId: targetChapterId
        });
      } else {
        mutableLectures.splice(targetIndex, 0, {
          ...movedLecture,
          chapterId: targetChapterId
        });
      }

      chapter.lectures = mutableLectures;
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
      await reorderLectures(targetChapterId, {
        items: reorderedItems
      });
      await onRefresh();
      toast.success("Lecture order updated");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <FadeIn>
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <CourseStatusBadge status={course.status} />
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface">
                    {content.length} chapters
                  </span>
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface">
                    {totalLectures} lectures
                  </span>
                </div>
                <CardTitle>Content atelier for {course.title}</CardTitle>
                <CardDescription>
                  Shape chapters, switch lecture delivery modes, attach materials, and keep the
                  learning path ordered with direct drag-and-drop.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/dashboard/courses/$id/edit" params={{ id: course.id }}>
                    Back to course details
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/courses/$slug" params={{ slug: course.slug }}>
                    Preview public page
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </FadeIn>

        <Card>
          <CardHeader>
            <CardTitle>Add chapter</CardTitle>
            <CardDescription>
              Start the structure with a clear title and an optional chapter summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-chapter-title">Chapter title</Label>
              <Input
                id="new-chapter-title"
                value={chapterDraft.title}
                onChange={(event) =>
                  setChapterDraft((currentValues) => ({
                    ...currentValues,
                    title: event.target.value
                  }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="new-chapter-description">Description</Label>
              <Textarea
                id="new-chapter-description"
                value={chapterDraft.description}
                onChange={(event) =>
                  setChapterDraft((currentValues) => ({
                    ...currentValues,
                    description: event.target.value
                  }))
                }
              />
            </div>
            <Button type="button" disabled={isWorking} onClick={() => void handleCreateChapter()}>
              <Plus className="size-4" />
              Add chapter
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {content.map((chapter) => (
            <Card
              key={chapter.id}
              draggable
              className="overflow-hidden"
              onDragStart={() => setDraggedChapterId(chapter.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleReorderChapters(chapter.id)}
            >
              <CardHeader className="border-b border-outline-variant bg-surface-container-low">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 rounded-full bg-surface px-2 py-2 text-on-surface/62">
                      <GripVertical className="size-4" />
                    </span>
                    <div>
                      <CardTitle className="text-xl">{chapter.title}</CardTitle>
                      <CardDescription>
                        {chapter.lectures.length} lectures • {chapter.materials.length} materials
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingChapterId(chapter.id);
                        setChapterEditDraft((currentValues) => ({
                          ...currentValues,
                          [chapter.id]: {
                            description: chapter.description ?? "",
                            title: chapter.title
                          }
                        }));
                      }}
                    >
                      <NotebookPen className="size-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDeleteChapter(chapter.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                {editingChapterId === chapter.id ? (
                  <div className="grid gap-4 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4">
                    <Input
                      value={chapterEditDraft[chapter.id]?.title ?? ""}
                      onChange={(event) =>
                        setChapterEditDraft((currentValues) => ({
                          ...currentValues,
                          [chapter.id]: {
                            description: currentValues[chapter.id]?.description ?? "",
                            title: event.target.value
                          }
                        }))
                      }
                    />
                    <Textarea
                      value={chapterEditDraft[chapter.id]?.description ?? ""}
                      onChange={(event) =>
                        setChapterEditDraft((currentValues) => ({
                          ...currentValues,
                          [chapter.id]: {
                            description: event.target.value,
                            title: currentValues[chapter.id]?.title ?? chapter.title
                          }
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleSaveChapter(chapter.id)}
                      >
                        Save chapter
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingChapterId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : chapter.description ? (
                  <p className="text-sm leading-6 text-on-surface/70">{chapter.description}</p>
                ) : null}

                <div className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="size-4 text-on-surface/62" />
                    <p className="font-semibold text-on-surface">Chapter materials</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <Input
                      placeholder="Material title"
                      value={chapterMaterialTitles[chapter.id] ?? ""}
                      onChange={(event) =>
                        setChapterMaterialTitles((currentValues) => ({
                          ...currentValues,
                          [chapter.id]: event.target.value
                        }))
                      }
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.15)]">
                      Upload file
                      <input
                        className="hidden"
                        type="file"
                        onChange={(event) => void handleChapterMaterialUpload(chapter.id, event)}
                      />
                    </label>
                  </div>
                  <div className="mt-4 space-y-2">
                    {chapter.materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3"
                      >
                        <div className="min-w-0 flex-1">
                          {editingMaterialId === material.id ? (
                            <Input
                              value={materialTitleDrafts[material.id] ?? material.title}
                              onChange={(event) =>
                                setMaterialTitleDrafts((currentValues) => ({
                                  ...currentValues,
                                  [material.id]: event.target.value
                                }))
                              }
                            />
                          ) : (
                            <>
                              <p className="font-semibold text-on-surface">{material.title}</p>
                              <a
                                className="text-sm text-secondary-container hover:underline"
                                href={material.fileUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Open material
                              </a>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {editingMaterialId === material.id ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleRenameMaterial(material.id, "chapter")}
                            >
                              Save
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingMaterialId(material.id);
                                setMaterialTitleDrafts((currentValues) => ({
                                  ...currentValues,
                                  [material.id]: material.title
                                }));
                              }}
                            >
                              Rename
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDeleteMaterial(material.id, "chapter")}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {chapter.lectures.map((lecture) => (
                    <div
                      key={lecture.id}
                      draggable
                      className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-lowest p-4"
                      onDragStart={() =>
                        setDraggedLecture({ chapterId: chapter.id, lectureId: lecture.id })
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => void handleReorderLecture(chapter.id, lecture.id)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 rounded-full bg-surface-container-low px-2 py-2 text-on-surface/62">
                            <GripVertical className="size-4" />
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-on-surface">{lecture.title}</p>
                              <span className="rounded-full bg-surface-container-low px-2 py-1 text-xs font-semibold text-on-surface/62">
                                {lecture.type}
                              </span>
                              {lecture.isPreview ? (
                                <span className="rounded-full bg-secondary-container/10 px-2 py-1 text-xs font-semibold text-secondary-container">
                                  Preview
                                </span>
                              ) : null}
                            </div>
                            {lecture.description ? (
                              <p className="mt-1 text-sm leading-6 text-on-surface/70">
                                {lecture.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingLectureId(lecture.id);
                              setLectureEditDrafts((currentValues) => ({
                                ...currentValues,
                                [lecture.id]: {
                                  content: lecture.content ?? "",
                                  description: lecture.description ?? "",
                                  isPreview: lecture.isPreview,
                                  title: lecture.title,
                                  type: lecture.type,
                                  videoDuration: lecture.videoDuration ?? undefined,
                                  videoUrl: lecture.videoUrl ?? ""
                                }
                              }));
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDeleteLecture(lecture.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {editingLectureId === lecture.id ? (
                        <div className="mt-4 grid gap-4 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                          <Input
                            value={lectureEditDrafts[lecture.id]?.title ?? ""}
                            onChange={(event) =>
                              setLectureEditDrafts((currentValues) => ({
                                ...currentValues,
                                [lecture.id]: {
                                  ...(currentValues[lecture.id] ?? initialLectureDraft),
                                  title: event.target.value
                                }
                              }))
                            }
                          />
                          <Select
                            value={lectureEditDrafts[lecture.id]?.type ?? "TEXT"}
                            onChange={(event) =>
                              setLectureEditDrafts((currentValues) => ({
                                ...currentValues,
                                [lecture.id]: {
                                  ...(currentValues[lecture.id] ?? initialLectureDraft),
                                  type: event.target.value as LectureDraft["type"]
                                }
                              }))
                            }
                          >
                            <option value="TEXT">Text</option>
                            <option value="VIDEO_LINK">Video link</option>
                            <option value="VIDEO_UPLOAD">Video upload</option>
                          </Select>
                          <Textarea
                            placeholder="Description"
                            value={lectureEditDrafts[lecture.id]?.description ?? ""}
                            onChange={(event) =>
                              setLectureEditDrafts((currentValues) => ({
                                ...currentValues,
                                [lecture.id]: {
                                  ...(currentValues[lecture.id] ?? initialLectureDraft),
                                  description: event.target.value
                                }
                              }))
                            }
                          />
                          {(lectureEditDrafts[lecture.id]?.type ?? "TEXT") === "TEXT" ? (
                            <Textarea
                              placeholder="Lecture content"
                              value={lectureEditDrafts[lecture.id]?.content ?? ""}
                              onChange={(event) =>
                                setLectureEditDrafts((currentValues) => ({
                                  ...currentValues,
                                  [lecture.id]: {
                                    ...(currentValues[lecture.id] ?? initialLectureDraft),
                                    content: event.target.value
                                  }
                                }))
                              }
                            />
                          ) : (
                            <VideoUploader
                              label="Lecture video"
                              value={{
                                mode:
                                  (lectureEditDrafts[lecture.id]?.type ?? "VIDEO_LINK") ===
                                  "VIDEO_UPLOAD"
                                    ? "VIDEO_UPLOAD"
                                    : "VIDEO_LINK",
                                videoUrl: lectureEditDrafts[lecture.id]?.videoUrl ?? ""
                              }}
                              onValueChange={(nextValue) =>
                                setLectureEditDrafts((currentValues) => ({
                                  ...currentValues,
                                  [lecture.id]: {
                                    ...(currentValues[lecture.id] ?? initialLectureDraft),
                                    type: nextValue.mode,
                                    videoUrl: nextValue.videoUrl
                                  }
                                }))
                              }
                            />
                          )}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleSaveLecture(lecture.id)}
                            >
                              Save lecture
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingLectureId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                        <p className="mb-3 font-semibold text-on-surface">Lecture materials</p>
                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                          <Input
                            placeholder="Material title"
                            value={lectureMaterialTitles[lecture.id] ?? ""}
                            onChange={(event) =>
                              setLectureMaterialTitles((currentValues) => ({
                                ...currentValues,
                                [lecture.id]: event.target.value
                              }))
                            }
                          />
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.15)]">
                            Upload file
                            <input
                              className="hidden"
                              type="file"
                              onChange={(event) =>
                                void handleLectureMaterialUpload(lecture.id, event)
                              }
                            />
                          </label>
                        </div>
                        <div className="mt-3 space-y-2">
                          {lecture.materials.map((material) => (
                            <div
                              key={material.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-lowest p-3"
                            >
                              <div className="min-w-0 flex-1">
                                {editingMaterialId === material.id ? (
                                  <Input
                                    value={materialTitleDrafts[material.id] ?? material.title}
                                    onChange={(event) =>
                                      setMaterialTitleDrafts((currentValues) => ({
                                        ...currentValues,
                                        [material.id]: event.target.value
                                      }))
                                    }
                                  />
                                ) : (
                                  <>
                                    <p className="font-semibold text-on-surface">
                                      {material.title}
                                    </p>
                                    <a
                                      className="text-sm text-secondary-container hover:underline"
                                      href={material.fileUrl}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      Open material
                                    </a>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {editingMaterialId === material.id ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                      void handleRenameMaterial(material.id, "lecture")
                                    }
                                  >
                                    Save
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingMaterialId(material.id);
                                      setMaterialTitleDrafts((currentValues) => ({
                                        ...currentValues,
                                        [material.id]: material.title
                                      }));
                                    }}
                                  >
                                    Rename
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleDeleteMaterial(material.id, "lecture")}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-outline-variant bg-surface-container-low p-4">
                    <p className="mb-3 font-semibold text-on-surface">Add lecture</p>
                    <div className="grid gap-4">
                      <Input
                        placeholder="Lecture title"
                        value={lectureDrafts[chapter.id]?.title ?? ""}
                        onChange={(event) =>
                          setLectureDrafts((currentValues) => ({
                            ...currentValues,
                            [chapter.id]: {
                              ...(currentValues[chapter.id] ?? initialLectureDraft),
                              title: event.target.value
                            }
                          }))
                        }
                      />
                      <Select
                        value={lectureDrafts[chapter.id]?.type ?? "TEXT"}
                        onChange={(event) =>
                          setLectureDrafts((currentValues) => ({
                            ...currentValues,
                            [chapter.id]: {
                              ...(currentValues[chapter.id] ?? initialLectureDraft),
                              type: event.target.value as LectureDraft["type"]
                            }
                          }))
                        }
                      >
                        <option value="TEXT">Text lecture</option>
                        <option value="VIDEO_LINK">Video link</option>
                        <option value="VIDEO_UPLOAD">Video upload</option>
                      </Select>
                      <Textarea
                        placeholder="Short lecture description"
                        value={lectureDrafts[chapter.id]?.description ?? ""}
                        onChange={(event) =>
                          setLectureDrafts((currentValues) => ({
                            ...currentValues,
                            [chapter.id]: {
                              ...(currentValues[chapter.id] ?? initialLectureDraft),
                              description: event.target.value
                            }
                          }))
                        }
                      />
                      {(lectureDrafts[chapter.id]?.type ?? "TEXT") === "TEXT" ? (
                        <Textarea
                          placeholder="Lecture content"
                          value={lectureDrafts[chapter.id]?.content ?? ""}
                          onChange={(event) =>
                            setLectureDrafts((currentValues) => ({
                              ...currentValues,
                              [chapter.id]: {
                                ...(currentValues[chapter.id] ?? initialLectureDraft),
                                content: event.target.value
                              }
                            }))
                          }
                        />
                      ) : (
                        <VideoUploader
                          label="Lecture video"
                          value={{
                            mode:
                              (lectureDrafts[chapter.id]?.type ?? "VIDEO_LINK") === "VIDEO_UPLOAD"
                                ? "VIDEO_UPLOAD"
                                : "VIDEO_LINK",
                            videoUrl: lectureDrafts[chapter.id]?.videoUrl ?? ""
                          }}
                          onValueChange={(nextValue) =>
                            setLectureDrafts((currentValues) => ({
                              ...currentValues,
                              [chapter.id]: {
                                ...(currentValues[chapter.id] ?? initialLectureDraft),
                                type: nextValue.mode,
                                videoUrl: nextValue.videoUrl
                              }
                            }))
                          }
                        />
                      )}
                      <label className="flex items-center gap-3 text-sm text-on-surface">
                        <input
                          checked={lectureDrafts[chapter.id]?.isPreview ?? false}
                          className="h-4 w-4 accent-(--secondary-container)"
                          type="checkbox"
                          onChange={(event) =>
                            setLectureDrafts((currentValues) => ({
                              ...currentValues,
                              [chapter.id]: {
                                ...(currentValues[chapter.id] ?? initialLectureDraft),
                                isPreview: event.target.checked
                              }
                            }))
                          }
                        />
                        <span>Mark as preview lecture</span>
                      </label>
                      <Button
                        type="button"
                        disabled={isWorking}
                        onClick={() => void handleCreateLecture(chapter.id)}
                      >
                        <Plus className="size-4" />
                        Add lecture
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <FadeIn delayClassName="delay-75">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Structure preview</CardTitle>
              <CardDescription>
                A quick read on hierarchy, lecture density, and material placement before students
                ever enter the player.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {content.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface/45">
                    Chapter {index + 1}
                  </p>
                  <p className="mt-2 font-semibold text-on-surface">{chapter.title}</p>
                  <p className="mt-2 text-sm text-on-surface/62">
                    {chapter.lectures.length} lectures • {chapter.materials.length} materials
                  </p>
                  <div className="mt-3 space-y-2">
                    {chapter.lectures.map((lecture) => (
                      <div
                        key={lecture.id}
                        className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-lowest px-3 py-2 text-sm text-on-surface/70"
                      >
                        {lecture.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

export function CourseContentBuilderSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="space-y-3">
            <div className="h-6 w-32 animate-pulse rounded-full bg-surface-container-low" />
            <div className="h-8 w-80 animate-pulse rounded-full bg-surface-container-low" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-container-low" />
          </CardHeader>
        </Card>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-3">
              <div className="h-7 w-56 animate-pulse rounded-full bg-surface-container-low" />
              <div className="h-4 w-40 animate-pulse rounded-full bg-surface-container-low" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-24 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low" />
              <div className="h-40 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="space-y-3">
          <div className="h-7 w-44 animate-pulse rounded-full bg-surface-container-low" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-surface-container-low" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low"
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
