import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FadeIn } from "@/components/common/fade-in";
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
  CreateQuestionInput,
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

interface AssessmentBuilderProps {
  assessments: readonly AssessmentChapterSummary[];
  course: CourseDetail;
  onRefresh: () => Promise<void>;
}

interface QuestionDraft {
  expectedAnswer: string;
  marks: number;
  options: {
    isCorrect: boolean;
    optionText: string;
  }[];
  questionText: string;
  type: "MCQ" | "WRITTEN";
}

const initialTestDraft: CreateTestInput = {
  description: "",
  durationInMinutes: 60,
  isPublished: false,
  passingScore: 0,
  title: "",
  type: "MCQ"
};

const initialQuestionDraft: QuestionDraft = {
  expectedAnswer: "",
  marks: 1,
  options: [
    { isCorrect: true, optionText: "" },
    { isCorrect: false, optionText: "" }
  ],
  questionText: "",
  type: "MCQ"
};

function createQuestionPayload(draft: QuestionDraft): CreateQuestionInput {
  return {
    expectedAnswer: draft.expectedAnswer,
    marks: draft.marks,
    options:
      draft.type === "MCQ"
        ? draft.options.map((option) => ({
            isCorrect: option.isCorrect,
            optionText: option.optionText
          }))
        : undefined,
    questionText: draft.questionText,
    type: draft.type
  };
}

