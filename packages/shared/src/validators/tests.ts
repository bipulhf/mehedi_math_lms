import { z } from "zod";

import { booleanQueryParamSchema, optionalRichTextSchema, richTextSchema } from "./common";
import { markingDocumentSchema } from "./marking";
import { refineMathBudget } from "./math";

const idSchema = z.string().uuid();

/**
 * The caps are generous because a maths question spends its length on LaTeX:
 * `$\frac{\partial^2 u}{\partial x^2}$` is 35 characters of budget and one
 * symbol on the page. `richTextLength` still counts plain characters -- an
 * author told "12000 characters" who saw a formula counted as four would find
 * the limit unknowable -- and `refineMathBudget` carries the ceilings that are
 * really about renderer cost. ADR-0014.
 */
const questionTextMax = 12000;
const optionalTextSchema = optionalRichTextSchema(questionTextMax).superRefine(refineMathBudget);

/**
 * Marks carry two decimal places -- half marks are ordinary in maths marking,
 * and a third of a mark is not. ADR-0008.
 */
function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

function marksSchema(max: number) {
  return z
    .number()
    .min(0)
    .max(max)
    .refine(hasAtMostTwoDecimals, "Marks can have at most two decimal places");
}

/** A Test is MCQ or written for its whole life. There is no mixed paper. */
export const testTypeSchema = z.enum(["MCQ", "WRITTEN"]);
export const testSubmissionStatusSchema = z.enum(["STARTED", "SUBMITTED", "GRADED"]);
export const markingReviewModeSchema = z.enum(["STUDENT", "QUESTION"]);

export const testIdParamsSchema = z.object({
  id: idSchema
});

export const testDetailQuerySchema = z.object({
  revealAnswers: booleanQueryParamSchema.optional()
});

export const questionIdParamsSchema = z.object({
  id: idSchema
});

export const submissionIdParamsSchema = z.object({
  id: idSchema
});

export const chapterTestParamsSchema = z.object({
  chapterId: idSchema
});

export const testQuestionParamsSchema = z.object({
  testId: idSchema
});

export const createTestSchema = z.object({
  description: optionalTextSchema,
  durationInMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .optional(),
  isPublished: z.boolean().default(false),
  lockAnswerOnSelect: z.boolean().default(false),
  maxAttempts: z.number().int().positive().max(1000).nullable().optional(),
  passingScore: marksSchema(10000).optional(),
  title: z.string().trim().min(1).max(255),
  type: testTypeSchema
});

export const updateTestSchema = z
  .object({
    description: optionalTextSchema.optional(),
    durationInMinutes: z
      .number()
      .int()
      .positive()
      .max(24 * 60)
      .optional(),
    isPublished: z.boolean().optional(),
    lockAnswerOnSelect: z.boolean().optional(),
    maxAttempts: z.number().int().positive().max(1000).nullable().optional(),
    passingScore: marksSchema(10000).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    type: testTypeSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const questionOptionSchema = z.object({
  id: idSchema.optional(),
  isCorrect: z.boolean().default(false),
  optionText: z.string().trim().min(1).max(4000).superRefine(refineMathBudget)
});

/**
 * A question carries no type of its own -- the Test's type decides whether
 * options or an Answer Script are expected, and the API validates the payload
 * against it. ADR-0008.
 */
export const createQuestionSchema = z.object({
  imageUploadIds: z.array(idSchema).max(8).optional(),
  markingGuide: optionalTextSchema,
  marks: marksSchema(100).refine((value) => value > 0, "Marks must be greater than zero"),
  options: z.array(questionOptionSchema).max(8).optional(),
  questionText: richTextSchema({ min: 1, max: questionTextMax }).superRefine(refineMathBudget)
});

export const updateQuestionSchema = z
  .object({
    imageUploadIds: z.array(idSchema).max(8).optional(),
    markingGuide: optionalTextSchema.optional(),
    marks: marksSchema(100)
      .refine((value) => value > 0, "Marks must be greater than zero")
      .optional(),
    options: z.array(questionOptionSchema).max(8).optional(),
    questionText: richTextSchema({ min: 1, max: questionTextMax })
      .superRefine(refineMathBudget)
      .optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const reorderCourseItemsSchema = z.object({
  items: z.array(
    z.object({
      chapterId: idSchema,
      id: idSchema,
      kind: z.enum(["EXAM", "LECTURE"]),
      sortOrder: z.number().int().min(0)
    })
  )
});

export const reorderQuestionsSchema = z.object({
  items: z.array(
    z.object({
      id: idSchema,
      sortOrder: z.number().int().min(0)
    })
  )
});

const submissionAnswerInputSchema = z.object({
  questionId: idSchema,
  selectedOptionId: idSchema.optional()
});

export const saveSubmissionAnswersSchema = z.object({
  answers: z.array(submissionAnswerInputSchema).max(200)
});

export const submitTestSchema = z.object({
  /**
   * MCQ selections. A written Test sends none: its Answer Scripts were uploaded
   * page by page while the student worked, and submitting only closes the
   * attempt.
   */
  answers: z.array(submissionAnswerInputSchema).max(200).default([])
});

/** Adds one photographed page to a question's Answer Script. */
export const addScriptPageSchema = z.object({
  questionId: idSchema,
  uploadId: idSchema
});

export const reorderScriptPagesSchema = z.object({
  pageIds: z.array(idSchema).min(1).max(30),
  questionId: idSchema
});

export const scriptPageIdParamsSchema = z.object({
  id: idSchema
});

export const submissionAnswerIdParamsSchema = z.object({
  id: idSchema
});

/** The teacher's Marking over one Script Page, replaced whole on every save. */
export const saveMarkingSchema = z.object({
  marking: markingDocumentSchema
});

export const setAnswerMarkSchema = z.object({
  awardedMarks: marksSchema(1000)
});

/**
 * Finishing one student's paper. Refused unless every attempted question has a
 * mark -- nobody is graded on a paper that was only half read.
 */
export const submitPaperSchema = z.object({
  feedback: optionalTextSchema
});

export const markingQueueQuerySchema = z.object({
  mode: markingReviewModeSchema.default("STUDENT"),
  questionId: idSchema.optional()
});

export type TestType = z.infer<typeof testTypeSchema>;
export type TestSubmissionStatus = z.infer<typeof testSubmissionStatusSchema>;
export type MarkingReviewMode = z.infer<typeof markingReviewModeSchema>;
