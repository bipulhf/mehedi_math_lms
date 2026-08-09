import { richTextToPlainText } from "@mma/shared";
import { Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createEmptyMcqDraft,
  isValidMcqDraft,
  McqQuestionForm,
  type McqDraft
} from "@/components/courses/course-exam-mcq-form";
import {
  createEmptyWrittenDraft,
  isValidWrittenDraft,
  WrittenQuestionForm,
  type WrittenDraft
} from "@/components/courses/course-exam-written-form";
import { MathText } from "@/components/ui/math-text";
import { useAccessGuard } from "@/hooks/use-access-guard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

function mapQuestionToMcqDraft(question: AssessmentQuestion): McqDraft {
  return {
    marks: question.marks,
    options: question.options.map((option) => ({
      isCorrect: option.isCorrect === true,
      optionText: option.optionText
    })),
    questionText: question.questionText
  };
}

function mapQuestionToWrittenDraft(question: AssessmentQuestion): WrittenDraft {
  return {
    images: question.images.map((image) => ({ fileUrl: image.fileUrl, uploadId: image.id })),
    markingGuide: question.markingGuide ?? "",
    marks: question.marks,
    questionText: question.questionText
  };
}

export function CourseExamEditor({
  examId,
  onClose,
  onRefresh
}: CourseExamEditorProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const queryClient = useQueryClient();
  const { data: exam, error, isPending } = useQuery({
    queryFn: async () => getTestDetail(examId),
    queryKey: queryKeys.tests.detail(examId)
  });

  // An exam that is not this teacher's to open would otherwise leave the page
  // on its skeleton for ever.
  useAccessGuard([error]);
  const [settings, setSettings] = useState<ExamSettingsDraft>({
    description: "",
    durationInMinutes: null,
    isPublished: false,
    lockAnswerOnSelect: false,
    maxAttempts: null,
    passingScore: null,
    title: ""
  });
  // Both drafts exist so switching between exams of different kinds never
  // carries one kind's half-typed question into the other's form.
  const [mcqDraft, setMcqDraft] = useState<McqDraft>(createEmptyMcqDraft);
  const [writtenDraft, setWrittenDraft] = useState<WrittenDraft>(createEmptyWrittenDraft);
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
        title: settings.title
      });
      await refreshExam();
      toast.success(t("author.examReady"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveMcqQuestion = async (): Promise<void> => {
    if (!isValidMcqDraft(mcqDraft)) {
      toast.error(t("author.needExamQuestion"));
      return;
    }

    await saveQuestion({
      marks: mcqDraft.marks,
      options: mcqDraft.options,
      questionText: mcqDraft.questionText
    });
    setMcqDraft(createEmptyMcqDraft());
  };

  const handleSaveWrittenQuestion = async (): Promise<void> => {
    if (!isValidWrittenDraft(writtenDraft)) {
      toast.error(t("author.needWrittenQuestion"));
      return;
    }

    await saveQuestion({
      imageUploadIds: writtenDraft.images.map((image) => image.uploadId),
      markingGuide: writtenDraft.markingGuide,
      marks: writtenDraft.marks,
      questionText: writtenDraft.questionText
    });
    setWrittenDraft(createEmptyWrittenDraft());
  };

  const saveQuestion = async (payload: Parameters<typeof createQuestion>[1]): Promise<void> => {
    setIsWorking(true);
    try {
      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, payload);
      } else {
        await createQuestion(examId, payload);
      }
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

  const isWritten = exam.type === "WRITTEN";

  return (
    <div className="space-y-8 bg-panel-warm/40 p-4 sm:p-6 lg:p-8">
      {/* Where the papers land. A written exam is only half-built until someone
          has marked one, so the way through to marking is here rather than only
          on the tests dashboard. */}
      <div className="flex flex-wrap gap-2">
        <Button asChild className="h-11" variant="outline">
          <Link params={{ testId: examId }} to="/dashboard/tests/$testId/submissions">
            {t("author.examSubmissions")}
          </Link>
        </Button>
        {isWritten ? (
          <Button asChild className="h-11">
            <Link params={{ testId: examId }} to="/dashboard/tests/$testId/marking">
              {t("marking.openPaper")}
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="border border-hairline bg-card">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <button
            aria-expanded={isExamInfoOpen}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-4 text-left"
            onClick={() => setIsExamInfoOpen((current) => !current)}
            type="button"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-medium text-ink">
                {isWritten ? t("author.writtenQuestions") : t("author.examQuestions")}
              </span>
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

            <div className="border border-hairline bg-panel-warm/40 p-4">
              <Switch
                description={t("ab.studentView")}
                disabled={isWorking}
                label={t("ab.publishNow")}
                onChange={(checked) =>
                  setSettings((current) => ({ ...current, isPublished: checked }))
                }
                value={settings.isPublished}
              />
            </div>

            <div className="border border-hairline bg-panel-warm/40 p-4">
              <Switch
                description={t("ab.lockAnswerOnSelectHint")}
                disabled={isWorking}
                label={t("ab.lockAnswerOnSelect")}
                onChange={(checked) =>
                  setSettings((current) => ({ ...current, lockAnswerOnSelect: checked }))
                }
                value={settings.lockAnswerOnSelect}
              />
            </div>

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
                    <span className="block text-sm text-muted-faint">
                      {isWritten ? t("author.writtenQuestion") : t("author.mcqQuestion")} ·{" "}
                      {format.number(question.marks)}
                    </span>
                    <span className="mt-1 block truncate font-medium text-ink">
                      {richTextToPlainText(question.questionText)}
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
                      if (isWritten) {
                        setWrittenDraft(mapQuestionToWrittenDraft(question));
                      } else {
                        setMcqDraft(mapQuestionToMcqDraft(question));
                      }

                      setIsQuestionFormOpen(true);
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
                  {question.images.length > 0 ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {question.images.map((image) => (
                        <ResponsiveImage
                          alt=""
                          className="block w-full border border-hairline"
                          key={image.id}
                          sizes="(min-width: 640px) 14rem, 45vw"
                          src={image.fileUrl}
                        />
                      ))}
                    </div>
                  ) : null}
                  {isWritten ? (
                    question.markingGuide ? (
                      <div className="mt-3 border-l-2 border-accent pl-3">
                        <p className="label-mono text-xs uppercase text-muted-faint">
                          {t("qe.markingGuide")}
                        </p>
                        <RichTextContent
                          className="mt-1 text-sm font-light text-muted"
                          html={question.markingGuide}
                        />
                      </div>
                    ) : null
                  ) : (
                    <ul className="mt-3 grid gap-2 text-sm font-light text-muted sm:grid-cols-2">
                      {question.options.map((option) => (
                        <li
                          className={
                            option.isCorrect ? "border-l-2 border-accent pl-2 text-ink" : undefined
                          }
                          key={option.id}
                        >
                          {option.isCorrect ? "✓ " : ""}
                          <MathText text={option.optionText} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {isWritten ? (
        <WrittenQuestionForm
          draft={writtenDraft}
          isEditing={editingQuestionId !== null}
          isOpen={isQuestionFormOpen}
          isWorking={isWorking}
          onCancel={() => {
            setWrittenDraft(createEmptyWrittenDraft());
            setEditingQuestionId(null);
          }}
          onChange={setWrittenDraft}
          onToggle={() => setIsQuestionFormOpen((current) => !current)}
          onSave={() => void handleSaveWrittenQuestion()}
        />
      ) : (
        <McqQuestionForm
          draft={mcqDraft}
          isEditing={editingQuestionId !== null}
          isOpen={isQuestionFormOpen}
          isWorking={isWorking}
          onCancel={() => {
            setMcqDraft(createEmptyMcqDraft());
            setEditingQuestionId(null);
          }}
          onChange={setMcqDraft}
          onToggle={() => setIsQuestionFormOpen((current) => !current)}
          onSave={() => void handleSaveMcqQuestion()}
        />
      )}

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
