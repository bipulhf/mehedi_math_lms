import type { createQuestionSchema, submitTestSchema, updateQuestionSchema } from "@genex/shared";
import type { z } from "zod";

import type {
  QuestionOptionRecord,
  QuestionRecord,
  TestRecord
} from "@/repositories/test-repository";
import { ValidationError } from "@/utils/errors";

type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
type SubmitTestInput = z.infer<typeof submitTestSchema>;

/**
 * The scoring rules, as pure functions.
 *
 * MCQ answers grade themselves against the option table. A written Test is not
 * graded here at all: its answers are Answer Scripts, and a teacher marks them
 * page by page.
 */
export function validateQuestionInput(
  testType: TestRecord["type"],
  input: CreateQuestionInput | UpdateQuestionInput,
  existingOptionCount = 0
): void {
  if (testType === "WRITTEN") {
    if (input.options && input.options.length > 0) {
      throw new ValidationError("A written question has no options", [
        {
          field: "options",
          message: "Remove the options — this paper is answered on paper"
        }
      ]);
    }

    return;
  }

  const options = input.options;

  if (!options) {
    // An MCQ patch that leaves the options alone is fine, as long as the
    // question already has some.
    if (existingOptionCount < 2) {
      throw new ValidationError("MCQ questions need at least 2 options", [
        {
          field: "options",
          message: "Add at least 2 options"
        }
      ]);
    }

    return;
  }

  if (options.length < 2) {
    throw new ValidationError("MCQ questions need at least 2 options", [
      {
        field: "options",
        message: "Add at least 2 options"
      }
    ]);
  }

  if (!options.some((option) => option.isCorrect)) {
    throw new ValidationError("MCQ questions require a correct option", [
      {
        field: "options",
        message: "Mark at least one option as correct"
      }
    ]);
  }
}

export function totalMarks(questions: readonly { marks: number }[]): number {
  return roundMarks(questions.reduce((sum, question) => sum + question.marks, 0));
}

/**
 * Marks carry two decimal places, and adding them in binary floating point does
 * not. Every total goes through here so a paper of half marks reports 17.5
 * rather than 17.499999999999996.
 */
export function roundMarks(value: number): number {
  return Math.round(value * 100) / 100;
}

export function gradeMcqAnswers(
  questions: readonly QuestionRecord[],
  options: readonly QuestionOptionRecord[],
  answers: SubmitTestInput["answers"]
): {
  autoGradedScore: number;
  maxScore: number;
  normalizedAnswers: readonly {
    awardedMarks: number;
    isCorrect: boolean;
    questionId: string;
    selectedOptionId: string;
  }[];
} {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const optionMap = new Map(options.map((option) => [option.id, option]));
  let autoGradedScore = 0;

  const normalizedAnswers = answers.map((answer) => {
    const question = questionMap.get(answer.questionId);

    if (!question) {
      throw new ValidationError("Answer references an invalid question", [
        {
          field: "answers",
          message: "One or more answers do not belong to this test"
        }
      ]);
    }

    const selectedOption = answer.selectedOptionId ? optionMap.get(answer.selectedOptionId) : null;

    if (!selectedOption || selectedOption.questionId !== question.id) {
      throw new ValidationError("Choose a valid option", [
        {
          field: "answers",
          message: "Selected option does not belong to the question"
        }
      ]);
    }

    const awardedMarks = selectedOption.isCorrect ? question.marks : 0;
    autoGradedScore += awardedMarks;

    return {
      awardedMarks,
      isCorrect: selectedOption.isCorrect,
      questionId: question.id,
      selectedOptionId: selectedOption.id
    };
  });

  return {
    autoGradedScore: roundMarks(autoGradedScore),
    maxScore: totalMarks(questions),
    normalizedAnswers
  };
}
