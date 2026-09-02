import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CreateTestPanel } from "@/components/tests/create-test-panel";
import { McqImportDialog } from "@/components/tests/mcq-import-dialog";
import {
  createQuestionPayload,
  initialQuestionDraft,
  type QuestionDraft
} from "@/components/tests/question-draft";
import { QuestionEditor } from "@/components/tests/question-editor";
import { MathText } from "@/components/ui/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import type { CourseDetail } from "@/lib/api/courses";
import type {
  AssessmentChapterSummary,
  AssessmentTestDetail,
  CreateTestInput,
  UpdateQuestionInput,
  UpdateTestInput
} from "@/lib/api/tests";
import {
  createQuestion,
  createTest,
  deleteQuestion,
  deleteTest,
  getTestDetail,
  reorderQuestions,
  updateQuestion,
  updateTest
} from "@/lib/api/tests";
import { isEmptyHtml } from "@/lib/html";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

const initialTestDraft: CreateTestInput = {
  description: "",
  durationInMinutes: 60,
  isPublished: false,
  lockAnswerOnSelect: false,
  maxAttempts: null,
  passingScore: 0,
  title: "",
  type: "MCQ"
};

interface AssessmentBuilderProps {
  assessments: readonly AssessmentChapterSummary[];
  course: CourseDetail;
  onRefresh: () => Promise<void>;
}


