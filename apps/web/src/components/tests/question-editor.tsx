import type { JSX } from "react";

import type { QuestionDraft } from "@/components/tests/question-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * The question form, used twice by `AssessmentBuilder` — once to add a question
 * and once to edit one in place. It owns no state; the builder holds the draft.
 */
export interface QuestionEditorProps {
  draft: QuestionDraft;
  isWorking: boolean;
  onCancel?: (() => void) | undefined;
  onChange: (draft: QuestionDraft) => void;
  onSave: () => void;
}

export function QuestionEditor({
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
