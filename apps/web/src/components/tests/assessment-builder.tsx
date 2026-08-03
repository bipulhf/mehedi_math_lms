import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createQuestionPayload,
  initialQuestionDraft,
  type QuestionDraft
} from "@/components/tests/question-draft";
import { QuestionEditor } from "@/components/tests/question-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

const initialTestDraft: CreateTestInput = {
  description: "",
  durationInMinutes: 60,
  isPublished: false,
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
  const [isWorking, setIsWorking] = useState(false);

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
    if (!selectedTest || !window.confirm("Delete this test and all of its submissions?")) {
      return;
    }

    setIsWorking(true);

    try {
      await deleteTest(selectedTest.id);
      setSelectedTest(null);
      setSelectedTestId(null);
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

    if (!questionDraft.questionText.trim()) {
      toast.error(t("ab.needPrompt"));
      return;
    }

    setIsWorking(true);

    try {
      await createQuestion(selectedTest.id, createQuestionPayload(questionDraft));
      setQuestionDraft(initialQuestionDraft);
      const refreshed = await getTestDetail(selectedTest.id);
      setSelectedTest(refreshed);
      await onRefresh();
      toast.success(t("ab.qCreated"));
    } finally {
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
        expectedAnswer: draft.expectedAnswer,
        marks: draft.marks,
        options: draft.type === "MCQ" ? draft.options : undefined,
        questionText: draft.questionText,
        type: draft.type
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
    if (!window.confirm("Delete this question?")) {
      return;
    }

    setIsWorking(true);

    try {
      await deleteQuestion(questionId);
      const refreshed = await getTestDetail(selectedTestId!);
      setSelectedTest(refreshed);
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
      <Card className="border-outline-variant/30 bg-surface-container-lowest/85">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-body text-base font-bold text-on-surface">{t("ab.title")}</p>
            <p className="text-xs text-on-surface/65">{t("ab.lead")}</p>
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
              <Card className="border-outline-variant/30">
                <CardHeader className="space-y-1 pb-3">
                  <CardTitle className="text-lg">{chapter.chapterTitle}</CardTitle>
                  <CardDescription>{t("ab.inChapter")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {chapter.tests.length === 0 ? (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3 text-sm leading-6 text-on-surface/70">{t("ab.noTests")}</div>
                    ) : null}
                    {chapter.tests.map((test) => (
                      <button
                        key={test.id}
                        className={`w-full rounded-[calc(var(--radius)-0.125rem)] border p-3 text-left transition-all ${
                          selectedTestId === test.id
                            ? "border-secondary-container bg-secondary-container/10"
                            : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                        }`}
                        type="button"
                        onClick={() => setSelectedTestId(test.id)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-on-surface">{test.title}</p>
                            <p className="text-xs text-on-surface/62">
                              {test.type} · {test.questionCount} questions · {test.totalMarks} marks
                            </p>
                          </div>
                          <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-surface/62">
                            {test.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-outline-variant bg-surface-container-low p-3">
                    <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">{t("ab.newTitle")}</Label>
                    <Input
                      className="h-10"
                      placeholder="e.g. Chapter Quiz 1"
                      value={testDrafts[chapter.chapterId]?.title ?? ""}
                      onChange={(event) =>
                        setTestDrafts((currentValues) => ({
                          ...currentValues,
                          [chapter.chapterId]: {
                            ...(currentValues[chapter.chapterId] ?? initialTestDraft),
                            title: event.target.value
                          }
                        }))
                      }
                    />
                    <div className="grid gap-2 md:grid-cols-3">
                      <Select
                        className="h-10"
                        value={testDrafts[chapter.chapterId]?.type ?? initialTestDraft.type}
                        onChange={(event) =>
                          setTestDrafts((currentValues) => ({
                            ...currentValues,
                            [chapter.chapterId]: {
                              ...(currentValues[chapter.chapterId] ?? initialTestDraft),
                              type: event.target.value as CreateTestInput["type"]
                            }
                          }))
                        }
                      >
                        <option value="MCQ">{t("ab.mcq")}</option>
                        <option value="WRITTEN">{t("ab.written")}</option>
                        <option value="MIXED">{t("ab.mixed")}</option>
                      </Select>
                      <Input
                        className="h-10"
                        min={1}
                        placeholder={t("ab.duration")}
                        type="number"
                        value={
                          testDrafts[chapter.chapterId]?.durationInMinutes ??
                          initialTestDraft.durationInMinutes ??
                          ""
                        }
                        onChange={(event) =>
                          setTestDrafts((currentValues) => ({
                            ...currentValues,
                            [chapter.chapterId]: {
                              ...(currentValues[chapter.chapterId] ?? initialTestDraft),
                              durationInMinutes: Number(event.target.value)
                            }
                          }))
                        }
                      />
                      <Input
                        className="h-10"
                        min={0}
                        placeholder={t("ab.passScore")}
                        type="number"
                        value={
                          testDrafts[chapter.chapterId]?.passingScore ??
                          initialTestDraft.passingScore ??
                          ""
                        }
                        onChange={(event) =>
                          setTestDrafts((currentValues) => ({
                            ...currentValues,
                            [chapter.chapterId]: {
                              ...(currentValues[chapter.chapterId] ?? initialTestDraft),
                              passingScore: Number(event.target.value)
                            }
                          }))
                        }
                      />
                    </div>
                    <Textarea
                      className="min-h-20"
                      placeholder={t("ab.instruction")}
                      value={testDrafts[chapter.chapterId]?.description ?? ""}
                      onChange={(event) =>
                        setTestDrafts((currentValues) => ({
                          ...currentValues,
                          [chapter.chapterId]: {
                            ...(currentValues[chapter.chapterId] ?? initialTestDraft),
                            description: event.target.value
                          }
                        }))
                      }
                    />
                    <label className="flex items-center gap-2 text-xs text-on-surface/75">
                      <input
                        checked={testDrafts[chapter.chapterId]?.isPublished ?? false}
                        className="h-4 w-4 accent-(--secondary-container)"
                        type="checkbox"
                        onChange={(event) =>
                          setTestDrafts((currentValues) => ({
                            ...currentValues,
                            [chapter.chapterId]: {
                              ...(currentValues[chapter.chapterId] ?? initialTestDraft),
                              isPublished: event.target.checked
                            }
                          }))
                        }
                      />
                      <span>{t("ab.publishNow")}</span>
                    </label>
                    <Button
                      type="button"
                      className="h-10"
                      disabled={isWorking}
                      onClick={() => void handleCreateTest(chapter.chapterId)}
                    >{t("ab.createTest")}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {!selectedTest || !selectedTestSummary ? (
            <Card className="border-outline-variant/30">
              <CardContent className="p-5 text-sm leading-6 text-on-surface/70">{t("ab.pickTest")}</CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-outline-variant/30">
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
                  <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">{t("ab.testTitle")}</Label>
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
                      value={selectedTest.type}
                      onChange={(event) =>
                        setSelectedTest((currentValue) =>
                          currentValue
                            ? {
                                ...currentValue,
                                type: event.target.value as AssessmentTestDetail["type"]
                              }
                            : currentValue
                        )
                      }
                    >
                      <option value="MCQ">{t("ab.mcq")}</option>
                      <option value="WRITTEN">{t("ab.written")}</option>
                      <option value="MIXED">{t("ab.mixed")}</option>
                    </Select>
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
                    <label className="flex h-10 items-center gap-2 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant px-3 text-xs text-on-surface">
                      <input
                        checked={selectedTest.isPublished}
                        className="h-4 w-4 accent-(--secondary-container)"
                        type="checkbox"
                        onChange={(event) =>
                          setSelectedTest((currentValue) =>
                            currentValue
                              ? {
                                  ...currentValue,
                                  isPublished: event.target.checked
                                }
                              : currentValue
                          )
                        }
                      />{t("ab.published")}</label>
                  </div>
                  <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">{t("common.description")}</Label>
                  <Textarea
                    className="min-h-20"
                    value={selectedTest.description ?? ""}
                    onChange={(event) =>
                      setSelectedTest((currentValue) =>
                        currentValue
                          ? {
                              ...currentValue,
                              description: event.target.value
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

              <Card className="border-outline-variant/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t("ab.questions")}</CardTitle>
                  <CardDescription>{t("ab.questionsLead")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTest.questions.length === 0 ? (
                    <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3 text-sm text-on-surface/70">{t("ab.noQuestions")}</div>
                  ) : null}

                  {selectedTest.questions.map((question, questionIndex) => (
                    <div
                      key={question.id}
                      className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-3"
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
                        />
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2.5">
                            <div>
                              <p className="font-semibold text-on-surface">
                                Q{questionIndex + 1}. {question.questionText}
                              </p>
                              <p className="text-xs text-on-surface/62">
                                {question.type} · {question.marks} marks
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
                                      expectedAnswer: question.expectedAnswer ?? "",
                                      marks: question.marks,
                                      options:
                                        question.type === "MCQ"
                                          ? question.options.map((option) => ({
                                              isCorrect: Boolean(option.isCorrect),
                                              optionText: option.optionText
                                            }))
                                          : initialQuestionDraft.options,
                                      questionText: question.questionText,
                                      type: question.type
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
                          {question.type === "MCQ" ? (
                            <div className="grid gap-2 md:grid-cols-2">
                              {question.options.map((option) => (
                                <div
                                  key={option.id}
                                  className={`rounded-[calc(var(--radius)-0.125rem)] px-3 py-2 text-xs ${
                                    option.isCorrect
                                      ? "bg-secondary-container/12 text-on-surface"
                                      : "bg-surface-container text-on-surface/70"
                                  }`}
                                >
                                  {option.optionText}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-outline-variant bg-surface-container-low p-3">
                    <QuestionEditor
                      draft={questionDraft}
                      isWorking={isWorking}
                      onChange={setQuestionDraft}
                      onSave={() => void handleCreateQuestion()}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