export function AssessmentBuilder({
  assessments,
  course,
  onRefresh
}: AssessmentBuilderProps): JSX.Element {
  const t = useT();

  const [selectedTestId, setSelectedTestId] = useState<string | null>(
    assessments[0]?.tests[0]?.id ?? null
  );
  const [selectedTest, setSelectedTest] = useState<AssessmentTestDetail | null>(null);
  const { data: fetchedTest } = useQuery<AssessmentTestDetail>({
    enabled: Boolean(selectedTestId),
    queryFn: async () => getTestDetail(selectedTestId ?? ""),
    queryKey: queryKeys.tests.detail(selectedTestId ?? "")
  });

  // Every question edit mutates this object in place before the round trip, so
  // the fetched detail seeds local state rather than being rendered directly.
  useEffect(() => {
    setSelectedTest(selectedTestId ? (fetchedTest ?? null) : null);
  }, [fetchedTest, selectedTestId]);
  const [testDrafts, setTestDrafts] = useState<Record<string, CreateTestInput>>({});
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(initialQuestionDraft);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionEditDrafts, setQuestionEditDrafts] = useState<Record<string, QuestionDraft>>({});
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "test"; testId: string }
    | { kind: "question"; questionId: string }
    | null
  >(null);

  const selectedTestSummary = useMemo(
    () =>
      assessments.flatMap((chapter) => chapter.tests).find((test) => test.id === selectedTestId) ??
      null,
    [assessments, selectedTestId]
  );

  const totalTests = useMemo(
    () => assessments.reduce((total, chapter) => total + chapter.tests.length, 0),
    [assessments]
  );


  const handleCreateTest = async (chapterId: string): Promise<void> => {
    const draft = testDrafts[chapterId] ?? initialTestDraft;

    if (!draft.title.trim()) {
      toast.error(t("ab.needTitle"));
      return;
    }

    setIsWorking(true);

    try {
      const createdTest = await createTest(chapterId, draft);
      setTestDrafts((currentValues) => ({
        ...currentValues,
        [chapterId]: initialTestDraft
      }));
      await onRefresh();
      setSelectedTestId(createdTest.id);
      toast.success(t("ab.created"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdateSelectedTest = async (): Promise<void> => {
    if (!selectedTest) {
      return;
    }

    setIsWorking(true);

    try {
      const payload: UpdateTestInput = {
        description: selectedTest.description ?? "",
        durationInMinutes: selectedTest.durationInMinutes ?? undefined,
        isPublished: selectedTest.isPublished,
        lockAnswerOnSelect: selectedTest.lockAnswerOnSelect,
        // Not `?? undefined` — an explicit `null` here means "uncap this test,"
        // and coalescing would erase that.
        maxAttempts: selectedTest.maxAttempts,
        passingScore: selectedTest.passingScore ?? undefined,
        title: selectedTest.title,
        type: selectedTest.type
      };
      await updateTest(selectedTest.id, payload);
      await onRefresh();
      const refreshed = await getTestDetail(selectedTest.id);
      setSelectedTest(refreshed);
      toast.success(t("ab.updated"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteSelectedTest = async (): Promise<void> => {
    if (!selectedTest) {
      return;
    }

    setDeleteTarget({ kind: "test", testId: selectedTest.id });
  };

  const executeDeleteTest = async (): Promise<void> => {
    if (!deleteTarget || deleteTarget.kind !== "test") {
      return;
    }

    setIsWorking(true);

    try {
      await deleteTest(deleteTarget.testId);
      setSelectedTest(null);
      setSelectedTestId(null);
      setDeleteTarget(null);
      await onRefresh();
      toast.success(t("ab.deleted"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateQuestion = async (): Promise<void> => {
    if (!selectedTest) {
      return;
    }

    if (isEmptyHtml(questionDraft.questionText)) {
      toast.error(t("ab.needPrompt"));
      return;
    }

    setIsWorking(true);

    try {
      await createQuestion(
        selectedTest.id,
        createQuestionPayload(questionDraft, selectedTest.type)
      );
      setQuestionDraft(initialQuestionDraft);
      const refreshed = await getTestDetail(selectedTest.id);
      setSelectedTest(refreshed);
      await onRefresh();
      toast.success(t("ab.qCreated"));
    } finally {
      setIsWorking(false);
    }
  };

  /**
   * Questions from the converter, created one at a time against the endpoint a
   * hand-written question already uses.
   *
   * Sequential rather than parallel: each create recomputes the test's total
   * marks server-side, and a failure part-way through has to name the question
   * it stopped at. The ones already created stay -- re-importing the rest is a
   * smaller job than working out what a rollback did.
   */
  const handleImportQuestions = async (drafts: readonly QuestionDraft[]): Promise<void> => {
    if (!selectedTest) {
      return;
    }

    setIsImportOpen(false);
    setIsWorking(true);

    let created = 0;

    try {
      for (const draft of drafts) {
        await createQuestion(selectedTest.id, createQuestionPayload(draft, selectedTest.type));
        created += 1;
      }

      toast.success(t("mcqImport.added", { count: String(created) }));
    } catch (error) {
      toast.error(
        t("mcqImport.failedAt", { number: String(created + 1) }) +
          (error instanceof Error ? ` — ${error.message}` : "")
      );
    } finally {
      const refreshed = await getTestDetail(selectedTest.id);

      setSelectedTest(refreshed);
      await onRefresh();
      setIsWorking(false);
    }
  };

  const handleSaveQuestion = async (questionId: string): Promise<void> => {
    const draft = questionEditDrafts[questionId];

    if (!draft) {
      return;
    }

    setIsWorking(true);

    try {
      const payload: UpdateQuestionInput = {
        imageUploadIds: draft.images.map((image) => image.uploadId),
        markingGuide: selectedTest?.type === "WRITTEN" ? draft.markingGuide : undefined,
        marks: draft.marks,
        options: selectedTest?.type === "MCQ" ? draft.options : undefined,
        questionText: draft.questionText
      };
      await updateQuestion(questionId, payload);
      const refreshed = await getTestDetail(selectedTestId!);
      setSelectedTest(refreshed);
      setEditingQuestionId(null);
      toast.success(t("ab.qUpdated"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string): Promise<void> => {
    setDeleteTarget({ kind: "question", questionId });
  };

  const executeDeleteQuestion = async (): Promise<void> => {
    if (!deleteTarget || deleteTarget.kind !== "question") {
      return;
    }

    setIsWorking(true);

    try {
      await deleteQuestion(deleteTarget.questionId);
      const refreshed = await getTestDetail(selectedTestId!);
      setSelectedTest(refreshed);
      setDeleteTarget(null);
      toast.success(t("ab.qDeleted"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleMoveQuestion = async (questionId: string, direction: -1 | 1): Promise<void> => {
    if (!selectedTest) {
      return;
    }

    const currentIndex = selectedTest.questions.findIndex((question) => question.id === questionId);
    const targetIndex = currentIndex + direction;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= selectedTest.questions.length) {
      return;
    }

    const reordered = [...selectedTest.questions];
    const [movedQuestion] = reordered.splice(currentIndex, 1);

    if (!movedQuestion) {
      return;
    }

    reordered.splice(targetIndex, 0, movedQuestion);
    setIsWorking(true);

    try {
      const refreshed = await reorderQuestions(selectedTest.id, {
        items: reordered.map((question, index) => ({
          id: question.id,
          sortOrder: index
        }))
      });
      setSelectedTest(refreshed);
      toast.success(t("ab.qReordered"));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="border-hairline/30 bg-card/85">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-body text-base font-bold text-ink">{t("ab.title")}</p>
            <p className="text-xs text-ink/65">{t("ab.lead")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone="quiet"
              className="rounded-full px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-widest"
            >
              {assessments.length} chapters
            </Badge>
            <Badge
              tone="quiet"
              className="rounded-full px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-widest"
            >
              {totalTests} tests
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          {assessments.map((chapter) => (
            <div
              key={chapter.chapterId}
             
            >
              <Card className="border-hairline/30">
                <CardHeader className="space-y-1 pb-3">
                  <CardTitle className="text-lg">{chapter.chapterTitle}</CardTitle>
                  <CardDescription>{t("ab.inChapter")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {chapter.tests.length === 0 ? (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-3 text-sm leading-6 text-ink/70">{t("ab.noTests")}</div>
                    ) : null}
                    {chapter.tests.map((test) => (
                      <button
                        key={test.id}
                        className={`w-full rounded-[calc(var(--radius)-0.125rem)] border p-3 text-left transition-all ${
                          selectedTestId === test.id
                            ? "border-accent bg-accent/10"
                            : "border-hairline bg-panel-warm hover:bg-panel-warm"
                        }`}
                        type="button"
                        onClick={() => setSelectedTestId(test.id)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{test.title}</p>
                            <p className="text-xs text-ink/62">
                              {test.type} · {test.questionCount} questions · {test.totalMarks} marks
                            </p>
                          </div>
                          <span className="rounded-full bg-chip-active px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-ink/62">
                            {test.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <CreateTestPanel
                    draft={testDrafts[chapter.chapterId] ?? initialTestDraft}
                    isWorking={isWorking}
                    onChange={(next) =>
                      setTestDrafts((currentValues) => ({
                        ...currentValues,
                        [chapter.chapterId]: next
                      }))
                    }
                    onCreate={() => void handleCreateTest(chapter.chapterId)}
                  />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {!selectedTest || !selectedTestSummary ? (
            <Card className="border-hairline/30">
              <CardContent className="p-5 text-sm leading-6 text-ink/70">{t("ab.pickTest")}</CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-hairline/30">
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{selectedTest.title}</CardTitle>
                    <CardDescription>
                      {course.title} · {selectedTest.totalMarks} total marks
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/dashboard/tests/$testId" params={{ testId: selectedTest.id }}>{t("ab.studentView")}</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/dashboard/tests/$testId/submissions"
                        params={{ testId: selectedTest.id }}
                      >{t("ab.submissions")}</Link>
                    </Button>
                    {selectedTest.type === "WRITTEN" ? (
                      <Button asChild size="sm">
                        <Link
                          params={{ testId: selectedTest.id }}
                          to="/dashboard/tests/$testId/marking"
                        >
                          {t("marking.openPaper")}
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isWorking}
                      onClick={() => void handleDeleteSelectedTest()}
                    >{t("ab.delete")}</Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/60">{t("ab.testTitle")}</Label>
                  <Input
                    className="h-10"
                    value={selectedTest.title}
                    onChange={(event) =>
                      setSelectedTest((currentValue) =>
                        currentValue
                          ? {
                              ...currentValue,
                              title: event.target.value
                            }
                          : currentValue
                      )
                    }
                  />
                  <div className="grid gap-2 md:grid-cols-4">
                    <Select
                      className="h-10"
                      onValueChange={(next) =>
                        setSelectedTest((currentValue) =>
                          currentValue
                            ? {
                                ...currentValue,
                                type: next as AssessmentTestDetail["type"]
                              }
                            : currentValue
                        )
                      }
                      options={[
                        { label: t("ab.mcq"), value: "MCQ" },
                        { label: t("ab.written"), value: "WRITTEN" }
                      ]}
                      value={selectedTest.type}
                    />
                    <Input
                      className="h-10"
                      min={1}
                      type="number"
                      value={selectedTest.durationInMinutes ?? ""}
                      onChange={(event) =>
                        setSelectedTest((currentValue) =>
                          currentValue
                            ? {
                                ...currentValue,
                                durationInMinutes: Number(event.target.value)
                              }
                            : currentValue
                        )
                      }
                    />
                    <Input
                      className="h-10"
                      min={0}
                      type="number"
                      value={selectedTest.passingScore ?? ""}
                      onChange={(event) =>
                        setSelectedTest((currentValue) =>
                          currentValue
                            ? {
                                ...currentValue,
                                passingScore: Number(event.target.value)
                              }
                            : currentValue
                        )
                      }
                    />
                    <div className="flex h-10 items-center rounded-[calc(var(--radius)-0.125rem)] border border-hairline px-3">
                      <Switch
                        disabled={isWorking}
                        label={t("ab.published")}
                        onChange={(checked) =>
                          setSelectedTest((currentValue) =>
                            currentValue ? { ...currentValue, isPublished: checked } : currentValue
                          )
                        }
                        value={selectedTest.isPublished}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      className="h-10"
                      min={1}
                      placeholder={t("ab.maxAttempts")}
                      title={t("ab.maxAttemptsHint")}
                      type="number"
                      value={selectedTest.maxAttempts ?? ""}
                      onChange={(event) =>
                        setSelectedTest((currentValue) =>
                          currentValue
                            ? {
                                ...currentValue,
                                maxAttempts:
                                  event.target.value === "" ? null : Number(event.target.value)
                              }
                            : currentValue
                        )
                      }
                    />
                    <div
                      className="flex h-10 items-center rounded-[calc(var(--radius)-0.125rem)] border border-hairline px-3"
                      title={t("ab.lockAnswerOnSelectHint")}
                    >
                      <Switch
                        disabled={isWorking}
                        label={t("ab.lockAnswerOnSelect")}
                        onChange={(checked) =>
                          setSelectedTest((currentValue) =>
                            currentValue
                              ? { ...currentValue, lockAnswerOnSelect: checked }
                              : currentValue
                          )
                        }
                        value={selectedTest.lockAnswerOnSelect}
                      />
                    </div>
                  </div>
                  <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/60">{t("common.description")}</Label>
                  <RichTextEditor
                    value={selectedTest.description ?? ""}
                    onChange={(value) =>
                      setSelectedTest((currentValue) =>
                        currentValue
                          ? {
                              ...currentValue,
                              description: value
                            }
                          : currentValue
                      )
                    }
                  />
                  <Button
                    type="button"
                    className="h-10"
                    disabled={isWorking}
                    onClick={() => void handleUpdateSelectedTest()}
                  >{t("ab.saveSettings")}</Button>
                </CardContent>
              </Card>

              <Card className="border-hairline/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t("ab.questions")}</CardTitle>
                  <CardDescription>{t("ab.questionsLead")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTest.questions.length === 0 ? (
                    <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-3 text-sm text-ink/70">{t("ab.noQuestions")}</div>
                  ) : null}

                  {selectedTest.questions.map((question, questionIndex) => (
                    <div
                      key={question.id}
                      className="rounded-[calc(var(--radius)-0.125rem)] border border-hairline bg-panel-warm p-3"
                    >
                      {editingQuestionId === question.id ? (
                        <QuestionEditor
                          draft={questionEditDrafts[question.id] ?? initialQuestionDraft}
                          isWorking={isWorking}
                          onCancel={() => setEditingQuestionId(null)}
                          onChange={(nextDraft) =>
                            setQuestionEditDrafts((currentValues) => ({
                              ...currentValues,
                              [question.id]: nextDraft
                            }))
                          }
                          onSave={() => void handleSaveQuestion(question.id)}
                          testType={selectedTest.type}
                        />
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2.5">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-ink">
                                <span>Q{questionIndex + 1}. </span>
                                <RichTextContent
                                  className="inline align-baseline font-semibold [&_p]:mb-0 [&_p]:inline"
                                  html={question.questionText}
                                />
                              </div>
                              <p className="text-xs text-ink/62">
                                {selectedTest.type === "WRITTEN" ? t("ab.written") : t("ab.mcq")} ·{" "}
                                {question.marks} marks
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => void handleMoveQuestion(question.id, -1)}
                              >{t("ab.moveUp")}</Button>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => void handleMoveQuestion(question.id, 1)}
                              >{t("ab.moveDown")}</Button>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingQuestionId(question.id);
                                  setQuestionEditDrafts((currentValues) => ({
                                    ...currentValues,
                                    [question.id]: {
                                      images: question.images.map((image) => ({
                                        fileUrl: image.fileUrl,
                                        uploadId: image.id
                                      })),
                                      markingGuide: question.markingGuide ?? "",
                                      marks: question.marks,
                                      options:
                                        question.options.length > 0
                                          ? question.options.map((option) => ({
                                              isCorrect: Boolean(option.isCorrect),
                                              optionText: option.optionText
                                            }))
                                          : initialQuestionDraft.options,
                                      questionText: question.questionText
                                    }
                                  }));
                                }}
                              >{t("action.edit")}</Button>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => void handleDeleteQuestion(question.id)}
                              >{t("ab.delete")}</Button>
                            </div>
                          </div>
                          {selectedTest.type === "MCQ" ? (
                            <div className="grid gap-2 md:grid-cols-2">
                              {question.options.map((option) => (
                                <div
                                  key={option.id}
                                  className={`rounded-[calc(var(--radius)-0.125rem)] px-3 py-2 text-xs ${
                                    option.isCorrect
                                      ? "bg-accent/12 text-ink"
                                      : "bg-panel-warm text-ink/70"
                                  }`}
                                >
                                  <MathText text={option.optionText} />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}

                  {selectedTest.type === "MCQ" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={isWorking}
                        onClick={() => setIsImportOpen(true)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t("mcqImport.open")}
                      </Button>
                    </div>
                  ) : null}

                  <div className="rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-hairline bg-panel-warm p-3">
                    <QuestionEditor
                      draft={questionDraft}
                      isWorking={isWorking}
                      onChange={setQuestionDraft}
                      onSave={() => void handleCreateQuestion()}
                      testType={selectedTest.type}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <McqImportDialog
        onClose={() => setIsImportOpen(false)}
        onImport={(drafts) => void handleImportQuestions(drafts)}
        open={isImportOpen}
      />

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        dangerous
        confirmLabel="Delete"
        description={
          deleteTarget?.kind === "test"
            ? "Delete this test and all of its submissions? This cannot be undone."
            : deleteTarget?.kind === "question"
              ? "Delete this question? This cannot be undone."
              : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() =>
          void (deleteTarget?.kind === "question" ? executeDeleteQuestion() : executeDeleteTest())
        }
        open={deleteTarget !== null}
        pending={isWorking}
        title={deleteTarget?.kind === "test" ? "Delete test" : "Delete question"}
      />
    </div>
  );
}
