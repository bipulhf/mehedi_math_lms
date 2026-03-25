import {
  and,
  asc,
  db,
  desc,
  eq,
  inArray,
  questionOptions,
  submissionAnswers,
  testQuestions,
  testSubmissions,
  tests,
  users
} from "@mma/db";
import type {
  QuestionType,
  TestSubmissionStatus,
  TestType
} from "@mma/shared";

export interface TestRecord {
  chapterId: string;
  createdAt: Date;
  description: string | null;
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
  passingScore: number | null;
  sortOrder: number;
  title: string;
  type: TestType;
  updatedAt: Date;
}

export interface QuestionRecord {
  createdAt: Date;
  expectedAnswer: string | null;
  id: string;
  marks: number;
  questionText: string;
  sortOrder: number;
  testId: string;
  type: QuestionType;
  updatedAt: Date;
}

export interface QuestionOptionRecord {
  createdAt: Date;
  id: string;
  isCorrect: boolean;
  optionText: string;
  questionId: string;
  sortOrder: number;
  updatedAt: Date;
}

export interface SubmissionRecord {
  createdAt: Date;
  feedback: string | null;
  gradedAt: Date | null;
  gradedById: string | null;
  id: string;
  maxScore: number | null;
  score: number | null;
  startedAt: Date | null;
  status: TestSubmissionStatus;
  submittedAt: Date | null;
  testId: string;
  updatedAt: Date;
  userId: string;
}

export interface SubmissionSummaryRecord extends SubmissionRecord {
  userEmail: string;
  userName: string;
}

export interface SubmissionAnswerRecord {
  awardedMarks: number | null;
  createdAt: Date;
  id: string;
  isCorrect: boolean | null;
  questionId: string;
  selectedOptionId: string | null;
  submissionId: string;
  updatedAt: Date;
  writtenAnswer: string | null;
}

interface CreateTestInput {
  chapterId: string;
  description: string | null;
  durationInMinutes: number | null;
  isPublished: boolean;
  passingScore: number | null;
  sortOrder: number;
  title: string;
  type: TestType;
}

interface UpdateTestInput {
  description?: string | null | undefined;
  durationInMinutes?: number | null | undefined;
  isPublished?: boolean | undefined;
  passingScore?: number | null | undefined;
  title?: string | undefined;
  type?: TestType | undefined;
}

interface SaveQuestionInput {
  expectedAnswer: string | null;
  marks: number;
  options: readonly {
    isCorrect: boolean;
    optionText: string;
  }[];
  questionText: string;
  sortOrder: number;
  testId: string;
  type: QuestionType;
}

interface UpdateQuestionInput {
  expectedAnswer?: string | null | undefined;
  marks?: number | undefined;
  options?: readonly {
    isCorrect: boolean;
    optionText: string;
  }[] | undefined;
  questionText?: string | undefined;
  sortOrder?: number | undefined;
  type?: QuestionType | undefined;
}

interface ReplaceSubmissionAnswersInput {
  submissionId: string;
  answers: readonly {
    awardedMarks?: number | null | undefined;
    isCorrect?: boolean | null | undefined;
    questionId: string;
    selectedOptionId?: string | null | undefined;
    writtenAnswer?: string | null | undefined;
  }[];
}

interface UpdateSubmissionInput {
  feedback?: string | null | undefined;
  gradedAt?: Date | null | undefined;
  gradedById?: string | null | undefined;
  maxScore?: number | null | undefined;
  score?: number | null | undefined;
  startedAt?: Date | null | undefined;
  status?: TestSubmissionStatus | undefined;
  submittedAt?: Date | null | undefined;
}

function mapTestRecord(record: typeof tests.$inferSelect): TestRecord {
  return record;
}

function mapQuestionRecord(record: typeof testQuestions.$inferSelect): QuestionRecord {
  return {
    createdAt: record.createdAt,
    expectedAnswer: record.expectedAnswer,
    id: record.id,
    marks: record.marks,
    questionText: record.questionText,
    sortOrder: record.sortOrder,
    testId: record.testId,
    type: record.type,
    updatedAt: record.updatedAt
  };
}

function mapQuestionOptionRecord(record: typeof questionOptions.$inferSelect): QuestionOptionRecord {
  return record;
}

function mapSubmissionRecord(record: typeof testSubmissions.$inferSelect): SubmissionRecord {
  return record;
}

function mapSubmissionAnswerRecord(record: typeof submissionAnswers.$inferSelect): SubmissionAnswerRecord {
  return record;
}

