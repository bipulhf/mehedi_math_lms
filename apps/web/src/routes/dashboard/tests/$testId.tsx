import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AssessmentTestDetail, SubmissionDetail } from "@/lib/api/tests";
import {
  getTestDetail,
  saveSubmissionAnswers,
  startSubmission,
  submitTest
} from "@/lib/api/tests";

interface DraftAnswer {
  selectedOptionId?: string | undefined;
  writtenAnswer?: string | undefined;
}

export const Route = createFileRoute("/dashboard/tests/$testId" as never)({
  component: StudentTestPage,
  errorComponent: RouteErrorView
} as never);

function StudentTestPage(): JSX.Element {
  const { testId } = Route.useParams();
  const router = useRouter();
  const [test, setTest] = useState<AssessmentTestDetail | null>(null);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, DraftAnswer>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const isHydratingAnswersRef = useRef(true);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const [testDetail, submissionDetail] = await Promise.all([
          getTestDetail(testId),
          startSubmission(testId)
        ]);
        setTest(testDetail);
        setSubmission(submissionDetail);
        setDraftAnswers(
          Object.fromEntries(
            submissionDetail.answers.map((answer) => [
              answer.questionId,
              {
                selectedOptionId: answer.selectedOptionId ?? undefined,
                writtenAnswer: answer.writtenAnswer ?? undefined
              }
            ])
          )
        );
        isHydratingAnswersRef.current = true;
      } finally {
        setIsLoading(false);
      }
    })();
  }, [testId]);

  useEffect(() => {
    if (!test || !submission?.startedAt || !test.durationInMinutes) {
      setTimeRemainingSeconds(null);
      return;
    }

    const startedAt = new Date(submission.startedAt).getTime();
    const durationMs = test.durationInMinutes * 60 * 1000;
    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((startedAt + durationMs - Date.now()) / 1000));
      setTimeRemainingSeconds(remaining);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [submission?.startedAt, test]);

  useEffect(() => {
    if (!submission || isHydratingAnswersRef.current) {
      isHydratingAnswersRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveSubmissionAnswers(submission.id, {
        answers: Object.entries(draftAnswers).map(([questionId, answer]) => ({
          questionId,
          selectedOptionId: answer.selectedOptionId,
          writtenAnswer: answer.writtenAnswer
        }))
      });
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftAnswers, submission]);

  useEffect(() => {
    if (timeRemainingSeconds !== 0 || isSubmitting || !submission || !test) {
      return;
    }

    void handleSubmit();
  }, [isSubmitting, submission, test, timeRemainingSeconds]);

  const currentQuestion = useMemo(
    () => test?.questions[currentQuestionIndex] ?? null,
    [currentQuestionIndex, test]
  );

  const answeredCount = useMemo(
    () =>
      test?.questions.filter((question) => {
        const answer = draftAnswers[question.id];

        return question.type === "MCQ"
          ? Boolean(answer?.selectedOptionId)
          : Boolean(answer?.writtenAnswer?.trim());
      }).length ?? 0,
    [draftAnswers, test]
  );

  const handleSubmit = async (): Promise<void> => {
    if (!test) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitTest(test.id, {
        answers: Object.entries(draftAnswers).map(([questionId, answer]) => ({
          questionId,
          selectedOptionId: answer.selectedOptionId,
          writtenAnswer: answer.writtenAnswer
        }))
      });
      toast.success("Test submitted");
      await router.navigate({
        params: {
          submissionId: result.id,
          testId: test.id
        },
        to: "/dashboard/tests/$testId/results/$submissionId"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !test || !submission || !currentQuestion) {
    return (
      <Card>
        <CardContent className="p-6 text-sm leading-6 text-on-surface/70">
          Loading test workspace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.3fr_0.7fr]">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>
            {answeredCount}/{test.questions.length} answered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {timeRemainingSeconds !== null ? (
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface/62">Time remaining</p>
              <p className="mt-2 text-2xl font-semibold text-on-surface">
                {Math.floor(timeRemainingSeconds / 60)
                  .toString()
                  .padStart(2, "0")}
                :
                {(timeRemainingSeconds % 60).toString().padStart(2, "0")}
              </p>
            </div>
          ) : null}
          <div className="grid gap-2">
            {test.questions.map((question, index) => {
              const answer = draftAnswers[question.id];
              const isAnswered =
                question.type === "MCQ"
                  ? Boolean(answer?.selectedOptionId)
                  : Boolean(answer?.writtenAnswer?.trim());

              return (
                <button
                  key={question.id}
                  className={`rounded-[calc(var(--radius)-0.125rem)] border px-3 py-3 text-left transition-colors ${
                    index === currentQuestionIndex
                      ? "border-secondary-container bg-secondary-container/10"
                      : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                  }`}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-on-surface">Question {index + 1}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-on-surface/62">
                      {isAnswered ? "Saved" : "Pending"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? "Submitting..." : "Submit test"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
          <CardDescription>
            {currentQuestion.type} · {currentQuestion.marks} marks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface">
            {currentQuestion.questionText}
          </div>
          {currentQuestion.type === "MCQ" ? (
            <div className="grid gap-3">
              {currentQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low px-4 py-3"
                >
                  <input
                    checked={draftAnswers[currentQuestion.id]?.selectedOptionId === option.id}
                    className="h-4 w-4 accent-(--secondary-container)"
                    name={currentQuestion.id}
                    type="radio"
                    onChange={() =>
                      setDraftAnswers((currentValues) => ({
                        ...currentValues,
                        [currentQuestion.id]: {
                          selectedOptionId: option.id
                        }
                      }))
                    }
                  />
                  <span className="text-sm text-on-surface">{option.optionText}</span>
                </label>
              ))}
            </div>
          ) : (
            <Input
              value={draftAnswers[currentQuestion.id]?.writtenAnswer ?? ""}
              onChange={(event) =>
                setDraftAnswers((currentValues) => ({
                  ...currentValues,
                  [currentQuestion.id]: {
                    writtenAnswer: event.target.value
                  }
                }))
              }
            />
          )}
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((value) => Math.max(0, value - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              disabled={currentQuestionIndex === test.questions.length - 1}
              onClick={() =>
                setCurrentQuestionIndex((value) => Math.min(test.questions.length - 1, value + 1))
              }
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