export function AssessmentBuilder({
  assessments,
  course,
  onRefresh
}: AssessmentBuilderProps): JSX.Element {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(
    assessments[0]?.tests[0]?.id ?? null
  );
  const [selectedTest, setSelectedTest] = useState<AssessmentTestDetail | null>(null);
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

  useEffect(() => {
    if (!selectedTestId) {
      setSelectedTest(null);
      return;
    }

    void (async () => {
      const detail = await getTestDetail(selectedTestId);
      setSelectedTest(detail);
    })();
  }, [selectedTestId]);

  const handleCreateTest = async (chapterId: string): Promise<void> => {
    const draft = testDrafts[chapterId] ?? initialTestDraft;

    if (!draft.title.trim()) {
      toast.error("Add a test title");
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
      toast.success("Test created");
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
      toast.success("Test updated");
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
      toast.success("Test deleted");
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateQuestion = async (): Promise<void> => {
    if (!selectedTest) {
      return;
    }

    if (!questionDraft.questionText.trim()) {
      toast.error("Add a question prompt");
      return;
    }

    setIsWorking(true);

    try {
      await createQuestion(selectedTest.id, createQuestionPayload(questionDraft));
      setQuestionDraft(initialQuestionDraft);
      const refreshed = await getTestDetail(selectedTest.id);
      setSelectedTest(refreshed);
      await onRefresh();
      toast.success("Question created");
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
      toast.success("Question updated");
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
      toast.success("Question deleted");
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
      toast.success("Question order updated");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="border-outline-variant/30 bg-surface-container-lowest/85 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-headline text-base font-bold text-on-surface">Assessment Builder</p>
            <p className="text-xs text-on-surface/65">
              Create tests chapter by chapter, then edit questions on the right.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone="gray"
              className="rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-widest"
            >
              {assessments.length} chapters
            </Badge>
            <Badge
              tone="gray"
              className="rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-widest"
            >
              {totalTests} tests
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          {assessments.map((chapter, chapterIndex) => (
            <FadeIn
              key={chapter.chapterId}
              delayClassName={chapterIndex > 0 ? "delay-75" : undefined}
            >
              <Card className="border-outline-variant/30 shadow-sm">
                <CardHeader className="space-y-1 pb-3">
                  <CardTitle className="text-lg">{chapter.chapterTitle}</CardTitle>
                  <CardDescription>Tests inside this chapter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {chapter.tests.length === 0 ? (
                      <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3 text-sm leading-6 text-on-surface/70">
                        No tests yet in this chapter.
                      </div>
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
                    <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">
                      New test title
                    </Label>
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
                        <option value="MCQ">MCQ</option>
                        <option value="WRITTEN">Written</option>
                        <option value="MIXED">Mixed</option>
                      </Select>
                      <Input
                        className="h-10"
                        min={1}
                        placeholder="Duration (min)"
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
                        placeholder="Pass score"
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
                      placeholder="Optional short instruction for students"
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
                      <span>Publish now</span>
                    </label>
                    <Button
                      type="button"
                      className="h-10"
                      disabled={isWorking}
                      onClick={() => void handleCreateTest(chapter.chapterId)}
                    >
                      Create test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>

        <div className="space-y-3">
          {!selectedTest || !selectedTestSummary ? (
            <Card className="border-outline-variant/30 shadow-sm">
              <CardContent className="p-5 text-sm leading-6 text-on-surface/70">
                Choose a test from the left to edit settings and manage questions.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-outline-variant/30 shadow-sm">
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{selectedTest.title}</CardTitle>
                    <CardDescription>
                      {course.title} · {selectedTest.totalMarks} total marks
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/dashboard/tests/$testId" params={{ testId: selectedTest.id }}>
                        Student view
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/dashboard/tests/$testId/submissions"
                        params={{ testId: selectedTest.id }}
                      >
                        Submissions
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isWorking}
                      onClick={() => void handleDeleteSelectedTest()}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">
                    Test title
                  </Label>
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
                      <option value="MCQ">MCQ</option>
                      <option value="WRITTEN">Written</option>
                      <option value="MIXED">Mixed</option>
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
                      />
                      Published
                    </label>
                  </div>
                  <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">
                    Description
                  </Label>
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
                  >
                    Save test settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-outline-variant/30 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Questions</CardTitle>
                  <CardDescription>
                    Add and order questions in the same flow students will see.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTest.questions.length === 0 ? (
                    <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3 text-sm text-on-surface/70">
                      No questions yet. Add your first question below.
                    </div>
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
                              >
                                Move up
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => void handleMoveQuestion(question.id, 1)}
                              >
                                Move down
                              </Button>
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
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => void handleDeleteQuestion(question.id)}
                              >
                                Delete
                              </Button>
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

interface QuestionEditorProps {
  draft: QuestionDraft;
  isWorking: boolean;
  onCancel?: (() => void) | undefined;
  onChange: (draft: QuestionDraft) => void;
  onSave: () => void;
}

function QuestionEditor({
  draft,
  isWorking,
  onCancel,
  onChange,
  onSave
}: QuestionEditorProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[0.75fr_0.25fr]">
        <div className="space-y-1">
          <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">
            Question type
          </Label>
          <Select
            className="h-10"
            value={draft.type}
            onChange={(event) =>
              onChange({
                ...draft,
                type: event.target.value as QuestionDraft["type"]
              })
            }
          >
            <option value="MCQ">MCQ</option>
            <option value="WRITTEN">Written</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">
            Marks
          </Label>
          <Input
            className="h-10"
            min={1}
            type="number"
            value={draft.marks}
            onChange={(event) =>
              onChange({
                ...draft,
                marks: Number(event.target.value)
              })
            }
          />
        </div>
      </div>
      <Textarea
        className="min-h-20"
        placeholder="Question prompt"
        value={draft.questionText}
        onChange={(event) =>
          onChange({
            ...draft,
            questionText: event.target.value
          })
        }
      />
      {draft.type === "MCQ" ? (
        <div className="space-y-2.5">
          {draft.options.map((option, index) => (
            <div
              key={`${index}-${option.optionText}`}
              className="grid gap-2 md:grid-cols-[auto_1fr]"
            >
              <label className="flex items-center gap-2 text-xs text-on-surface">
                <input
                  checked={option.isCorrect}
                  className="h-4 w-4 accent-(--secondary-container)"
                  type="checkbox"
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      options: draft.options.map((currentOption, optionIndex) =>
                        optionIndex === index
                          ? {
                              ...currentOption,
                              isCorrect: event.target.checked
                            }
                          : currentOption
                      )
                    })
                  }
                />
                Correct
              </label>
              <Input
                className="h-10"
                placeholder={`Option ${index + 1}`}
                value={option.optionText}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    options: draft.options.map((currentOption, optionIndex) =>
                      optionIndex === index
                        ? {
                            ...currentOption,
                            optionText: event.target.value
                          }
                        : currentOption
                    )
                  })
                }
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...draft,
                  options: [...draft.options, { isCorrect: false, optionText: "" }]
                })
              }
            >
              Add option
            </Button>
            {draft.options.length > 2 ? (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...draft,
                    options: draft.options.slice(0, -1)
                  })
                }
              >
                Remove last
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-on-surface/60">
            Reference answer
          </Label>
          <Textarea
            className="min-h-20"
            placeholder="Expected answer for teacher reference"
            value={draft.expectedAnswer}
            onChange={(event) =>
              onChange({
                ...draft,
                expectedAnswer: event.target.value
              })
            }
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-9" disabled={isWorking} onClick={onSave}>
          Save question
        </Button>
        {onCancel ? (
          <Button
            type="button"
            className="h-9"
            variant="outline"
            disabled={isWorking}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
