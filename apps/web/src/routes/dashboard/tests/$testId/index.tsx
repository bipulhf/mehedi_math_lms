import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TestTakingSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AnswerScriptUploader } from "@/components/tests/answer-script-uploader";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { AssessmentTestDetail, ScriptPageView, SubmissionDetail } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";
import {
  getTestDetail,
  saveSubmissionAnswers,
  startSubmission,
  submitTest
} from "@/lib/api/tests";

interface DraftAnswer {
  selectedOptionId?: string | undefined;
}

export const Route = createFileRoute("/dashboard/tests/$testId/")({
  head: () =>
    seo({
      description: "Answer the test's questions before time runs out.",
      path: "/dashboard/tests",
      title: "Take Test"
    }),
  component: StudentTestPage,
  errorComponent: RouteErrorView
} as never);

function StudentTestPage(): JSX.Element {
  const t = useT();

  const { testId } = Route.useParams();
  const router = useRouter();
  const { data: test = null, isPending: isLoadingTest } = useQuery<AssessmentTestDetail>({
    queryFn: async () => getTestDetail(testId),
    queryKey: queryKeys.tests.detail(testId)
  });
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, DraftAnswer>>({});
  const [pagesByQuestionId, setPagesByQuestionId] = useState<
    Record<string, readonly ScriptPageView[]>
  >({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isStartingSubmission, setIsStartingSubmission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const isHydratingAnswersRef = useRef(true);
  const isLoading = isLoadingTest || isStartingSubmission;

  /**
   * Starting a submission is a write -- it creates the attempt, or resumes the
   * open one -- so it stays an effect rather than becoming a cached read. It
   * must happen exactly once per test.
   */
  useEffect(() => {
    setIsStartingSubmission(true);
    setError(null);

    void (async () => {
      try {
        const submissionDetail = await startSubmission(testId);

        setSubmission(submissionDetail);
        setDraftAnswers(
          Object.fromEntries(
            submissionDetail.answers.map((answer) => [
              answer.questionId,
              { selectedOptionId: answer.selectedOptionId ?? undefined }
            ])
          )
        );
        setPagesByQuestionId(
          Object.fromEntries(
            submissionDetail.answers.map((answer) => [answer.questionId, answer.scriptPages])
          )
        );
        isHydratingAnswersRef.current = true;
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Could not start this test");
      } finally {
        setIsStartingSubmission(false);
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

  // A written paper has nothing to autosave: its pages are uploaded as the
  // student photographs them, and there are no selections to keep.
  useEffect(() => {
    if (!submission || test?.type === "WRITTEN" || isHydratingAnswersRef.current) {
      isHydratingAnswersRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveSubmissionAnswers(submission.id, {
        answers: Object.entries(draftAnswers).map(([questionId, answer]) => ({
          questionId,
          selectedOptionId: answer.selectedOptionId
        }))
      });
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftAnswers, submission, test?.type]);

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
      test?.questions.filter((question) =>
        test.type === "WRITTEN"
          ? (pagesByQuestionId[question.id]?.length ?? 0) > 0
          : Boolean(draftAnswers[question.id]?.selectedOptionId)
      ).length ?? 0,
    [draftAnswers, pagesByQuestionId, test]
  );

  const handleSubmit = async (): Promise<void> => {
    if (!test) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitTest(test.id, {
        answers:
          test.type === "WRITTEN"
            ? []
            : Object.entries(draftAnswers).map(([questionId, answer]) => ({
                questionId,
                selectedOptionId: answer.selectedOptionId
              }))
      });
      toast.success(t("test.submitted"));
      await router.navigate({
        params: {
          submissionId: result.id,
          testId: test.id
        },
        to: "/dashboard/tests/$testId/results/$submissionId"
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit this test");
      setIsSubmitting(false);
    }
  };

  if (error && !submission) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-error">{error}</CardContent>
      </Card>
    );
  }

  if (isLoading || !test || !submission || !currentQuestion) {
    return (
      <TestTakingSkeleton />
    );
  }

  return (
    <div className="space-y-4">
      <BackButton to="/dashboard" />
      <div className="grid gap-4 xl:grid-cols-[0.3fr_0.7fr]">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <CardDescription>
              {t("test.answered", { count: answeredCount, total: test.questions.length })}
            </CardDescription>
            {test.maxAttempts !== null ? (
              <Badge tone="neutral">
                {t("test.attemptIndicator", {
                  current: String((test.attemptsUsed ?? 0) + 1),
                  total: String(test.maxAttempts)
                })}
              </Badge>
            ) : null}
          </div>
          <div
            aria-hidden="true"
            className="h-1.5 w-full overflow-hidden rounded-full bg-panel-warm"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{
                width: `${test.questions.length === 0 ? 0 : (answeredCount / test.questions.length) * 100}%`
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {timeRemainingSeconds !== null ? (
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/62">{t("test.timeRemaining")}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
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
              const isAnswered =
                test.type === "WRITTEN"
                  ? (pagesByQuestionId[question.id]?.length ?? 0) > 0
                  : Boolean(draftAnswers[question.id]?.selectedOptionId);

              return (
                <button
                  key={question.id}
                  className={`rounded-[calc(var(--radius)-0.125rem)] border px-3 py-3 text-left transition-colors ${
                    index === currentQuestionIndex
                      ? "border-accent bg-accent/10"
                      : "border-hairline bg-panel-warm hover:bg-panel-warm"
                  }`}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">Question {index + 1}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-ink/62">
                      {isAnswered ? "Saved" : "Pending"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
          <CardDescription>
            {test.type === "WRITTEN" ? "Written" : "MCQ"} · {currentQuestion.marks} marks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichTextContent
            className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink"
            html={currentQuestion.questionText}
          />
          {currentQuestion.images.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {currentQuestion.images.map((image) => (
                <ResponsiveImage
                  key={image.id}
                  alt=""
                  className="w-full rounded-[calc(var(--radius)-0.125rem)] border border-hairline"
                  sizes="(min-width: 640px) 45vw, 90vw"
                  src={image.fileUrl}
                />
              ))}
            </div>
          ) : null}
          {test.type === "MCQ" ? (
            <div className="grid gap-3">
              {(() => {
                const selectedOptionId = draftAnswers[currentQuestion.id]?.selectedOptionId;
                const isLocked = test.lockAnswerOnSelect && Boolean(selectedOptionId);

                return currentQuestion.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 rounded-[calc(var(--radius)-0.125rem)] border px-4 py-4 transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/8"
                          : "border-hairline bg-panel-warm"
                      } ${isLocked && !isSelected ? "opacity-50" : ""}`}
                    >
                      <input
                        checked={isSelected}
                        className="h-4 w-4 accent-(--secondary-container)"
                        disabled={isLocked && !isSelected}
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
                      <span className="text-sm text-ink">{option.optionText}</span>
                    </label>
                  );
                });
              })()}
              {test.lockAnswerOnSelect && draftAnswers[currentQuestion.id]?.selectedOptionId ? (
                <p className="text-xs text-ink/55">{t("test.optionLocked")}</p>
              ) : null}
            </div>
          ) : (
            <AnswerScriptUploader
              pages={pagesByQuestionId[currentQuestion.id] ?? []}
              questionId={currentQuestion.id}
              submissionId={submission.id}
              onPagesChange={(pages) =>
                setPagesByQuestionId((current) => ({ ...current, [currentQuestion.id]: pages }))
              }
            />
          )}
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((value) => Math.max(0, value - 1))}
            >{t("common.previous")}</Button>
            {currentQuestionIndex === test.questions.length - 1 ? (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmingSubmit(true)}
              >
                {t("test.confirmSubmitAction")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  setCurrentQuestionIndex((value) => Math.min(test.questions.length - 1, value + 1))
                }
              >{t("common.next")}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      </div>
      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        confirmLabel={t("test.confirmSubmitAction")}
        description={t("test.confirmSubmitDescription", {
          answered: String(answeredCount),
          total: String(test.questions.length)
        })}
        onCancel={() => setIsConfirmingSubmit(false)}
        onConfirm={() => {
          setIsConfirmingSubmit(false);
          void handleSubmit();
        }}
        open={isConfirmingSubmit}
        pending={isSubmitting}
        title={t("test.confirmSubmitTitle")}
      />
    </div>
  );
}
