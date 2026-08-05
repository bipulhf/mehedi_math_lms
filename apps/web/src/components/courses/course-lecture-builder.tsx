import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DragEvent, JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ExamOutlineRow,
  isPdfLecture,
  LectureOutlineRow
} from "@/components/courses/course-lecture-outline-item";
import {
  LectureComposer,
  type LectureDraft
} from "@/components/courses/course-lecture-composer";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { ContentChapter, ContentLecture } from "@/lib/api/content";
import {
  createLecture,
  createLectureMaterial,
  deleteLecture,
  deleteLectureMaterial,
  setLectureVideoChapters,
  updateLecture
} from "@/lib/api/content";
import type { AssessmentChapterSummary, AssessmentTestSummary } from "@/lib/api/tests";
import { createTest, deleteTest, reorderCourseItems, updateTest } from "@/lib/api/tests";
import { uploadCourseMaterial } from "@/lib/api/uploads";
import { useFormat, useT } from "@/lib/i18n/locale-context";

interface CourseLectureBuilderProps {
  assessments: readonly AssessmentChapterSummary[];
  chapters: readonly ContentChapter[];
  courseId: string;
  onRefresh: () => Promise<void>;
}

type DeleteTarget = { id: string; kind: "exam" } | { id: string; kind: "lecture" };

interface DraggedCourseItem {
  chapterId: string;
  id: string;
  kind: "EXAM" | "LECTURE";
}

type CourseOutlineItem =
  | { exam: AssessmentTestSummary; id: string; kind: "EXAM"; sortOrder: number }
  | { id: string; kind: "LECTURE"; lecture: ContentLecture; sortOrder: number };

function createEmptyDraft(): LectureDraft {
  return {
    chapters: [],
    description: "",
    examDurationInMinutes: null,
    examIsPublished: false,
    examLockAnswerOnSelect: false,
    examMaxAttempts: null,
    examPassingScore: null,
    examType: "MCQ",
    existingPdfUrl: "",
    isPreview: false,
    isPublished: false,
    pdfFile: null,
    title: "",
    type: "VIDEO",
    videoMode: "VIDEO_LINK",
    videoUrl: ""
  };
}

