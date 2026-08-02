import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { TestTakingSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentTestDetail, SubmissionDetail } from "@/lib/api/tests";
import { getSubmissionDetail, getTestDetail, gradeSubmission } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";

export const Route = createFileRoute(
  "/dashboard/tests/$testId/submissions/$submissionId"
)({
  component: GradeSubmissionPage,
  errorComponent: RouteErrorView
} as never);

function GradeSubmissionPage(): JSX.Element {
  const { submissionId, testId } = Route.useParams();
  const [testQuery, submissionQuery] = useQueries({
    queries: [
      {
        queryFn: async () => getTestDetail(testId),
        queryKey: queryKeys.tests.detail(testId)
      },
      {
        queryFn: async () => getSubmissionDetail(submissionId),
        queryKey: queryKeys.tests.submission(submissionId)
      }
    ]
  });
  const test: AssessmentTestDetail | null = testQuery?.data ?? null;
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [feedback, setFeedback] = useState("");
  const [marksByAnswerId, setMarksByAnswerId] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isLoading = Boolean(testQuery?.isPending) || Boolean(submissionQuery?.isPending);
  const fetchedSubmission = submissionQuery?.data;

  // The marks and feedback are edited in place, so the fetched submission seeds
  // them rather than being read directly.
  useEffect(() => {
    if (!fetchedSubmission) {
      return;
    }

    setSubmission(fetchedSubmission);
    setFeedback(fetchedSubmission.feedback ?? "");
    setMarksByAnswerId(
      Object.fromEntries(
        fetchedSubmission.answers.map((answer) => [answer.id, answer.awardedMarks ?? 0])
      )
    );
  }, [fetchedSubmission]);

  const answerMap = useMemo(
    () => new Map(submission?.answers.map((answer) => [answer.questionId, answer]) ?? []),
    [submission?.answers]
  );

  const handleSave = async (): Promise<void> => {
    if (!submission || !test) {
      return;
    }

    setIsSaving(true);

    try {
      const writtenQuestions = test.questions.filter((question) => question.type === "WRITTEN");
      const graded = await gradeSubmission(submission.id, {
        answers: writtenQuestions
          .map((question) => {
            const answer = answerMap.get(question.id);

            if (!answer) {
              return null;
            }

            return {
              answerId: answer.id,
              awardedMarks: marksByAnswerId[answer.id] ?? 0
            };
          })
          .filter((value): value is { answerId: string; awardedMarks: number } => value !== null),
        feedback
      });
      setSubmission(graded);
      toast.success("Submission graded");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !test || !submission) {
    return (
      <TestTakingSkeleton />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{submission.user.name}</CardTitle>
          <CardDescription>
            {test.title} · {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
          </CardDescription>
        </CardHeader>
      </Card>

      {test.questions.map((question) => {
        const answer = answerMap.get(question.id);
        const selectedOption = question.options.find((option) => option.id === answer?.selectedOptionId);

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-lg">{question.questionText}</CardTitle>
              <CardDescription>
                {question.type} · {question.marks} marks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {question.type === "MCQ" ? (
                <>
                  <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
                    Selected option: {selectedOption?.optionText ?? "No answer"}
                  </div>
                  <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
                    Correct option(s):{" "}
                    {question.options
                      .filter((option) => option.isCorrect)
                      .map((option) => option.optionText)
                      .join(", ") || "None"}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
                    {answer?.writtenAnswer || "No written answer submitted"}
                  </div>
                  <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
                    Reference answer: {question.expectedAnswer || "Not provided"}
                  </div>
                  {answer ? (
                    <Input
                      min={0}
                      max={question.marks}
                      type="number"
                      value={marksByAnswerId[answer.id] ?? 0}
                      onChange={(event) =>
                        setMarksByAnswerId((currentValues) => ({
                          ...currentValues,
                          [answer.id]: Number(event.target.value)
                        }))
                      }
                    />
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Submission feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving..." : "Finalize grading"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
