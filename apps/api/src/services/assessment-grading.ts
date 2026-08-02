import type {
  createQuestionSchema,
  saveSubmissionAnswersSchema,
  submitTestSchema,
  updateQuestionSchema
} from "@mma/shared";
import type { z } from "zod";

import type { QuestionOptionRecord, QuestionRecord, TestRecord } from "@/repositories/test-repository";
import type { AssessmentQuestion } from "@/services/assessment-views";
import { ValidationError } from "@/utils/errors";

type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
type SubmitTestInput = z.infer<typeof submitTestSchema>;

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

/**
 * The scoring rules, as pure functions. MCQ answers grade themselves against
 * the option table; written answers come back unscored for a teacher to mark.
 */
export function validateQuestionAgainstTest(
  testType: TestRecord["type"],
  questionType: AssessmentQuestion["type"] | CreateQuestionInput["type"] | UpdateQuestionInput["type"]
): void {
  if (!questionType) {
    return;
  }

  if (testType === "MCQ" && questionType !== "MCQ") {
    throw new ValidationError("MCQ tests can only include MCQ questions", [
      {
        field: "type",
        message: "Question type must be MCQ"
      }
    ]);
  }

  if (testType === "WRITTEN" && questionType !== "WRITTEN") {
    throw new ValidationError("Written tests can only include written questions", [
      {
        field: "type",
        message: "Question type must be WRITTEN"
      }
    ]);
  }
}

export function validateQuestionInput(input: CreateQuestionInput | UpdateQuestionInput): void {
  const questionType = input.type;
  const options = input.options;

  if (questionType === "MCQ" && options) {
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
}

export function gradeAnswers(
  questions: readonly QuestionRecord[],
  options: readonly QuestionOptionRecord[],
  answers: SubmitTestInput["answers"] | SaveSubmissionAnswersInput["answers"]
): {
  autoGradedScore: number;
  hasWrittenQuestions: boolean;
  maxScore: number;
  normalizedAnswers: readonly {
    awardedMarks?: number | null | undefined;
    isCorrect?: boolean | null | undefined;
    questionId: string;
    selectedOptionId?: string | null | undefined;
    writtenAnswer?: string | null | undefined;
  }[];
} {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const optionMap = new Map(options.map((option) => [option.id, option]));
  let autoGradedScore = 0;
  let hasWrittenQuestions = false;

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

    if (question.type === "MCQ") {
      const selectedOption = answer.selectedOptionId
        ? optionMap.get(answer.selectedOptionId)
        : null;

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
        selectedOptionId: selectedOption.id,
        writtenAnswer: null
      };
    }

    hasWrittenQuestions = true;

    return {
      awardedMarks: null,
      isCorrect: null,
      questionId: question.id,
      selectedOptionId: null,
      writtenAnswer: normalizeOptionalString(answer.writtenAnswer)
    };
  });

  return {
    autoGradedScore,
    hasWrittenQuestions,
    maxScore: questions.reduce((sum, question) => sum + question.marks, 0),
    normalizedAnswers
  };
}
