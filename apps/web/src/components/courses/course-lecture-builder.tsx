import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Plus,
  Trash2
} from "lucide-react";
import type { ChangeEvent, DragEvent, JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  PdfLecturePreview,
  VideoLecturePreview
} from "@/components/courses/course-lecture-preview";
import {
  ExamOutlineRow,
  isPdfLecture,
  LectureOutlineRow
} from "@/components/courses/course-lecture-outline-item";
import { VideoUploader } from "@/components/uploads/video-uploader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterPill } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ContentChapter, ContentLecture } from "@/lib/api/content";
import {
  createLecture,
  createLectureMaterial,
  deleteLecture,
  deleteLectureMaterial,
  reorderLectures,
  updateLecture
} from "@/lib/api/content";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { createTest, deleteTest } from "@/lib/api/tests";
import { uploadCourseMaterial } from "@/lib/api/uploads";
import { useFormat, useT } from "@/lib/i18n/locale-context";

type AuthoringLectureType = "EXAM" | "PDF" | "VIDEO";
type VideoMode = "VIDEO_LINK" | "VIDEO_UPLOAD";

interface LectureDraft {
  description: string;
  existingPdfUrl: string;
  isPreview: boolean;
  pdfFile: File | null;
  title: string;
  type: AuthoringLectureType;
  videoMode: VideoMode;
  videoUrl: string;
}

interface CourseLectureBuilderProps {
  assessments: readonly AssessmentChapterSummary[];
  chapters: readonly ContentChapter[];
  courseId: string;
  onRefresh: () => Promise<void>;
}

type DeleteTarget = { id: string; kind: "exam" } | { id: string; kind: "lecture" };

interface DraggedLecture {
  chapterId: string;
  lectureId: string;
}

function createEmptyDraft(): LectureDraft {
  return {
    description: "",
    existingPdfUrl: "",
    isPreview: false,
    pdfFile: null,
    title: "",
    type: "VIDEO",
    videoMode: "VIDEO_LINK",
    videoUrl: ""
  };
}

