import { z } from "zod";

const idSchema = z.string().uuid();
const optionalTextSchema = z.string().trim().optional().or(z.literal(""));

export const testTypeSchema = z.enum(["MCQ", "WRITTEN", "MIXED"]);
export const questionTypeSchema = z.enum(["MCQ", "WRITTEN"]);
export const testSubmissionStatusSchema = z.enum(["STARTED", "SUBMITTED", "GRADED"]);

export const testIdParamsSchema = z.object({
  id: idSchema
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
  durationInMinutes: z.number().int().positive().max(24 * 60).optional(),
  isPublished: z.boolean().default(false),
  passingScore: z.number().int().min(0).max(10000).optional(),
  title: z.string().trim().min(1).max(255),
  type: testTypeSchema
});

export const updateTestSchema = z
  .object({
    description: optionalTextSchema.optional(),
    durationInMinutes: z.number().int().positive().max(24 * 60).optional(),
    isPublished: z.boolean().optional(),
    passingScore: z.number().int().min(0).max(10000).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    type: testTypeSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

const questionOptionSchema = z.object({
  id: idSchema.optional(),
  isCorrect: z.boolean().default(false),
  optionText: z.string().trim().min(1).max(2000)
});

export const createQuestionSchema = z
  .object({
    expectedAnswer: optionalTextSchema,
    marks: z.number().int().positive().max(100),
    options: z.array(questionOptionSchema).max(8).optional(),
    questionText: z.string().trim().min(1).max(6000),
    type: questionTypeSchema
  })
  .superRefine((value, context) => {
    if (value.type === "MCQ") {
      const options = value.options ?? [];

      if (options.length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ questions need at least 2 options",
          path: ["options"]
        });
      }

      if (!options.some((option) => option.isCorrect)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mark at least one correct option",
          path: ["options"]
        });
      }
    }
  });

export const updateQuestionSchema = z
  .object({
    expectedAnswer: optionalTextSchema.optional(),
    marks: z.number().int().positive().max(100).optional(),
    options: z.array(questionOptionSchema).max(8).optional(),
    questionText: z.string().trim().min(1).max(6000).optional(),
    type: questionTypeSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

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
  selectedOptionId: idSchema.optional(),
  writtenAnswer: optionalTextSchema.optional()
});

export const saveSubmissionAnswersSchema = z.object({
  answers: z.array(submissionAnswerInputSchema).max(200)
});

export const submitTestSchema = z.object({
  answers: z.array(submissionAnswerInputSchema).max(200)
});

export const gradeSubmissionSchema = z.object({
  answers: z.array(
    z.object({
      answerId: idSchema,
      awardedMarks: z.number().int().min(0).max(100)
    })
  ),
  feedback: optionalTextSchema
});

export type TestType = z.infer<typeof testTypeSchema>;
export type QuestionType = z.infer<typeof questionTypeSchema>;
export type TestSubmissionStatus = z.infer<typeof testSubmissionStatusSchema>;
