import type { CreateQuestionInput } from "@/lib/api/tests";

/** The in-progress question shared by the builder and its editor. */
export interface QuestionDraft {
  expectedAnswer: string;
  marks: number;
  options: {
    isCorrect: boolean;
    optionText: string;
  }[];
  questionText: string;
  type: "MCQ" | "WRITTEN";
}

export const initialQuestionDraft: QuestionDraft = {
  expectedAnswer: "",
  marks: 1,
  options: [
    { isCorrect: true, optionText: "" },
    { isCorrect: false, optionText: "" }
  ],
  questionText: "",
  type: "MCQ"
};

export function createQuestionPayload(draft: QuestionDraft): CreateQuestionInput {
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
