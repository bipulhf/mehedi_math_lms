import { Plus, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentQuestion } from "@/lib/api/tests";
import {
  createQuestion,
  deleteQuestion,
  getTestDetail,
  updateQuestion,
  updateTest
} from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

interface McqDraft {
  marks: number;
  options: { isCorrect: boolean; optionText: string }[];
  questionText: string;
}

interface ExamSettingsDraft {
  description: string;
  title: string;
}

interface CourseExamEditorProps {
  examId: string;
  onClose?: (() => void) | undefined;
  onRefresh?: (() => Promise<void>) | undefined;
}

function createEmptyQuestion(): McqDraft {
  return {
    marks: 1,
    options: [
      { isCorrect: true, optionText: "" },
      { isCorrect: false, optionText: "" }
    ],
    questionText: ""
  };
}

function mapQuestionToDraft(question: AssessmentQuestion): McqDraft {
  return {
    marks: question.marks,
    options: question.options.map((option) => ({
      isCorrect: option.isCorrect === true,
      optionText: option.optionText
    })),
    questionText: question.questionText
  };
}

function isValidQuestion(draft: McqDraft): boolean {
  return (
    draft.questionText.trim().length > 0 &&
    draft.options.length >= 2 &&
    draft.options.every((option) => option.optionText.trim().length > 0) &&
    draft.options.some((option) => option.isCorrect)
  );
}

