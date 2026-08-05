import type { CreateQuestionInput, TestType } from "@/lib/api/tests";

/** An image already uploaded and waiting to be attached to the question. */
export interface QuestionDraftImage {
  fileUrl: string;
  uploadId: string;
}

/**
 * The in-progress question shared by the builder and its editor.
 *
 * A question carries no type of its own — the Test decides whether options or
 * an Answer Script are expected (ADR-0008) — so the draft holds both shapes and
 * the payload sends whichever the Test asked for.
 */
export interface QuestionDraft {
  images: QuestionDraftImage[];
  markingGuide: string;
  marks: number;
  options: {
    isCorrect: boolean;
    optionText: string;
  }[];
  questionText: string;
}

export const initialQuestionDraft: QuestionDraft = {
  images: [],
  markingGuide: "",
  marks: 1,
  options: [
    { isCorrect: true, optionText: "" },
    { isCorrect: false, optionText: "" }
  ],
  questionText: ""
};

export function createQuestionPayload(
  draft: QuestionDraft,
  testType: TestType
): CreateQuestionInput {
  return {
    imageUploadIds: draft.images.map((image) => image.uploadId),
    markingGuide: testType === "WRITTEN" ? draft.markingGuide : undefined,
    marks: draft.marks,
    options:
      testType === "MCQ"
        ? draft.options.map((option) => ({
            isCorrect: option.isCorrect,
            optionText: option.optionText
          }))
        : undefined,
    questionText: draft.questionText
  };
}
