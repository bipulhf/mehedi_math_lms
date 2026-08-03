import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  GripVertical,
  ListChecks,
  Pencil,
  Trash2,
  Video
} from "lucide-react";
import type { DragEvent, JSX } from "react";

import { Button } from "@/components/ui/button";
import type { ContentLecture } from "@/lib/api/content";
import type { AssessmentTestSummary } from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export function isPdfLecture(lecture: ContentLecture): boolean {
  return (
    lecture.type === "TEXT" &&
    lecture.materials.some((material) => material.fileType === "application/pdf")
  );
}

export function LectureOutlineRow({
  count,
  index,
  isDragging,
  isWorking,
  lecture,
  onDelete,
  onDragEnd,
  onDragStart,
  onDrop,
  onEdit,
  onMove
}: {
  count: number;
  index: number;
  isDragging: boolean;
  isWorking: boolean;
  lecture: ContentLecture;
  onDelete: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onEdit: () => void;
  onMove: (offset: -1 | 1) => void;
}): JSX.Element {
  const t = useT();
  const isPdf = isPdfLecture(lecture);

  return (
    <div
      aria-grabbed={isDragging}
      className={`flex flex-col gap-3 border bg-card p-3 sm:flex-row sm:items-center sm:p-4 ${
        isDragging ? "border-accent" : "border-hairline"
      }`}
      draggable={!isWorking}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDrop={onDrop}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 cursor-grab items-center justify-center text-muted-faint"
          title={t("author.dragLecture")}
        >
          <GripVertical className="size-5" />
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center border border-hairline bg-panel-warm text-muted">
          {isPdf ? <FileText className="size-5" /> : <Video className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-ink">{lecture.title}</p>
          <p className="mt-1 break-words text-sm font-light text-muted">
            {isPdf ? t("author.pdf") : t("author.video")}
            {lecture.description ? ` · ${lecture.description}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 self-end sm:self-center">
        <Button
          aria-label={t("ab.moveUp")}
          className="size-11"
          disabled={isWorking || index === 0}
          size="icon"
          title={t("ab.moveUp")}
          variant="ghost"
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          aria-label={t("ab.moveDown")}
          className="size-11"
          disabled={isWorking || index === count - 1}
          size="icon"
          title={t("ab.moveDown")}
          variant="ghost"
          onClick={() => onMove(1)}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          aria-label={t("action.edit")}
          className="size-11"
          size="icon"
          title={t("action.edit")}
          variant="ghost"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          aria-label={t("ab.delete")}
          className="size-11 text-error"
          size="icon"
          title={t("ab.delete")}
          variant="ghost"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ExamOutlineRow({
  count,
  courseId,
  exam,
  index,
  isDragging,
  isWorking,
  onDelete,
  onDragEnd,
  onDragStart,
  onDrop,
  onMove
}: {
  count: number;
  courseId: string;
  exam: AssessmentTestSummary;
  index: number;
  isDragging: boolean;
  isWorking: boolean;
  onDelete: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onMove: (offset: -1 | 1) => void;
}): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <div
      aria-grabbed={isDragging}
      className={`flex flex-col gap-3 border bg-card p-3 sm:flex-row sm:items-center sm:p-4 ${
        isDragging ? "border-accent" : "border-hairline"
      }`}
      draggable={!isWorking}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDrop={onDrop}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 cursor-grab items-center justify-center text-muted-faint"
          title={t("author.dragLecture")}
        >
          <GripVertical className="size-5" />
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center border border-hairline bg-panel-warm text-muted">
          <ListChecks className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-ink">{exam.title}</p>
          <p className="mt-1 text-sm font-light text-muted">
            {t("author.exam")} · {format.number(exam.questionCount)} {t("ab.questions")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 self-end sm:self-center">
        <Button
          aria-label={t("ab.moveUp")}
          className="size-11"
          disabled={isWorking || index === 0}
          size="icon"
          title={t("ab.moveUp")}
          variant="ghost"
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          aria-label={t("ab.moveDown")}
          className="size-11"
          disabled={isWorking || index === count - 1}
          size="icon"
          title={t("ab.moveDown")}
          variant="ghost"
          onClick={() => onMove(1)}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button asChild className="h-11" variant="ghost">
          <Link
            params={{ id: courseId }}
            rel="noopener noreferrer"
            search={{ examId: exam.id }}
            target="_blank"
            to="/dashboard/courses/$id/exam"
          >
            {t("author.openExam")}
          </Link>
        </Button>
        <Button
          aria-label={t("ab.delete")}
          className="size-11 text-error"
          size="icon"
          title={t("ab.delete")}
          variant="ghost"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
