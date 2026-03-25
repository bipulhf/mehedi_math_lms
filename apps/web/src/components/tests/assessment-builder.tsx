import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FadeIn } from "@/components/common/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CourseDetail } from "@/lib/api/courses";
import type {
  AssessmentChapterSummary,
  AssessmentQuestion,
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
  const [selectedTestId, setSelectedTestId] = useState<string | null>(assessments[0]?.tests[0]?.id ?? null);
  const [selectedTest, setSelectedTest] = useState<AssessmentTestDetail | null>(null);
  const [testDrafts, setTestDrafts] = useState<Record<string, CreateTestInput>>({});
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(initialQuestionDraft);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionEditDrafts, setQuestionEditDrafts] = useState<Record<string, QuestionDraft>>({});
  const [isWorking, setIsWorking] = useState(false);

  const selectedTestSummary = useMemo(
    () =>
      assessments
        .flatMap((chapter) => chapter.tests)
        .find((test) => test.id === selectedTestId) ?? null,
    [assessments, selectedTestId]
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
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        {assessments.map((chapter, chapterIndex) => (
          <FadeIn key={chapter.chapterId} delayClassName={chapterIndex > 0 ? "delay-75" : undefined}>
            <Card>
              <CardHeader>
                <CardTitle>{chapter.chapterTitle}</CardTitle>
                <CardDescription>
                  Build chapter-level assessments for regular lessons or exam-only course flows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {chapter.tests.length === 0 ? (
                    <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface/70">
                      No tests in this chapter yet.
                    </div>
                  ) : null}
                  {chapter.tests.map((test) => (
                    <button
                      key={test.id}
                      className={`w-full rounded-[calc(var(--radius)-0.125rem)] border p-4 text-left transition-all ${
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
                          <p className="text-sm text-on-surface/62">
                            {test.type} · {test.questionCount} questions · {test.totalMarks} marks
                          </p>
                        </div>
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs uppercase tracking-[0.18em] text-on-surface/62">
                          {test.isPublished ? "Published" : "Draft"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-outline-variant bg-surface-container-low p-4">
                  <Input
                    placeholder="New test title"
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
                  <div className="grid gap-3 md:grid-cols-3">
                    <Select
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
                      min={1}
                      placeholder="Duration"
                      type="number"
                      value={testDrafts[chapter.chapterId]?.durationInMinutes ?? initialTestDraft.durationInMinutes ?? ""}
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
                      min={0}
                      placeholder="Passing score"
                      type="number"
                      value={testDrafts[chapter.chapterId]?.passingScore ?? initialTestDraft.passingScore ?? ""}
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
                    placeholder="Describe the assessment focus, timing, and grading expectations."
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
                  <label className="flex items-center gap-3 text-sm text-on-surface">
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
                    <span>Publish immediately</span>
                  </label>
                  <Button type="button" disabled={isWorking} onClick={() => void handleCreateTest(chapter.chapterId)}>
                    Create test
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>

      <div className="space-y-4">
        {!selectedTest || !selectedTestSummary ? (
          <Card>
            <CardContent className="p-6 text-sm leading-6 text-on-surface/70">
              Select a test to edit its timing, build questions, and review submissions.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <CardTitle>{selectedTest.title}</CardTitle>
                  <CardDescription>
                    This assessment belongs to `{course.title}` and currently carries {selectedTest.totalMarks} marks.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link to="/dashboard/tests/$testId" params={{ testId: selectedTest.id }}>
                      Open student view
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/dashboard/tests/$testId/submissions" params={{ testId: selectedTest.id }}>
                      Review submissions
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" disabled={isWorking} onClick={() => void handleDeleteSelectedTest()}>
                    Delete test
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Input
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
                <div className="grid gap-3 md:grid-cols-4">
                  <Select
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
                  <label className="flex items-center gap-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant px-4 text-sm text-on-surface">
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
                <Textarea
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
                <Button type="button" disabled={isWorking} onClick={() => void handleUpdateSelectedTest()}>
                  Save test settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  Add MCQ or written prompts, tune marks, and keep the order aligned with the final test flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTest.questions.map((question) => (
                  <div key={question.id} className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4">
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
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-on-surface">{question.questionText}</p>
                            <p className="text-sm text-on-surface/62">
                              {question.type} · {question.marks} marks
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" type="button" variant="outline" onClick={() => void handleMoveQuestion(question.id, -1)}>
                              Up
                            </Button>
                            <Button size="sm" type="button" variant="outline" onClick={() => void handleMoveQuestion(question.id, 1)}>
                              Down
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
                            <Button size="sm" type="button" variant="outline" onClick={() => void handleDeleteQuestion(question.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                        {question.type === "MCQ" ? (
                          <div className="grid gap-2 md:grid-cols-2">
                            {question.options.map((option) => (
                              <div
                                key={option.id}
                                className={`rounded-[calc(var(--radius)-0.125rem)] px-3 py-2 text-sm ${
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

                <div className="rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-outline-variant bg-surface-container-low p-4">
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
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[0.75fr_0.25fr]">
        <Select
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
        <Input
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
      <Textarea
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
        <div className="space-y-3">
          {draft.options.map((option, index) => (
            <div key={`${index}-${option.optionText}`} className="grid gap-3 md:grid-cols-[auto_1fr]">
              <label className="flex items-center gap-2 text-sm text-on-surface">
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
          <div className="flex gap-2">
            <Button
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
          <Label>Reference answer</Label>
          <Textarea
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
        <Button type="button" disabled={isWorking} onClick={onSave}>
          Save question
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={isWorking} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