function getChapterItems(
  chapter: ContentChapter,
  assessments: readonly AssessmentChapterSummary[]
): CourseOutlineItem[] {
  const exams = assessments.find((assessment) => assessment.chapterId === chapter.id)?.tests ?? [];

  return [
    ...chapter.lectures.map((lecture) => ({
      id: lecture.id,
      kind: "LECTURE" as const,
      lecture,
      sortOrder: lecture.sortOrder
    })),
    ...exams.map((exam) => ({
      exam,
      id: exam.id,
      kind: "EXAM" as const,
      sortOrder: exam.sortOrder
    }))
  ].sort((first, second) => first.sortOrder - second.sortOrder);
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
  const [draggedItem, setDraggedItem] = useState<DraggedCourseItem | null>(null);
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

  const appendCourseItem = async (chapterId: string, item: CourseOutlineItem): Promise<void> => {
    await reorderCourseItems(chapterId, {
      items: chapters.flatMap((chapter) => {
        const chapterItems = getChapterItems(chapter, assessments);
        const orderedItems = chapter.id === chapterId ? [...chapterItems, item] : chapterItems;

        return orderedItems.map((courseItem, index) => ({
          chapterId: chapter.id,
          id: courseItem.id,
          kind: courseItem.kind,
          sortOrder: index
        }));
      })
    });
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

        let exam: AssessmentTestSummary;

        try {
          exam = await createTest(activeChapter.id, {
            description: draft.description,
            durationInMinutes: draft.examDurationInMinutes ?? undefined,
            isPublished: draft.examIsPublished,
            lockAnswerOnSelect: draft.examType === "MCQ" && draft.examLockAnswerOnSelect,
            // Blank means "let the API decide": unlimited for an MCQ paper, one
            // attempt for a written one, which is the ADR-0008 default.
            maxAttempts: draft.examMaxAttempts ?? undefined,
            passingScore: draft.examPassingScore ?? undefined,
            title: draft.title,
            type: draft.examType
          });
          await appendCourseItem(activeChapter.id, {
            exam,
            id: exam.id,
            kind: "EXAM",
            sortOrder: exam.sortOrder
          });
        } catch (error) {
          questionTab?.close();
          throw error;
        }
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
        isPublished: draft.isPublished,
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

      if (draft.type === "VIDEO" && draft.chapters.length > 0) {
        await setLectureVideoChapters(lecture.id, {
          chapters: draft.chapters.map(({ timeSeconds, title }) => ({ timeSeconds, title }))
        });
      }

      await appendCourseItem(activeChapter.id, {
        id: lecture.id,
        kind: "LECTURE",
        lecture,
        sortOrder: lecture.sortOrder
      });

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
        isPublished: draft.isPublished,
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
        await setLectureVideoChapters(editingLectureId, {
          chapters: draft.chapters.map(({ timeSeconds, title }) => ({ timeSeconds, title }))
        });
      }

      resetComposer();
      await onRefresh();
      toast.success(t("cbx.lessonUpdated"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleToggleLecturePublished = async (lecture: ContentLecture): Promise<void> => {
    setIsWorking(true);
    try {
      await updateLecture(lecture.id, { isPublished: !lecture.isPublished });
      await onRefresh();
      toast.success(lecture.isPublished ? t("author.itemUnpublished") : t("author.itemPublished"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleToggleExamPublished = async (exam: AssessmentTestSummary): Promise<void> => {
    setIsWorking(true);
    try {
      await updateTest(exam.id, { isPublished: !exam.isPublished });
      await onRefresh();
      toast.success(exam.isPublished ? t("author.itemUnpublished") : t("author.itemPublished"));
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
      chapters: lecture.chapters.map((chapter) => ({ ...chapter, key: crypto.randomUUID() })),
      description: lecture.description ?? "",
      // Editing only ever reaches lectures — an exam is edited on its own page —
      // so these are defaults rather than values read back off anything.
      examDurationInMinutes: null,
      examIsPublished: false,
      examLockAnswerOnSelect: false,
      examMaxAttempts: null,
      examPassingScore: null,
      examType: "MCQ",
      existingPdfUrl: pdfMaterial?.fileUrl ?? "",
      isPreview: lecture.isPreview,
      isPublished: lecture.isPublished,
      pdfFile: null,
      title: lecture.title,
      type: isPdf ? "PDF" : "VIDEO",
      videoMode: lecture.type === "VIDEO_UPLOAD" ? "VIDEO_UPLOAD" : "VIDEO_LINK",
      videoUrl: lecture.videoUrl ?? ""
    });
  };

  const saveCourseItemOrder = async (
    itemLists: ReadonlyMap<string, readonly CourseOutlineItem[]>,
    targetChapterId: string
  ): Promise<void> => {
    setIsWorking(true);
    try {
      await reorderCourseItems(targetChapterId, {
        items: chapters.flatMap((chapter) =>
          (itemLists.get(chapter.id) ?? []).map((item, index) => ({
            chapterId: chapter.id,
            id: item.id,
            kind: item.kind,
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

  const handleMoveItem = async (
    chapterId: string,
    itemId: string,
    offset: -1 | 1
  ): Promise<void> => {
    const chapter = chapters.find((item) => item.id === chapterId);
    const chapterItems = chapter ? getChapterItems(chapter, assessments) : [];
    const currentIndex = chapterItems.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + offset;

    if (!chapter || currentIndex < 0 || targetIndex < 0 || targetIndex >= chapterItems.length) {
      return;
    }

    const reordered = [...chapterItems];
    const [movedItem] = reordered.splice(currentIndex, 1);

    if (!movedItem) {
      return;
    }

    reordered.splice(targetIndex, 0, movedItem);
    const itemLists = new Map(
      chapters.map(
        (item) =>
          [item.id, item.id === chapterId ? reordered : getChapterItems(item, assessments)] as const
      )
    );
    await saveCourseItemOrder(itemLists, chapterId);
  };

  const handleItemDrop = async (
    event: DragEvent<HTMLElement>,
    targetChapterId: string,
    targetItemId?: string | undefined
  ): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedItem || draggedItem.id === targetItemId || isWorking) {
      setDraggedItem(null);
      return;
    }

    const itemLists = new Map<string, CourseOutlineItem[]>(
      chapters.map((chapter) => [chapter.id, getChapterItems(chapter, assessments)] as const)
    );
    const sourceItems = itemLists.get(draggedItem.chapterId);
    const targetItems = itemLists.get(targetChapterId);
    const sourceIndex = sourceItems?.findIndex((item) => item.id === draggedItem.id);

    if (!sourceItems || !targetItems || sourceIndex === undefined || sourceIndex < 0) {
      setDraggedItem(null);
      return;
    }

    const [movedItem] = sourceItems.splice(sourceIndex, 1);

    if (!movedItem) {
      setDraggedItem(null);
      return;
    }

    const targetIndex = targetItemId
      ? targetItems.findIndex((item) => item.id === targetItemId)
      : targetItems.length;
    targetItems.splice(targetIndex < 0 ? targetItems.length : targetIndex, 0, movedItem);
    setDraggedItem(null);
    await saveCourseItemOrder(itemLists, targetChapterId);
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
        isEditing={false}
        isWorking={isWorking}
        onCancel={resetComposer}
        onChange={setDraft}
        onSave={() => void handleCreate()}
      />

      {/* Editing opens in its own modal instead of reusing this same inline
          slot -- switching the "add new" composer into edit mode in place
          was confusing about which lecture was actually being changed. */}
      <Modal
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
        onClose={resetComposer}
        open={editingLectureId !== null}
        title={t("author.editLectureTitle")}
      >
        <LectureComposer
          draft={draft}
          isEditing
          isWorking={isWorking}
          onCancel={resetComposer}
          onChange={setDraft}
          onSave={() => void handleUpdate()}
        />
      </Modal>

      <section className="space-y-4 border-t border-hairline pt-6">
        <div>
          <h2 className="text-xl font-medium text-ink">{t("author.lectureOutlineTitle")}</h2>
          <p className="mt-1 text-base font-light text-muted">{t("author.lectureOutlineLead")}</p>
        </div>

        <div className="space-y-5">
          {chapters.map((chapter, chapterIndex) => {
            const chapterItems = getChapterItems(chapter, assessments);

            return (
              <section
                className="border border-hairline bg-panel-warm/40"
                key={chapter.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void handleItemDrop(event, chapter.id)}
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
                  {chapterItems.map((item, itemIndex) =>
                    item.kind === "LECTURE" ? (
                      <LectureOutlineRow
                        count={chapterItems.length}
                        index={itemIndex}
                        isDragging={draggedItem?.id === item.id}
                        isPublished={item.lecture.isPublished}
                        isWorking={isWorking}
                        key={item.id}
                        lecture={item.lecture}
                        onDelete={() => setDeleteTarget({ id: item.id, kind: "lecture" })}
                        onDragEnd={() => setDraggedItem(null)}
                        onDragStart={() =>
                          setDraggedItem({
                            chapterId: chapter.id,
                            id: item.id,
                            kind: item.kind
                          })
                        }
                        onDrop={(event) => void handleItemDrop(event, chapter.id, item.id)}
                        onEdit={() => startEditLecture(chapter.id, item.lecture)}
                        onMove={(offset) => void handleMoveItem(chapter.id, item.id, offset)}
                        onTogglePublished={() => void handleToggleLecturePublished(item.lecture)}
                      />
                    ) : (
                      <ExamOutlineRow
                        count={chapterItems.length}
                        courseId={courseId}
                        exam={item.exam}
                        index={itemIndex}
                        isDragging={draggedItem?.id === item.id}
                        isWorking={isWorking}
                        key={item.id}
                        onDelete={() => setDeleteTarget({ id: item.id, kind: "exam" })}
                        onDragEnd={() => setDraggedItem(null)}
                        onDragStart={() =>
                          setDraggedItem({
                            chapterId: chapter.id,
                            id: item.id,
                            kind: item.kind
                          })
                        }
                        onDrop={(event) => void handleItemDrop(event, chapter.id, item.id)}
                        onMove={(offset) => void handleMoveItem(chapter.id, item.id, offset)}
                        onTogglePublished={() => void handleToggleExamPublished(item.exam)}
                      />
                    )
                  )}

                  {chapterItems.length === 0 ? (
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