export class TestRepository {
  public async listTestsByChapterIds(chapterIds: readonly string[]): Promise<readonly TestRecord[]> {
    if (chapterIds.length === 0) {
      return [];
    }

    const rows = await db
      .select()
      .from(tests)
      .where(inArray(tests.chapterId, [...chapterIds]))
      .orderBy(asc(tests.chapterId), asc(tests.sortOrder), asc(tests.createdAt));

    return rows.map(mapTestRecord);
  }

  public async listTestsByChapterId(chapterId: string): Promise<readonly TestRecord[]> {
    const rows = await db
      .select()
      .from(tests)
      .where(eq(tests.chapterId, chapterId))
      .orderBy(asc(tests.sortOrder), asc(tests.createdAt));

    return rows.map(mapTestRecord);
  }

  public async findTestById(id: string): Promise<TestRecord | null> {
    const [record] = await db.select().from(tests).where(eq(tests.id, id)).limit(1);

    return record ? mapTestRecord(record) : null;
  }

  public async createTest(input: CreateTestInput): Promise<TestRecord> {
    const [record] = await db.insert(tests).values(input).returning();

    if (!record) {
      throw new Error("Failed to create test");
    }

    return mapTestRecord(record);
  }

  public async updateTest(id: string, input: UpdateTestInput): Promise<TestRecord> {
    const [record] = await db
      .update(tests)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(tests.id, id))
      .returning();

    if (!record) {
      throw new Error("Failed to update test");
    }

