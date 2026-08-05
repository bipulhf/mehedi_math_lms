import { Eye, Plus, X } from "lucide-react";
import type { JSX } from "react";

import { OptionTextInput } from "@/components/tests/option-text-input";
import { MathText } from "@/components/ui/math-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { isEmptyHtml } from "@/lib/html";
import { useT } from "@/lib/i18n/locale-context";

export interface McqDraft {
  marks: number;
  options: { isCorrect: boolean; optionText: string }[];
  questionText: string;
}

export function createEmptyMcqDraft(): McqDraft {
  return {
    marks: 1,
    options: [
      { isCorrect: true, optionText: "" },
      { isCorrect: false, optionText: "" }
    ],
    questionText: ""
  };
}

export function isValidMcqDraft(draft: McqDraft): boolean {
  return (
    !isEmptyHtml(draft.questionText) &&
    draft.options.length >= 2 &&
    draft.options.every((option) => option.optionText.trim().length > 0) &&
    draft.options.some((option) => option.isCorrect)
  );
}

/**
 * The MCQ question form and its preview, lifted out of `CourseExamEditor` when
 * the written form joined it — the file was at the repo's 800-line ceiling and
 * the two forms are a clean seam.
 */
export function McqQuestionForm({
  draft,
  isEditing,
  isOpen,
  isWorking,
  onCancel,
  onChange,
  onToggle,
  onSave
}: {
  draft: McqDraft;
  isEditing: boolean;
  isOpen: boolean;
  isWorking: boolean;
  onCancel: () => void;
  onChange: (draft: McqDraft) => void;
  onToggle: () => void;
  onSave: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <div className="border border-hairline bg-card">
      <button
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center gap-4 p-5 text-left sm:p-6"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-medium text-ink">{t("author.mcqQuestion")}</span>
          <span className="mt-1 block text-sm font-light text-muted">
            {isEditing ? t("action.edit") : t("author.examLead")}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl font-light text-accent">
          {isOpen ? "-" : "+"}
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-5 border-t border-hairline p-5 sm:p-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("author.mcqQuestion")}</Label>
              <RichTextEditor
                placeholder={t("author.mcqQuestionPlaceholder")}
                value={draft.questionText}
                onChange={(value) => onChange({ ...draft, questionText: value })}
              />
            </div>
            <div className="max-w-xs space-y-2">
              <Label>{t("qe.marks")}</Label>
              <Input
                min={1}
                type="number"
                value={draft.marks}
                onChange={(event) => onChange({ ...draft, marks: Number(event.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="label-mono text-xs uppercase text-muted-faint">{t("author.mcqCorrect")}</p>
              <p className="mt-1 text-sm font-light text-muted">{t("ab.questionsLead")}</p>
            </div>
            {draft.options.map((option, index) => (
              <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]" key={index}>
                <label
                  className="flex min-h-11 items-center gap-2 border border-hairline bg-panel-warm px-3 text-sm text-ink"
                  title={t("author.mcqCorrect")}
                >
                  <input
                    aria-label={t("author.mcqCorrect")}
                    checked={option.isCorrect}
                    name="correct-answer"
                    type="radio"
                    onChange={() =>
                      onChange({
                        ...draft,
                        options: draft.options.map((current, optionIndex) => ({
                          ...current,
                          isCorrect: optionIndex === index
                        }))
                      })
                    }
                  />
                  <span>
                    {option.isCorrect
                      ? t("qe.correct")
                      : t("author.mcqOption", { number: String(index + 1) })}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <OptionTextInput
                    className="min-w-0 flex-1"
                    placeholder={t("author.mcqOption", { number: String(index + 1) })}
                    value={option.optionText}
                    onChange={(optionText) =>
                      onChange({
                        ...draft,
                        options: draft.options.map((current, optionIndex) =>
                          optionIndex === index ? { ...current, optionText } : current
                        )
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      event.preventDefault();

                      if (draft.options.length >= 8) {
                        return;
                      }

                      onChange({
                        ...draft,
                        options: [...draft.options, { isCorrect: false, optionText: "" }]
                      });
                    }}
                  />
                  <Button
                    aria-label={t("author.removeOption")}
                    className="size-11 shrink-0 text-error"
                    disabled={draft.options.length <= 2}
                    size="icon"
                    title={t("author.removeOption")}
                    variant="ghost"
                    onClick={() => {
                      if (draft.options.length <= 2) {
                        return;
                      }

                      let remaining = draft.options.filter((_, optionIndex) => optionIndex !== index);

                      if (!remaining.some((current) => current.isCorrect)) {
                        remaining = remaining.map((current, optionIndex) =>
                          optionIndex === 0 ? { ...current, isCorrect: true } : current
                        );
                      }

                      onChange({ ...draft, options: remaining });
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <McqQuestionPreview draft={draft} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-11"
                disabled={draft.options.length >= 8}
                variant="outline"
                onClick={() =>
                  onChange({
                    ...draft,
                    options: [...draft.options, { isCorrect: false, optionText: "" }]
                  })
                }
              >
                <Plus className="size-4" />
                {t("qe.addOption")}
              </Button>
              {draft.options.length > 2 ? (
                <Button
                  className="h-11"
                  variant="ghost"
                  onClick={() => onChange({ ...draft, options: draft.options.slice(0, -1) })}
                >
                  {t("qe.removeLast")}
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <Button className="h-11" variant="ghost" onClick={onCancel}>
                  {t("action.cancel")}
                </Button>
              ) : null}
              <Button className="h-11" disabled={isWorking} onClick={onSave}>
                {t("qe.save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function McqQuestionPreview({ draft }: { draft: McqDraft }): JSX.Element {
  const t = useT();
  const hasQuestion = !isEmptyHtml(draft.questionText);

  return (
    <section className="space-y-4 border border-hairline bg-panel-warm/45 p-5 sm:p-6">
      <div className="flex items-start gap-3 border-b border-hairline pb-4">
        <Eye className="mt-0.5 size-5 text-accent" />
        <div>
          <h4 className="text-lg font-medium text-ink">{t("editor.preview")}</h4>
          <p className="mt-1 text-sm font-light text-muted">{t("ab.questionsLead")}</p>
        </div>
      </div>

      <div className="space-y-4">
        {hasQuestion ? (
          <RichTextContent className="text-base font-medium leading-relaxed text-ink" html={draft.questionText} />
        ) : (
          <p className="text-base font-light italic text-muted-faint">{t("author.mcqQuestionPlaceholder")}</p>
        )}

        <div className="space-y-2">
          {draft.options.map((option, index) => (
            <div className="flex items-center gap-3 border border-hairline bg-card px-4 py-3" key={index}>
              <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-line-strong" />
              <span className={option.optionText.trim() ? "text-sm text-ink" : "text-sm italic text-muted-faint"}>
                {option.optionText.trim() ? (
                  <MathText text={option.optionText} />
                ) : (
                  t("author.mcqOption", { number: String(index + 1) })
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
