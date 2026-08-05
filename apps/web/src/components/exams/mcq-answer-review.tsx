import type { JSX } from "react";

import { Badge } from "@/components/ui/badge";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { AssessmentTestDetail, SubmissionDetail } from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * One student's MCQ paper, question by question: what they picked, what was
 * correct, and what it scored.
 *
 * The correct option is only present when the caller was allowed to see it —
 * staff always, a student only after a completed attempt — so this renders
 * whatever `isCorrect` it was given rather than deciding who may know.
 */
export function McqAnswerReview({
  submission,
  test
}: {
  submission: SubmissionDetail;
  test: AssessmentTestDetail;
}): JSX.Element {
  const t = useT();
  const format = useFormat();
  const answerByQuestionId = new Map(
    submission.answers.map((answer) => [answer.questionId, answer])
  );

  return (
    <div className="space-y-3">
      {test.questions.map((question, index) => {
        const answer = answerByQuestionId.get(question.id);
        const pickedOption = question.options.find(
          (option) => option.id === answer?.selectedOptionId
        );

        return (
          <div className="border border-hairline bg-card p-4 sm:p-6" key={question.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="label-mono text-xs text-muted-faint">
                  {format.digits(String(index + 1).padStart(2, "0"))}
                </span>
                <RichTextContent
                  className="mt-1 font-medium text-ink [&_p]:mb-0"
                  html={question.questionText}
                />
              </div>
              <Badge tone={answer?.isCorrect === true ? "neutral" : "attention"}>
                {format.number(answer?.awardedMarks ?? 0)}/{format.number(question.marks)}
              </Badge>
            </div>

            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {question.options.map((option) => {
                const isPicked = option.id === answer?.selectedOptionId;
                const isCorrect = option.isCorrect === true;

                return (
                  <li
                    className={`flex items-center justify-between gap-2 border px-3 py-2 ${
                      isCorrect
                        ? "border-correct/60 bg-correct/6 text-ink"
                        : isPicked
                          ? "border-error/60 bg-error/6 text-ink"
                          : "border-hairline bg-panel-warm text-muted"
                    }`}
                    key={option.id}
                  >
                    <span className="min-w-0 break-words">{option.optionText}</span>
                    <span className="shrink-0 text-xs uppercase tracking-wide">
                      {isPicked ? t("exams.picked") : isCorrect ? t("exams.correctOption") : ""}
                    </span>
                  </li>
                );
              })}
            </ul>

            {answer?.selectedOptionId === null || pickedOption === undefined ? (
              <p className="mt-2 text-sm text-muted-faint">{t("exams.noPick")}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