    return mapTestRecord(record);
  }

  public async deleteTest(id: string): Promise<void> {
    await db.delete(tests).where(eq(tests.id, id));
  }

  public async listQuestionsByTestIds(testIds: readonly string[]): Promise<readonly QuestionRecord[]> {
    if (testIds.length === 0) {
      return [];
    }

    const rows = await db
      .select()
      .from(testQuestions)
      .where(inArray(testQuestions.testId, [...testIds]))
      .orderBy(asc(testQuestions.testId), asc(testQuestions.sortOrder), asc(testQuestions.createdAt));

    return rows.map(mapQuestionRecord);
  }

  public async listQuestionsByTestId(testId: string): Promise<readonly QuestionRecord[]> {
    const rows = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.testId, testId))
      .orderBy(asc(testQuestions.sortOrder), asc(testQuestions.createdAt));

    return rows.map(mapQuestionRecord);
  }

  public async findQuestionById(id: string): Promise<QuestionRecord | null> {
    const [record] = await db.select().from(testQuestions).where(eq(testQuestions.id, id)).limit(1);

    return record ? mapQuestionRecord(record) : null;
  }

  public async createQuestion(input: SaveQuestionInput): Promise<QuestionRecord> {
    const question = await db.transaction(async (transaction) => {
      const [questionRecord] = await transaction
        .insert(testQuestions)
        .values({
          expectedAnswer: input.expectedAnswer,
          marks: input.marks,
          questionText: input.questionText,
          sortOrder: input.sortOrder,
          testId: input.testId,
          type: input.type
        })
        .returning();

      if (!questionRecord) {
        throw new Error("Failed to create question");
      }

      if (input.options.length > 0) {
        await transaction.insert(questionOptions).values(
          input.options.map((option, index) => ({
            isCorrect: option.isCorrect,
            optionText: option.optionText,
            questionId: questionRecord.id,
            sortOrder: index
          }))
        );
      }

      return questionRecord;
    });

    return mapQuestionRecord(question);
  }

  public async updateQuestion(id: string, input: UpdateQuestionInput): Promise<QuestionRecord> {
    const question = await db.transaction(async (transaction) => {
      const [questionRecord] = await transaction
        .update(testQuestions)
        .set({
          expectedAnswer: input.expectedAnswer,
          marks: input.marks,
          questionText: input.questionText,
          sortOrder: input.sortOrder,
          type: input.type,
          updatedAt: new Date()
        })
        .where(eq(testQuestions.id, id))
        .returning();

      if (!questionRecord) {
        throw new Error("Failed to update question");
      }

      if (input.options) {
        await transaction.delete(questionOptions).where(eq(questionOptions.questionId, id));

        if (input.options.length > 0) {
          await transaction.insert(questionOptions).values(
            input.options.map((option, index) => ({
              isCorrect: option.isCorrect,
              optionText: option.optionText,
              questionId: id,
              sortOrder: index
            }))
          );
        }
      }

      return questionRecord;
    });

    return mapQuestionRecord(question);
  }

  public async deleteQuestion(id: string): Promise<void> {
    await db.delete(testQuestions).where(eq(testQuestions.id, id));
  }

  public async reorderQuestions(
    items: readonly {
      id: string;
      sortOrder: number;
    }[]
  ): Promise<void> {
    await db.transaction(async (transaction) => {
      for (const item of items) {
        await transaction
          .update(testQuestions)
          .set({
            sortOrder: item.sortOrder,
            updatedAt: new Date()
          })
          .where(eq(testQuestions.id, item.id));
      }
    });
  }

  public async listOptionsByQuestionIds(questionIds: readonly string[]): Promise<readonly QuestionOptionRecord[]> {
    if (questionIds.length === 0) {
      return [];
    }

    const rows = await db
      .select()
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, [...questionIds]))
      .orderBy(asc(questionOptions.questionId), asc(questionOptions.sortOrder), asc(questionOptions.createdAt));

    return rows.map(mapQuestionOptionRecord);
  }

  public async createSubmission(testId: string, userId: string): Promise<SubmissionRecord> {
    const [record] = await db
      .insert(testSubmissions)
      .values({
        startedAt: new Date(),
        status: "STARTED",
        testId,
        userId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create submission");
    }

    return mapSubmissionRecord(record);
  }

  public async findLatestSubmissionByTestAndUser(
    testId: string,
    userId: string
  ): Promise<SubmissionRecord | null> {
    const [record] = await db
      .select()
      .from(testSubmissions)
      .where(and(eq(testSubmissions.testId, testId), eq(testSubmissions.userId, userId)))
      .orderBy(desc(testSubmissions.createdAt))
      .limit(1);

    return record ? mapSubmissionRecord(record) : null;
  }

  public async findSubmissionById(id: string): Promise<SubmissionRecord | null> {
    const [record] = await db.select().from(testSubmissions).where(eq(testSubmissions.id, id)).limit(1);

    return record ? mapSubmissionRecord(record) : null;
  }

  public async updateSubmission(id: string, input: UpdateSubmissionInput): Promise<SubmissionRecord> {
    const [record] = await db
      .update(testSubmissions)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(testSubmissions.id, id))
      .returning();

    if (!record) {
      throw new Error("Failed to update submission");
    }

    return mapSubmissionRecord(record);
  }

  public async replaceSubmissionAnswers(input: ReplaceSubmissionAnswersInput): Promise<void> {
    await db.transaction(async (transaction) => {
      await transaction
        .delete(submissionAnswers)
        .where(eq(submissionAnswers.submissionId, input.submissionId));

      if (input.answers.length === 0) {
        return;
      }

      await transaction.insert(submissionAnswers).values(
        input.answers.map((answer) => ({
          awardedMarks: answer.awardedMarks,
          isCorrect: answer.isCorrect,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
          submissionId: input.submissionId,
          writtenAnswer: answer.writtenAnswer
        }))
      );
    });
  }

  public async updateSubmissionAnswer(
    id: string,
    input: {
      awardedMarks?: number | null | undefined;
      isCorrect?: boolean | null | undefined;
    }
  ): Promise<SubmissionAnswerRecord> {
    const [record] = await db
      .update(submissionAnswers)
      .set({
        awardedMarks: input.awardedMarks,
        isCorrect: input.isCorrect,
        updatedAt: new Date()
      })
      .where(eq(submissionAnswers.id, id))
      .returning();

    if (!record) {
      throw new Error("Failed to update submission answer");
    }

    return mapSubmissionAnswerRecord(record);
  }

  public async listAnswersBySubmissionIds(
    submissionIds: readonly string[]
  ): Promise<readonly SubmissionAnswerRecord[]> {
    if (submissionIds.length === 0) {
      return [];
    }

    const rows = await db
      .select()
      .from(submissionAnswers)
      .where(inArray(submissionAnswers.submissionId, [...submissionIds]))
      .orderBy(asc(submissionAnswers.submissionId), asc(submissionAnswers.createdAt));

    return rows.map(mapSubmissionAnswerRecord);
  }

  public async listSubmissionsByTestId(testId: string): Promise<readonly SubmissionSummaryRecord[]> {
    const rows = await db
      .select({
        createdAt: testSubmissions.createdAt,
        feedback: testSubmissions.feedback,
        gradedAt: testSubmissions.gradedAt,
        gradedById: testSubmissions.gradedById,
        id: testSubmissions.id,
        maxScore: testSubmissions.maxScore,
        score: testSubmissions.score,
        startedAt: testSubmissions.startedAt,
        status: testSubmissions.status,
        submittedAt: testSubmissions.submittedAt,
        testId: testSubmissions.testId,
        updatedAt: testSubmissions.updatedAt,
        userEmail: users.email,
        userId: testSubmissions.userId,
        userName: users.name
      })
      .from(testSubmissions)
      .innerJoin(users, eq(users.id, testSubmissions.userId))
      .where(eq(testSubmissions.testId, testId))
      .orderBy(desc(testSubmissions.updatedAt));

    return rows;
  }
}
