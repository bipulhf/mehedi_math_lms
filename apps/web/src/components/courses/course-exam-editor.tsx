import { Eye, Plus, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssessmentQuestion } from "@/lib/api/tests";
import {
  createQuestion,
  deleteQuestion,
  getTestDetail,
  updateQuestion,
  updateTest
} from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { isEmptyHtml, stripHtml } from "@/lib/html";
import { queryKeys } from "@/lib/query/keys";

interface McqDraft {
  marks: number;
  options: { isCorrect: boolean; optionText: string }[];
  questionText: string;
}

interface ExamSettingsDraft {
  description: string;
  durationInMinutes: number | null;
  isPublished: boolean;
  lockAnswerOnSelect: boolean;
  maxAttempts: number | null;
  passingScore: number | null;
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
    !isEmptyHtml(draft.questionText) &&
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
  const [settings, setSettings] = useState<ExamSettingsDraft>({
    description: "",
    durationInMinutes: null,
    isPublished: false,
    lockAnswerOnSelect: false,
    maxAttempts: null,
    passingScore: null,
    title: ""
  });
  const [draft, setDraft] = useState<McqDraft>(createEmptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(new Set());
  const [isExamInfoOpen, setIsExamInfoOpen] = useState(false);
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (exam) {
      setSettings({
        description: exam.description ?? "",
        durationInMinutes: exam.durationInMinutes,
        isPublished: exam.isPublished,
        lockAnswerOnSelect: exam.lockAnswerOnSelect,
        maxAttempts: exam.maxAttempts,
        passingScore: exam.passingScore,
        title: exam.title
      });
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
        durationInMinutes: settings.durationInMinutes ?? undefined,
        isPublished: settings.isPublished,
        lockAnswerOnSelect: settings.lockAnswerOnSelect,
        // Not `?? undefined` — an explicit `null` means "uncap this test."
        maxAttempts: settings.maxAttempts,
        passingScore: settings.passingScore ?? undefined,
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

  const toggleQuestion = (questionId: string): void => {
    setExpandedQuestionIds((current) => {
      const next = new Set(current);

      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }

      return next;
    });
  };

  if (isPending || !exam) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <div className="space-y-8 bg-panel-warm/40 p-4 sm:p-6 lg:p-8">
      <section className="border border-hairline bg-card">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <button
            aria-expanded={isExamInfoOpen}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-4 text-left"
            onClick={() => setIsExamInfoOpen((current) => !current)}
            type="button"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-medium text-ink">{t("author.examQuestions")}</span>
              <span className="mt-1 block truncate text-sm font-light text-muted">
                {isExamInfoOpen ? t("author.examLead") : settings.title}
              </span>
            </span>
            <span aria-hidden="true" className="text-xl font-light text-accent">
              {isExamInfoOpen ? "-" : "+"}
            </span>
          </button>
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

        {isExamInfoOpen ? (
          <div className="space-y-6 border-t border-hairline p-5 sm:p-6">
            <div className="grid gap-5">
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
                <RichTextEditor
                  id={`exam-description-${examId}`}
                  value={settings.description}
                  onChange={(value) => setSettings((current) => ({ ...current, description: value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`exam-duration-${examId}`}>{t("ab.duration")}</Label>
                  <Input
                    id={`exam-duration-${examId}`}
                    min={1}
                    type="number"
                    value={settings.durationInMinutes ?? ""}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        durationInMinutes:
                          event.target.value === "" ? null : Number(event.target.value)
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exam-pass-score-${examId}`}>{t("ab.passScore")}</Label>
                  <Input
                    id={`exam-pass-score-${examId}`}
                    min={0}
                    type="number"
                    value={settings.passingScore ?? ""}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        passingScore: event.target.value === "" ? null : Number(event.target.value)
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exam-max-attempts-${examId}`}>{t("ab.maxAttempts")}</Label>
                  <Input
                    id={`exam-max-attempts-${examId}`}
                    min={1}
                    title={t("ab.maxAttemptsHint")}
                    type="number"
                    value={settings.maxAttempts ?? ""}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        maxAttempts: event.target.value === "" ? null : Number(event.target.value)
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 border border-hairline bg-panel-warm/40 p-4">
              <input
                checked={settings.isPublished}
                className="mt-1 size-4 accent-accent"
                type="checkbox"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    isPublished: event.target.checked
                  }))
                }
              />
              <span>
                <span className="block text-sm font-medium text-ink">{t("ab.publishNow")}</span>
                <span className="mt-1 block text-sm font-light leading-relaxed text-muted">
                  {t("ab.studentView")}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 border border-hairline bg-panel-warm/40 p-4">
              <input
                checked={settings.lockAnswerOnSelect}
                className="mt-1 size-4 accent-accent"
                type="checkbox"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    lockAnswerOnSelect: event.target.checked
                  }))
                }
              />
              <span>
                <span className="block text-sm font-medium text-ink">{t("ab.lockAnswerOnSelect")}</span>
                <span className="mt-1 block text-sm font-light leading-relaxed text-muted">
                  {t("ab.lockAnswerOnSelectHint")}
                </span>
              </span>
            </label>

            <div className="flex justify-end border-t border-hairline pt-4">
              <Button
                className="h-11 w-full sm:w-auto"
                disabled={isWorking}
                variant="outline"
                onClick={() => void handleSaveSettings()}
              >
                {t("author.saveExam")}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 border-b border-hairline pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-lg font-medium text-ink">{t("author.examQuestions")}</h4>
            <p className="mt-1 text-sm font-light text-muted">{t("author.examLead")}</p>
          </div>
          <span className="label-mono text-xs text-muted-faint">
            {format.number(exam.questions.length)} {t("ab.questions")}
          </span>
        </div>

        <ol className="space-y-3">
          {exam.questions.map((question, index) => (
            <li className="border border-hairline bg-card" key={question.id}>
              <div className="flex items-center gap-3 p-4 sm:p-5">
                <button
                  aria-expanded={expandedQuestionIds.has(question.id)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => toggleQuestion(question.id)}
                  type="button"
                >
                  <span className="label-mono shrink-0 text-sm text-muted-faint">
                    {format.digits(String(index + 1).padStart(2, "0"))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-faint">{t("author.mcqQuestion")}</span>
                    <span className="mt-1 block truncate font-medium text-ink">
                      {stripHtml(question.questionText)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-xl font-light text-accent">
                    {expandedQuestionIds.has(question.id) ? "-" : "+"}
                  </span>
                </button>
                <div className="flex items-center gap-1 self-end border-t border-hairline pt-3 sm:self-start sm:border-t-0 sm:pt-0">
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
              {expandedQuestionIds.has(question.id) ? (
                <div className="border-t border-hairline px-5 pb-5 pt-4 sm:pl-16">
                  <RichTextContent className="font-medium text-ink" html={question.questionText} />
                  <ul className="mt-3 grid gap-2 text-sm font-light text-muted sm:grid-cols-2">
                    {question.options.map((option) => (
                      <li
                        className={option.isCorrect ? "border-l-2 border-accent pl-2 text-ink" : undefined}
                        key={option.id}
                      >
                        {option.isCorrect ? "✓ " : ""}
                        {option.optionText}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <McqQuestionForm
        draft={draft}
        isEditing={editingQuestionId !== null}
        isOpen={isQuestionFormOpen}
        isWorking={isWorking}
        onCancel={() => {
          setDraft(createEmptyQuestion());
          setEditingQuestionId(null);
        }}
        onChange={setDraft}
        onToggle={() => setIsQuestionFormOpen((current) => !current)}
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
  isOpen,
  isWorking,
  onCancel,
  onChange,
  onToggle,
  onSave
}: {
  draft: McqDraft;
  isEditing: boolean;
  isOpen: boolean;
  isWorking: boolean;
  onCancel: () => void;
  onChange: (draft: McqDraft) => void;
  onToggle: () => void;
  onSave: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <div className="border border-hairline bg-card">
      <button
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center gap-4 p-5 text-left sm:p-6"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-medium text-ink">{t("author.mcqQuestion")}</span>
          <span className="mt-1 block text-sm font-light text-muted">
            {isEditing ? t("action.edit") : t("author.examLead")}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl font-light text-accent">
          {isOpen ? "-" : "+"}
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-5 border-t border-hairline p-5 sm:p-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("author.mcqQuestion")}</Label>
              <RichTextEditor
                placeholder={t("author.mcqQuestionPlaceholder")}
                value={draft.questionText}
                onChange={(value) => onChange({ ...draft, questionText: value })}
              />
            </div>
            <div className="max-w-xs space-y-2">
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
            <div>
              <p className="label-mono text-xs uppercase text-muted-faint">{t("author.mcqCorrect")}</p>
              <p className="mt-1 text-sm font-light text-muted">{t("ab.questionsLead")}</p>
            </div>
            {draft.options.map((option, index) => (
              <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]" key={index}>
                <label
                  className="flex min-h-11 items-center gap-2 border border-hairline bg-panel-warm px-3 text-sm text-ink"
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
                  <span>
                    {option.isCorrect
                      ? t("qe.correct")
                      : t("author.mcqOption", { number: String(index + 1) })}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    className="min-w-0 flex-1"
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
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      event.preventDefault();

                      if (draft.options.length >= 8) {
                        return;
                      }

                      onChange({
                        ...draft,
                        options: [...draft.options, { isCorrect: false, optionText: "" }]
                      });
                    }}
                  />
                  <Button
                    aria-label={t("author.removeOption")}
                    className="size-11 shrink-0 text-error"
                    disabled={draft.options.length <= 2}
                    size="icon"
                    title={t("author.removeOption")}
                    variant="ghost"
                    onClick={() => {
                      if (draft.options.length <= 2) {
                        return;
                      }

                      let remaining = draft.options.filter((_, optionIndex) => optionIndex !== index);

                      if (!remaining.some((current) => current.isCorrect)) {
                        remaining = remaining.map((current, optionIndex) =>
                          optionIndex === 0 ? { ...current, isCorrect: true } : current
                        );
                      }

                      onChange({ ...draft, options: remaining });
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <McqQuestionPreview draft={draft} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
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
      ) : null}
    </div>
  );
}

function McqQuestionPreview({ draft }: { draft: McqDraft }): JSX.Element {
  const t = useT();
  const hasQuestion = !isEmptyHtml(draft.questionText);

  return (
    <section className="space-y-4 border border-hairline bg-panel-warm/45 p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-hairline pb-4">
        <Eye className="mt-0.5 size-5 text-accent" />
        <div>
          <h4 className="text-lg font-medium text-ink">{t("editor.preview")}</h4>
          <p className="mt-1 text-sm font-light text-muted">{t("ab.questionsLead")}</p>
        </div>
      </div>

      <div className="space-y-4">
        {hasQuestion ? (
          <RichTextContent className="text-base font-medium leading-relaxed text-ink" html={draft.questionText} />
        ) : (
          <p className="text-base font-light italic text-muted-faint">{t("author.mcqQuestionPlaceholder")}</p>
        )}

        <div className="space-y-2">
          {draft.options.map((option, index) => (
            <div className="flex items-center gap-3 border border-hairline bg-card px-4 py-3" key={index}>
              <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-line-strong" />
              <span className={option.optionText.trim() ? "text-sm text-ink" : "text-sm italic text-muted-faint"}>
                {option.optionText.trim() || t("author.mcqOption", { number: String(index + 1) })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
