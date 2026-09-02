import { McqImportError, parseMcqImport, type McqImportRejection } from "@genex/shared";
import type { JSX } from "react";
import { useState } from "react";

import type { QuestionDraft } from "@/components/tests/question-draft";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/math-text";
import { Modal } from "@/components/ui/modal";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/locale-context";

export interface McqImportDialogProps {
  onClose: () => void;
  /** The drafts, once every one of them has an answer marked. */
  onImport: (drafts: readonly QuestionDraft[]) => void;
  open: boolean;
}

/**
 * Bringing a paper in from the Bijoy-to-LaTeX converter.
 *
 * The converter reads a SutonnyMJ Word document and produces
 * `{ question, options }[]` — and no answer key, because the document has
 * none. The API refuses an MCQ question with no correct option, so rather than
 * defaulting one and shipping an exam whose key is quietly wrong, nothing is
 * created until the teacher has ticked an answer for every question here.
 *
 * The preview is rendered with the same components a student reads the exam
 * through, which is the point of the step: `@genex/shared`'s importer has to
 * *guess* which spans of the converter's output are maths, and this is where a
 * wrong guess is visible while it is still free to fix.
 */
export function McqImportDialog({ onClose, onImport, open }: McqImportDialogProps): JSX.Element {
  const t = useT();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<QuestionDraft[] | null>(null);
  const [rejected, setRejected] = useState<readonly McqImportRejection[]>([]);

  const reset = (): void => {
    setRaw("");
    setError(null);
    setDrafts(null);
    setRejected([]);
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const handleRead = (): void => {
    try {
      const result = parseMcqImport(raw);

      setError(null);
      setRejected(result.rejected);
      setDrafts(
        result.questions.map((question) => ({
          images: [],
          markingGuide: "",
          marks: 1,
          options: question.optionTexts.map((optionText) => ({ isCorrect: false, optionText })),
          questionText: question.questionHtml
        }))
      );
    } catch (caught) {
      setDrafts(null);
      setRejected([]);
      setError(
        caught instanceof McqImportError ? caught.message : t("mcqImport.unreadable")
      );
    }
  };

  const toggleOption = (questionIndex: number, optionIndex: number): void => {
    setDrafts((current) =>
      (current ?? []).map((draft, index) =>
        index === questionIndex
          ? {
              ...draft,
              options: draft.options.map((option, currentIndex) =>
                currentIndex === optionIndex
                  ? { ...option, isCorrect: !option.isCorrect }
                  : option
              )
            }
          : draft
      )
    );
  };

  const removeQuestion = (questionIndex: number): void => {
    setDrafts((current) => (current ?? []).filter((_draft, index) => index !== questionIndex));
  };

  const unanswered = (drafts ?? []).filter(
    (draft) => !draft.options.some((option) => option.isCorrect)
  ).length;
  const canImport = drafts !== null && drafts.length > 0 && unanswered === 0;

  return (
    <Modal className="max-w-3xl" onClose={handleClose} open={open} title={t("mcqImport.title")}>
      <div className="space-y-4">
        {drafts === null ? (
          <>
            <p className="text-sm font-light leading-relaxed text-muted">{t("mcqImport.lead")}</p>
            <Textarea
              onChange={(event) => setRaw(event.target.value)}
              placeholder={t("mcqImport.placeholder")}
              rows={10}
              value={raw}
            />
            {error === null ? null : <p className="text-sm text-error">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRead} type="button">
                {t("mcqImport.read")}
              </Button>
              <Button onClick={handleClose} type="button" variant="outline">
                {t("common.cancel")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-light leading-relaxed text-muted">
              {t("mcqImport.reviewLead", { count: String(drafts.length) })}
            </p>

            {rejected.length === 0 ? null : (
              <p className="text-sm text-error">
                {t("mcqImport.skipped", {
                  positions: rejected.map((row) => String(row.index)).join(", ")
                })}
              </p>
            )}

            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {drafts.map((draft, questionIndex) => {
                const isAnswered = draft.options.some((option) => option.isCorrect);

                return (
                  <div
                    className={`border p-3 ${isAnswered ? "border-hairline" : "border-error"}`}
                    key={questionIndex}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <RichTextContent className="min-w-0 text-sm" html={draft.questionText} />
                      <Button
                        onClick={() => removeQuestion(questionIndex)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {t("ab.delete")}
                      </Button>
                    </div>
                    <div className="mt-2 grid gap-1 md:grid-cols-2">
                      {draft.options.map((option, optionIndex) => (
                        <label
                          className="flex items-start gap-2 text-sm text-ink"
                          key={optionIndex}
                        >
                          <input
                            checked={option.isCorrect}
                            className="mt-1 h-4 w-4 shrink-0 accent-(--secondary-container)"
                            onChange={() => toggleOption(questionIndex, optionIndex)}
                            type="checkbox"
                          />
                          <MathText text={option.optionText} />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {unanswered === 0 ? null : (
              <p className="text-sm text-error">
                {t("mcqImport.needAnswers", { count: String(unanswered) })}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button disabled={!canImport} onClick={() => onImport(drafts)} type="button">
                {t("mcqImport.add", { count: String(drafts.length) })}
              </Button>
              <Button onClick={reset} type="button" variant="outline">
                {t("mcqImport.back")}
              </Button>
              <Button onClick={handleClose} type="button" variant="outline">
                {t("common.cancel")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