export function CourseExamEditor({
  examId,
  onClose,
  onRefresh
}: CourseExamEditorProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();
  const { data: exam, isPending } = useQuery({
    queryFn: async () => getTestDetail(examId),
    queryKey: queryKeys.tests.detail(examId)
  });
  const [settings, setSettings] = useState<ExamSettingsDraft>({ description: "", title: "" });
  const [draft, setDraft] = useState<McqDraft>(createEmptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (exam) {
      setSettings({ description: exam.description ?? "", title: exam.title });
    }
  }, [exam]);

  const refreshExam = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.tests.detail(examId) });
    await onRefresh?.();
  };

  const handleSaveSettings = async (): Promise<void> => {
    if (!settings.title.trim()) {
      toast.error(t("ab.needTitle"));
      return;
    }

    setIsWorking(true);
    try {
      await updateTest(examId, {
        description: settings.description,
        title: settings.title,
        type: "MCQ"
      });
      await refreshExam();
      toast.success(t("author.examReady"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveQuestion = async (): Promise<void> => {
    if (!isValidQuestion(draft)) {
      toast.error(t("author.needExamQuestion"));
      return;
    }

    const payload = {
      marks: draft.marks,
      options: draft.options,
      questionText: draft.questionText,
      type: "MCQ" as const
    };

    setIsWorking(true);
    try {
      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, payload);
      } else {
        await createQuestion(examId, payload);
      }
      setDraft(createEmptyQuestion());
      setEditingQuestionId(null);
      await refreshExam();
      toast.success(t("author.examQuestionAdded"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteQuestion = async (): Promise<void> => {
    if (!deleteQuestionId) {
      return;
    }

    setIsWorking(true);
    try {
      await deleteQuestion(deleteQuestionId);
      setDeleteQuestionId(null);
      await refreshExam();
      toast.success(t("author.examQuestionDeleted"));
    } finally {
      setIsWorking(false);
    }
  };

  if (isPending || !exam) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <div className="space-y-6 border-t border-hairline bg-panel-warm/50 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-medium text-ink">{t("author.examQuestions")}</h4>
          <p className="mt-1 text-base font-light text-muted">{t("author.examLead")}</p>
        </div>
        {onClose ? (
          <Button
            aria-label={t("common.close")}
            className="size-11"
            size="icon"
            title={t("common.close")}
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`exam-title-${examId}`}>{t("ab.testTitle")}</Label>
          <Input
            id={`exam-title-${examId}`}
            value={settings.title}
            onChange={(event) =>
              setSettings((current) => ({ ...current, title: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`exam-description-${examId}`}>{t("author.descriptionOptional")}</Label>
          <Input
            id={`exam-description-${examId}`}
            value={settings.description}
            onChange={(event) =>
              setSettings((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
      </div>
      <Button
        className="h-11"
        disabled={isWorking}
        variant="outline"
        onClick={() => void handleSaveSettings()}
      >
        {t("author.saveExam")}
      </Button>

      <ol className="space-y-2">
        {exam.questions.map((question, index) => (
          <li className="border border-hairline bg-card p-4" key={question.id}>
            <div className="flex items-start gap-3">
              <span className="label-mono text-sm text-muted-faint">
                {format.digits(String(index + 1).padStart(2, "0"))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{question.questionText}</p>
                <ul className="mt-2 grid gap-1 text-sm font-light text-muted sm:grid-cols-2">
                  {question.options.map((option) => (
                    <li className={option.isCorrect ? "text-ink" : undefined} key={option.id}>
                      {option.isCorrect ? "✓ " : ""}
                      {option.optionText}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  className="h-11"
                  variant="ghost"
                  onClick={() => {
                    setDraft(mapQuestionToDraft(question));
                    setEditingQuestionId(question.id);
                  }}
                >
                  {t("action.edit")}
                </Button>
                <Button
                  aria-label={t("ab.delete")}
                  className="size-11 text-error"
                  size="icon"
                  title={t("ab.delete")}
                  variant="ghost"
                  onClick={() => setDeleteQuestionId(question.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <McqQuestionForm
        draft={draft}
        isEditing={editingQuestionId !== null}
        isWorking={isWorking}
        onCancel={() => {
          setDraft(createEmptyQuestion());
          setEditingQuestionId(null);
        }}
        onChange={setDraft}
        onSave={() => void handleSaveQuestion()}
      />

      <ConfirmDialog
        cancelLabel={t("action.cancel")}
        confirmLabel={t("ab.delete")}
        dangerous
        description={t("author.deleteQuestionConfirm")}
        onCancel={() => setDeleteQuestionId(null)}
        onConfirm={() => void handleDeleteQuestion()}
        open={deleteQuestionId !== null}
        pending={isWorking}
        title={t("author.deleteQuestionTitle")}
      />
    </div>
  );
}

function McqQuestionForm({
  draft,
  isEditing,
  isWorking,
  onCancel,
  onChange,
  onSave
}: {
  draft: McqDraft;
  isEditing: boolean;
  isWorking: boolean;
  onCancel: () => void;
  onChange: (draft: McqDraft) => void;
  onSave: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <div className="space-y-4 border border-hairline bg-card p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
        <div className="space-y-2">
          <Label>{t("author.mcqQuestion")}</Label>
          <Textarea
            className="min-h-24"
            placeholder={t("author.mcqQuestionPlaceholder")}
            value={draft.questionText}
            onChange={(event) => onChange({ ...draft, questionText: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("qe.marks")}</Label>
          <Input
            min={1}
            type="number"
            value={draft.marks}
            onChange={(event) => onChange({ ...draft, marks: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-3">
        {draft.options.map((option, index) => (
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3" key={index}>
            <label
              className="flex min-h-11 items-center justify-center border border-hairline bg-panel-warm"
              title={t("author.mcqCorrect")}
            >
              <input
                aria-label={t("author.mcqCorrect")}
                checked={option.isCorrect}
                name="correct-answer"
                type="radio"
                onChange={() =>
                  onChange({
                    ...draft,
                    options: draft.options.map((current, optionIndex) => ({
                      ...current,
                      isCorrect: optionIndex === index
                    }))
                  })
                }
              />
            </label>
            <Input
              placeholder={t("author.mcqOption", { number: String(index + 1) })}
              value={option.optionText}
              onChange={(event) =>
                onChange({
                  ...draft,
                  options: draft.options.map((current, optionIndex) =>
                    optionIndex === index ? { ...current, optionText: event.target.value } : current
                  )
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11"
            disabled={draft.options.length >= 8}
            variant="outline"
            onClick={() =>
              onChange({
                ...draft,
                options: [...draft.options, { isCorrect: false, optionText: "" }]
              })
            }
          >
            <Plus className="size-4" />
            {t("qe.addOption")}
          </Button>
          {draft.options.length > 2 ? (
            <Button
              className="h-11"
              variant="ghost"
              onClick={() => onChange({ ...draft, options: draft.options.slice(0, -1) })}
            >
              {t("qe.removeLast")}
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <Button className="h-11" variant="ghost" onClick={onCancel}>
              {t("action.cancel")}
            </Button>
          ) : null}
          <Button className="h-11" disabled={isWorking} onClick={onSave}>
            {t("qe.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
