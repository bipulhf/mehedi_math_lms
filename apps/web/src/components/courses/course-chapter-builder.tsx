import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import type { DragEvent, JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { ContentChapter, CreateChapterInput } from "@/lib/api/content";
import { createChapter, deleteChapter, reorderChapters, updateChapter } from "@/lib/api/content";
import { useFormat, useT } from "@/lib/i18n/locale-context";

interface CourseChapterBuilderProps {
  chapters: readonly ContentChapter[];
  courseId: string;
  onRefresh: () => Promise<void>;
}

const emptyChapter: CreateChapterInput = {
  description: "",
  title: ""
};

export function CourseChapterBuilder({
  chapters,
  courseId,
  onRefresh
}: CourseChapterBuilderProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [draft, setDraft] = useState<CreateChapterInput>(emptyChapter);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CreateChapterInput>(emptyChapter);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const handleCreate = async (): Promise<void> => {
    if (!draft.title.trim()) {
      toast.error(t("cbx.needChapterTitle"));
      return;
    }

    setIsWorking(true);
    try {
      await createChapter(courseId, draft);
      setDraft(emptyChapter);
      await onRefresh();
      toast.success(t("author.chapterAdded"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!editingId || !editDraft.title.trim()) {
      toast.error(t("cbx.needChapterTitle"));
      return;
    }

    setIsWorking(true);
    try {
      await updateChapter(editingId, editDraft);
      setEditingId(null);
      await onRefresh();
      toast.success(t("author.chapterSaved"));
    } finally {
      setIsWorking(false);
    }
  };

  const saveChapterOrder = async (reordered: readonly ContentChapter[]): Promise<void> => {
    setIsWorking(true);
    try {
      await reorderChapters(courseId, {
        items: reordered.map((item, index) => ({ id: item.id, sortOrder: index }))
      });
      await onRefresh();
      toast.success(t("cbx.chapterReordered"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleMove = async (chapterId: string, offset: -1 | 1): Promise<void> => {
    const currentIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
    const nextIndex = currentIndex + offset;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= chapters.length) {
      return;
    }

    const reordered = [...chapters];
    const [chapter] = reordered.splice(currentIndex, 1);

    if (!chapter) {
      return;
    }

    reordered.splice(nextIndex, 0, chapter);
    await saveChapterOrder(reordered);
  };

  const handleDrop = async (
    event: DragEvent<HTMLLIElement>,
    targetChapterId: string
  ): Promise<void> => {
    event.preventDefault();

    if (!draggedChapterId || draggedChapterId === targetChapterId || isWorking) {
      setDraggedChapterId(null);
      return;
    }

    const reordered = [...chapters];
    const currentIndex = reordered.findIndex((chapter) => chapter.id === draggedChapterId);
    const targetIndex = reordered.findIndex((chapter) => chapter.id === targetChapterId);
    const [movedChapter] = reordered.splice(currentIndex, 1);

    if (!movedChapter || currentIndex < 0 || targetIndex < 0) {
      setDraggedChapterId(null);
      return;
    }

    reordered.splice(targetIndex, 0, movedChapter);
    setDraggedChapterId(null);
    await saveChapterOrder(reordered);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteId) {
      return;
    }

    setIsWorking(true);
    try {
      await deleteChapter(deleteId);
      setDeleteId(null);
      await onRefresh();
      toast.success(t("cbx.chapterDeleted"));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="border border-hairline bg-card p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="chapter-name">
              {t("author.chapterName")} <span className="text-error">*</span>
            </Label>
            <Input
              id="chapter-name"
              placeholder={t("author.chapterNamePlaceholder")}
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chapter-description">{t("author.chapterDescription")}</Label>
            <RichTextEditor
              id="chapter-description"
              placeholder={t("author.chapterDescriptionPlaceholder")}
              value={draft.description ?? ""}
              onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
            />
          </div>
          <Button
            className="h-11 w-full lg:w-auto"
            disabled={isWorking || !draft.title.trim()}
            onClick={() => void handleCreate()}
          >
            <Plus className="size-4" />
            {t("cb.createChapter")}
          </Button>
        </div>
      </section>

      {chapters.length === 0 ? (
        <div className="border border-dashed border-dot-idle bg-card px-6 py-12 text-center">
          <p className="text-lg font-medium text-ink">{t("author.chapterEmpty")}</p>
          <p className="mt-2 text-base font-light text-muted">{t("author.chapterEmptyLead")}</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {chapters.map((chapter, index) => {
            const isEditing = editingId === chapter.id;

            return (
              <li
                aria-grabbed={draggedChapterId === chapter.id}
                className={`border bg-card ${
                  draggedChapterId === chapter.id ? "border-accent" : "border-hairline"
                }`}
                draggable={!isEditing && !isWorking}
                key={chapter.id}
                onDragEnd={() => setDraggedChapterId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedChapterId(chapter.id);
                }}
                onDrop={(event) => void handleDrop(event, chapter.id)}
              >
                {isEditing ? (
                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("author.chapterName")}</Label>
                        <Input
                          value={editDraft.title}
                          onChange={(event) =>
                            setEditDraft((current) => ({ ...current, title: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("author.chapterDescription")}</Label>
                        <RichTextEditor
                          value={editDraft.description ?? ""}
                          onChange={(value) =>
                            setEditDraft((current) => ({
                              ...current,
                              description: value
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                      <Button className="h-11" variant="outline" onClick={() => setEditingId(null)}>
                        {t("action.cancel")}
                      </Button>
                      <Button
                        className="h-11"
                        disabled={isWorking}
                        onClick={() => void handleSave()}
                      >
                        {t("action.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 cursor-grab items-center justify-center text-muted-faint"
                      title={t("author.dragChapter")}
                    >
                      <GripVertical className="size-5" />
                    </span>
                    <span className="label-mono text-sm text-muted-faint">
                      {format.digits(String(index + 1).padStart(2, "0"))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-medium text-ink">{chapter.title}</h3>
                      {chapter.description ? (
                        <RichTextContent
                          className="mt-1 text-base font-light leading-relaxed text-muted"
                          html={chapter.description}
                        />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 self-end sm:self-center">
                      <Button
                        aria-label={t("ab.moveUp")}
                        className="size-11"
                        disabled={isWorking || index === 0}
                        size="icon"
                        title={t("ab.moveUp")}
                        variant="ghost"
                        onClick={() => void handleMove(chapter.id, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        aria-label={t("ab.moveDown")}
                        className="size-11"
                        disabled={isWorking || index === chapters.length - 1}
                        size="icon"
                        title={t("ab.moveDown")}
                        variant="ghost"
                        onClick={() => void handleMove(chapter.id, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        aria-label={t("action.edit")}
                        className="size-11"
                        size="icon"
                        title={t("action.edit")}
                        variant="ghost"
                        onClick={() => {
                          setEditingId(chapter.id);
                          setEditDraft({
                            description: chapter.description ?? "",
                            title: chapter.title
                          });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        aria-label={t("ab.delete")}
                        className="size-11 text-error"
                        size="icon"
                        title={t("ab.delete")}
                        variant="ghost"
                        onClick={() => setDeleteId(chapter.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:justify-between">
        <Button asChild className="h-11" variant="outline">
          <Link params={{ id: courseId }} to="/dashboard/courses/$id/edit">
            <ArrowLeft className="size-4" />
            {t("action.back")}
          </Link>
        </Button>
        <Button asChild className="h-11">
          <Link
            params={{ id: courseId }}
            search={{ stage: "lectures" }}
            to="/dashboard/courses/$id/content"
          >
            {t("author.continueLectures")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <ConfirmDialog
        cancelLabel={t("action.cancel")}
        confirmLabel={t("ab.delete")}
        dangerous
        description={t("author.deleteChapterConfirm")}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
        open={deleteId !== null}
        pending={isWorking}
        title={t("author.deleteChapterTitle")}
      />
    </div>
  );
}
