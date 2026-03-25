import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssessmentTestDetail, SubmissionDetail } from "@/lib/api/tests";
import { getSubmissionDetail, getTestDetail } from "@/lib/api/tests";

export const Route = createFileRoute("/dashboard/tests/$testId/results/$submissionId" as never)({
  component: SubmissionResultPage,
  errorComponent: RouteErrorView
} as never);

function SubmissionResultPage(): JSX.Element {
  const { submissionId, testId } = Route.useParams();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [test, setTest] = useState<AssessmentTestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const [testDetail, submissionDetail] = await Promise.all([
          getTestDetail(testId),
          getSubmissionDetail(submissionId)
        ]);
        setTest(testDetail);
        setSubmission(submissionDetail);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [submissionId, testId]);

  if (isLoading || !test || !submission) {
    return (
      <Card>
        <CardContent className="p-6 text-sm leading-6 text-on-surface/70">
          Loading result breakdown...
        </CardContent>
      </Card>
    );
  }

  const answerMap = new Map(submission.answers.map((answer) => [answer.questionId, answer]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>
            {submission.status === "GRADED" ? "Final result" : "Submission received"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge tone="violet">{submission.status}</Badge>
          <Badge tone="blue">
            Score {submission.score ?? 0}/{submission.maxScore ?? test.totalMarks}
          </Badge>
          {test.passingScore !== null ? <Badge tone="green">Passing score {test.passingScore}</Badge> : null}
        </CardContent>
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
            <CardContent className="space-y-3">
              {question.type === "MCQ" ? (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
                  {selectedOption?.optionText ?? "No option selected"}
                </div>
              ) : (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface">
                  {answer?.writtenAnswer || "No written answer submitted"}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-on-surface/70">
                <span>Awarded marks: {answer?.awardedMarks ?? 0}</span>
                {answer?.isCorrect !== null && answer?.isCorrect !== undefined ? (
                  <span>{answer.isCorrect ? "Marked correct" : "Marked incorrect"}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
