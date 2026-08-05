import type { JSX } from "react";

import { MarkingLayer } from "@/components/marking/marking-layer";
import { Badge } from "@/components/ui/badge";
import { RichTextContent } from "@/components/ui/rich-text-content";
import type { AssessmentTestDetail, SubmissionDetail } from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * One student's written paper as it stands: the pages they handed in with any
 * Marking drawn over them, and the mark each answer was given.
 *
 * Read-only — marking happens in the marking workspace, which claims each
 * answer as it opens it so two teachers cannot write over each other.
 */
export function WrittenAnswerReview({
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
        const pages = answer?.scriptPages ?? [];

        return (
          <div className="border border-hairline bg-card p-4" key={question.id}>
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
              <Badge tone={answer?.awardedMarks === null ? "attention" : "neutral"}>
                {answer?.awardedMarks === null || answer === undefined
                  ? t("exams.awaitingMarking")
                  : `${format.number(answer.awardedMarks)}/${format.number(question.marks)}`}
              </Badge>
            </div>

            {pages.length === 0 ? (
              <p className="mt-3 text-sm text-muted-faint">{t("script.notAttempted")}</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {pages.map((page) => (
                  <MarkingLayer
                    color="RED"
                    key={page.id}
                    marking={page.marking}
                    pageHeight={page.height ?? 0}
                    pageUrl={page.fileUrl}
                    pageWidth={page.width ?? 0}
                    penWidth="MEDIUM"
                    tool="PEN"
                  />
                ))}
              </div>
            )}

            {question.markingGuide ? (
              <div className="mt-3 border-l-2 border-accent pl-3">
                <p className="label-mono text-xs uppercase text-muted-faint">
                  {t("qe.markingGuide")}
                </p>
                <RichTextContent
                  className="mt-1 text-sm font-light text-muted"
                  html={question.markingGuide}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