export function CourseLectureBuilder({
  assessments,
  chapters,
  courseId,
  onRefresh
}: CourseLectureBuilderProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [activeChapterId, setActiveChapterId] = useState(chapters[0]?.id ?? "");
  const [draft, setDraft] = useState<LectureDraft>(createEmptyDraft);
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [draggedLecture, setDraggedLecture] = useState<DraggedLecture | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!chapters.some((chapter) => chapter.id === activeChapterId)) {
      setActiveChapterId(chapters[0]?.id ?? "");
    }
  }, [activeChapterId, chapters]);

  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === activeChapterId) ?? null,
    [activeChapterId, chapters]
  );
  const resetComposer = (): void => {
    setDraft(createEmptyDraft());
    setEditingLectureId(null);
  };

  const validateDraft = (): boolean => {
    if (!draft.title.trim()) {
      toast.error(t("author.needLectureName"));
      return false;
    }

    if (draft.type === "VIDEO" && !draft.videoUrl.trim()) {
      toast.error(t("author.needVideo"));
      return false;
    }

    if (draft.type === "PDF" && !draft.pdfFile && !draft.existingPdfUrl) {
      toast.error(t("author.needPdf"));
      return false;
    }

    return true;
  };

  const handleCreate = async (): Promise<void> => {
    if (!activeChapter || !validateDraft()) {
      return;
    }

    setIsWorking(true);
    try {
      if (draft.type === "EXAM") {
        const questionTab = window.open("about:blank", "_blank");

        if (questionTab) {
          questionTab.opener = null;
        }

        const exam = await createTest(activeChapter.id, {
          description: draft.description,
          isPublished: false,
          title: draft.title,
          type: "MCQ"
        });
        resetComposer();
        await onRefresh();
        const examUrl = `/dashboard/courses/${encodeURIComponent(courseId)}/exam?examId=${encodeURIComponent(exam.id)}`;

        if (questionTab) {
          questionTab.location.replace(examUrl);
        } else {
          window.open(examUrl, "_blank", "noopener,noreferrer");
        }
        toast.success(t("author.examAdded"));
        return;
      }

      const lecture = await createLecture(activeChapter.id, {
        content: draft.type === "PDF" ? "PDF" : "",
        description: draft.description,
        isPreview: draft.isPreview,
        title: draft.title,
        type: draft.type === "PDF" ? "TEXT" : draft.videoMode,
        videoUrl: draft.type === "VIDEO" ? draft.videoUrl : ""
      });

      if (draft.type === "PDF" && draft.pdfFile) {
        const fileUrl = await uploadCourseMaterial(draft.pdfFile);
        await createLectureMaterial(lecture.id, {
          fileSize: draft.pdfFile.size,
          fileType: draft.pdfFile.type || "application/pdf",
          fileUrl,
          title: draft.title
        });
      }

      resetComposer();
      await onRefresh();
      toast.success(t("author.lectureAdded"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdate = async (): Promise<void> => {
    if (!editingLectureId || !validateDraft()) {
      return;
    }

    const currentLecture = chapters
      .flatMap((chapter) => chapter.lectures)
      .find((lecture) => lecture.id === editingLectureId);

    if (!currentLecture) {
      return;
    }

    const existingPdfs = currentLecture.materials.filter(
      (material) => material.fileType === "application/pdf"
    );

    setIsWorking(true);
    try {
      await updateLecture(editingLectureId, {
        content: draft.type === "PDF" ? "PDF" : "",
        description: draft.description,
        isPreview: draft.isPreview,
        title: draft.title,
        type: draft.type === "PDF" ? "TEXT" : draft.videoMode,
        videoUrl: draft.type === "VIDEO" ? draft.videoUrl : ""
      });

      if (draft.type === "PDF" && draft.pdfFile) {
        const fileUrl = await uploadCourseMaterial(draft.pdfFile);
        await createLectureMaterial(editingLectureId, {
          fileSize: draft.pdfFile.size,
          fileType: draft.pdfFile.type || "application/pdf",
          fileUrl,
          title: draft.title
        });
        await Promise.all(existingPdfs.map(async (material) => deleteLectureMaterial(material.id)));
      }

      if (draft.type === "VIDEO") {
        await Promise.all(existingPdfs.map(async (material) => deleteLectureMaterial(material.id)));
      }

      resetComposer();
      await onRefresh();
      toast.success(t("cbx.lessonUpdated"));
    } finally {
      setIsWorking(false);
    }
  };

  const startEditLecture = (chapterId: string, lecture: ContentLecture): void => {
    const isPdf = isPdfLecture(lecture);
    const pdfMaterial = lecture.materials.find(
      (material) => material.fileType === "application/pdf"
    );
    setActiveChapterId(chapterId);
    setEditingLectureId(lecture.id);
    setDraft({
      description: lecture.description ?? "",
      existingPdfUrl: pdfMaterial?.fileUrl ?? "",
      isPreview: lecture.isPreview,
      pdfFile: null,
      title: lecture.title,
      type: isPdf ? "PDF" : "VIDEO",
      videoMode: lecture.type === "VIDEO_UPLOAD" ? "VIDEO_UPLOAD" : "VIDEO_LINK",
      videoUrl: lecture.videoUrl ?? ""
    });
  };

  const saveLectureOrder = async (
    lectureLists: ReadonlyMap<string, readonly ContentLecture[]>,
    targetChapterId: string
  ): Promise<void> => {
    setIsWorking(true);
    try {
      await reorderLectures(targetChapterId, {
        items: chapters.flatMap((chapter) =>
          (lectureLists.get(chapter.id) ?? []).map((lecture, index) => ({
            chapterId: chapter.id,
            id: lecture.id,
            sortOrder: index
          }))
        )
      });
      await onRefresh();
      toast.success(t("author.lectureMoved"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleMoveLecture = async (
    chapterId: string,
    lectureId: string,
    offset: -1 | 1
  ): Promise<void> => {
    const chapter = chapters.find((item) => item.id === chapterId);
    const currentIndex = chapter?.lectures.findIndex((lecture) => lecture.id === lectureId) ?? -1;
    const targetIndex = currentIndex + offset;

    if (!chapter || currentIndex < 0 || targetIndex < 0 || targetIndex >= chapter.lectures.length) {
      return;
    }

    const reordered = [...chapter.lectures];
    const [movedLecture] = reordered.splice(currentIndex, 1);

    if (!movedLecture) {
      return;
    }

    reordered.splice(targetIndex, 0, movedLecture);
    const lectureLists = new Map(
      chapters.map((item) => [item.id, item.id === chapterId ? reordered : item.lectures] as const)
    );
    await saveLectureOrder(lectureLists, chapterId);
  };

  const handleLectureDrop = async (
    event: DragEvent<HTMLElement>,
    targetChapterId: string,
    targetLectureId?: string | undefined
  ): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedLecture || draggedLecture.lectureId === targetLectureId || isWorking) {
      setDraggedLecture(null);
      return;
    }

    const lectureLists = new Map(
      chapters.map((chapter) => [chapter.id, [...chapter.lectures]] as const)
    );
    const sourceLectures = lectureLists.get(draggedLecture.chapterId);
    const targetLectures = lectureLists.get(targetChapterId);
    const sourceIndex = sourceLectures?.findIndex(
      (lecture) => lecture.id === draggedLecture.lectureId
    );

    if (!sourceLectures || !targetLectures || sourceIndex === undefined || sourceIndex < 0) {
      setDraggedLecture(null);
      return;
    }

    const [movedLecture] = sourceLectures.splice(sourceIndex, 1);

    if (!movedLecture) {
      setDraggedLecture(null);
      return;
    }

    const targetIndex = targetLectureId
      ? targetLectures.findIndex((lecture) => lecture.id === targetLectureId)
      : targetLectures.length;
    targetLectures.splice(targetIndex < 0 ? targetLectures.length : targetIndex, 0, movedLecture);
    setDraggedLecture(null);
    await saveLectureOrder(lectureLists, targetChapterId);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    setIsWorking(true);
    try {
      if (deleteTarget.kind === "exam") {
        await deleteTest(deleteTarget.id);
        toast.success(t("ab.deleted"));
      } else {
        await deleteLecture(deleteTarget.id);
        toast.success(t("cbx.lessonDeleted"));
      }
      setDeleteTarget(null);
      await onRefresh();
    } finally {
      setIsWorking(false);
    }
  };

  if (chapters.length === 0) {
    return (
      <div className="space-y-5">
        <div className="border border-dashed border-dot-idle bg-card px-6 py-12 text-center">
          <p className="text-lg font-medium text-ink">{t("author.needChapter")}</p>
        </div>
        <Button asChild className="h-11" variant="outline">
          <Link
            params={{ id: courseId }}
            search={{ stage: "chapters" }}
            to="/dashboard/courses/$id/content"
          >
            <ArrowLeft className="size-4" />
            {t("author.continueChapters")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-5 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="authoring-chapter">{t("author.chooseChapter")}</Label>
          <Select
            className="h-11 w-full md:max-w-md"
            id="authoring-chapter"
            value={activeChapterId}
            onChange={(event) => {
              setActiveChapterId(event.target.value);
              resetComposer();
            }}
          >
            {chapters.map((chapter, index) => (
              <option key={chapter.id} value={chapter.id}>
                {format.digits(String(index + 1).padStart(2, "0"))} · {chapter.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <LectureComposer
        draft={draft}
        isEditing={editingLectureId !== null}
        isWorking={isWorking}
        onCancel={resetComposer}
        onChange={setDraft}
        onSave={() => void (editingLectureId ? handleUpdate() : handleCreate())}
      />

      <section className="space-y-4 border-t border-hairline pt-6">
        <div>
          <h2 className="text-xl font-medium text-ink">{t("author.lectureOutlineTitle")}</h2>
          <p className="mt-1 text-base font-light text-muted">
            {t("author.lectureOutlineLead")}
          </p>
        </div>

        <div className="space-y-5">
          {chapters.map((chapter, chapterIndex) => {
            const chapterExams =
              assessments.find((assessment) => assessment.chapterId === chapter.id)?.tests ?? [];

            return (
              <section
                className="border border-hairline bg-panel-warm/40"
                key={chapter.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void handleLectureDrop(event, chapter.id)}
              >
                <header className="flex items-start gap-4 border-b border-hairline bg-card p-4 sm:p-5">
                  <span className="label-mono pt-1 text-sm text-muted-faint">
                    {format.digits(String(chapterIndex + 1).padStart(2, "0"))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-ink">{chapter.title}</h3>
                    {chapter.description ? (
                      <p className="mt-1 text-sm font-light leading-relaxed text-muted">
                        {chapter.description}
                      </p>
                    ) : null}
                  </div>
                </header>

                <div className="space-y-2 p-3 sm:p-4">
                  {chapter.lectures.map((lecture, lectureIndex) => (
                    <LectureOutlineRow
                      count={chapter.lectures.length}
                      index={lectureIndex}
                      isDragging={draggedLecture?.lectureId === lecture.id}
                      isWorking={isWorking}
                      key={lecture.id}
                      lecture={lecture}
                      onDelete={() => setDeleteTarget({ id: lecture.id, kind: "lecture" })}
                      onDragEnd={() => setDraggedLecture(null)}
                      onDragStart={() =>
                        setDraggedLecture({ chapterId: chapter.id, lectureId: lecture.id })
                      }
                      onDrop={(event) =>
                        void handleLectureDrop(event, chapter.id, lecture.id)
                      }
                      onEdit={() => startEditLecture(chapter.id, lecture)}
                      onMove={(offset) =>
                        void handleMoveLecture(chapter.id, lecture.id, offset)
                      }
                    />
                  ))}
                  {chapterExams.map((exam) => (
                    <ExamOutlineRow
                      courseId={courseId}
                      exam={exam}
                      key={exam.id}
                      onDelete={() => setDeleteTarget({ id: exam.id, kind: "exam" })}
                    />
                  ))}

                  {chapter.lectures.length === 0 && chapterExams.length === 0 ? (
                    <div className="border border-dashed border-dot-idle bg-card px-5 py-8 text-center">
                      <p className="text-base font-medium text-ink">{t("author.lectureEmpty")}</p>
                      <p className="mt-1 text-sm font-light text-muted">
                        {t("author.lectureEmptyLead")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:justify-between">
        <Button asChild className="h-11" variant="outline">
          <Link
            params={{ id: courseId }}
            search={{ stage: "chapters" }}
            to="/dashboard/courses/$id/content"
          >
            <ArrowLeft className="size-4" />
            {t("action.back")}
          </Link>
        </Button>
        <Button asChild className="h-11">
          <Link params={{ id: courseId }} to="/dashboard/courses/$id/publish">
            {t("author.continueReview")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <ConfirmDialog
        cancelLabel={t("action.cancel")}
        confirmLabel={t("ab.delete")}
        dangerous
        description={
          deleteTarget?.kind === "exam"
            ? t("author.deleteExamConfirm")
            : t("author.deleteLectureConfirm")
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        open={deleteTarget !== null}
        pending={isWorking}
        title={
          deleteTarget?.kind === "exam"
            ? t("author.deleteExamTitle")
            : t("author.deleteLectureTitle")
        }
      />
    </div>
  );
}

function LectureComposer({
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
          <VideoLecturePreview url={draft.videoUrl} />
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
        <div className="border-t border-hairline pt-5 text-base font-light text-muted">
          {t("author.examLead")}
        </div>
      ) : null}

      {draft.type !== "EXAM" ? (
        <label className="flex min-h-11 items-center gap-3">
          <input
            checked={draft.isPreview}
            type="checkbox"
            onChange={(event) => onChange({ ...draft, isPreview: event.target.checked })}
          />
          <span className="text-sm text-ink">{t("cb.allowPreview")}</span>
        </label>
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
