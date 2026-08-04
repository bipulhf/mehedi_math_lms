import type { UserRole } from "@genex/shared";
import type { z } from "zod";
import type {
  createQuestionSchema,
  createTestSchema,
  gradeSubmissionSchema,
  reorderCourseItemsSchema,
  reorderQuestionsSchema,
  saveSubmissionAnswersSchema,
  submitTestSchema,
  updateQuestionSchema,
  updateTestSchema
} from "@genex/shared";

import type { ContentRepository } from "@/repositories/content-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { TestRepository } from "@/repositories/test-repository";
import type { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import { validateQuestionAgainstTest, validateQuestionInput } from "@/services/assessment-grading";
import {
  type AssessmentOption,
  type AssessmentQuestion,
  type AssessmentTestDetail,
  type AssessmentChapterSummary,
  type AssessmentTestSummary,
  type SubmissionDetail,
  type SubmissionSummary
} from "@/services/assessment-views";
import { normalizeOptionalHtml, sanitizeHtml } from "@/lib/html";
import type { ProgressService } from "@/services/progress-service";
import { TestSubmissionService } from "@/services/test-submission-service";
import { ValidationError } from "@/utils/errors";

export type {
  AssessmentChapterSummary,
  AssessmentOption,
  AssessmentQuestion,
  AssessmentTestDetail,
  AssessmentTestSummary,
  SubmissionAnswerView,
  SubmissionDetail,
  SubmissionSummary
} from "@/services/assessment-views";

type CreateTestInput = z.infer<typeof createTestSchema>;
type UpdateTestInput = z.infer<typeof updateTestSchema>;
type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
type ReorderCourseItemsInput = z.infer<typeof reorderCourseItemsSchema>;
type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
type SubmitTestInput = z.infer<typeof submitTestSchema>;
type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

/**
 * Test and question authoring. Taking a test, autosaving answers, submitting,
 * and grading live in `TestSubmissionService` — a distinct responsibility,
 * composed here so the public API this class exposes is unchanged.
 */
export class TestService {
  private readonly submissions: TestSubmissionService;

  public constructor(
    private readonly testRepository: TestRepository,
    private readonly contentRepository: ContentRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly access: AssessmentAccessGuards,
    private readonly progressService: ProgressService
  ) {
    this.submissions = new TestSubmissionService(
      testRepository,
      contentRepository,
      enrollmentRepository,
      access,
      progressService
    );
  }

  private attemptsRemaining(
    maxAttempts: number | null,
    attemptsUsed: number | null
  ): number | null {
    if (maxAttempts === null || attemptsUsed === null) {
      return null;
    }

    return Math.max(0, maxAttempts - attemptsUsed);
  }

  private async loadTestQuestions(
    testId: string,
    includeAnswers = false
  ): Promise<{
    questions: readonly AssessmentQuestion[];
    totalMarks: number;
  }> {
    const questionRecords = await this.testRepository.listQuestionsByTestId(testId);
    const questionIds = questionRecords.map((question) => question.id);
    const optionRecords = await this.testRepository.listOptionsByQuestionIds(questionIds);
    const optionMap = new Map<string, AssessmentOption[]>();

    for (const option of optionRecords) {
      const currentOptions = optionMap.get(option.questionId) ?? [];
      currentOptions.push({
        id: option.id,
        isCorrect: includeAnswers ? option.isCorrect : null,
        optionText: option.optionText,
        sortOrder: option.sortOrder
      });
      optionMap.set(option.questionId, currentOptions);
    }

    const questions = questionRecords.map((question) => ({
      expectedAnswer: includeAnswers ? question.expectedAnswer : null,
      id: question.id,
      marks: question.marks,
      options: optionMap.get(question.id) ?? [],
      questionText: question.questionText,
      sortOrder: question.sortOrder,
      type: question.type
    }));

    return {
      questions,
      totalMarks: questions.reduce((sum, question) => sum + question.marks, 0)
    };
  }

  public async listCourseAssessments(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly AssessmentChapterSummary[]> {
    if (currentUserRole === "ADMIN" || currentUserRole === "TEACHER") {
      await this.access.requireManageableCourse(courseId, currentUserId, currentUserRole);
    } else {
      await this.access.requireStudentCourseAccess(courseId, currentUserId, currentUserRole);
    }

    const chapterRecords = await this.contentRepository.listCourseChapters(courseId);
    const chapters =
      currentUserRole === "STUDENT"
        ? chapterRecords.filter((chapter) => chapter.isPublished !== false)
        : chapterRecords;
    const chapterIds = chapters.map((chapter) => chapter.id);
    const testsByChapter = await this.testRepository.listTestsByChapterIds(chapterIds);
    const testIds = testsByChapter.map((test) => test.id);
    const questions = await this.testRepository.listQuestionsByTestIds(testIds);
    const questionCountMap = new Map<string, number>();
    const totalMarksMap = new Map<string, number>();

    for (const question of questions) {
      questionCountMap.set(question.testId, (questionCountMap.get(question.testId) ?? 0) + 1);
      totalMarksMap.set(
        question.testId,
        (totalMarksMap.get(question.testId) ?? 0) + question.marks
      );
    }

    const attemptCounts =
      currentUserRole === "STUDENT"
        ? await this.testRepository.countCompletedSubmissionsByTestIds(testIds, currentUserId)
        : new Map<string, number>();

    const testsMap = new Map<string, AssessmentTestSummary[]>();
    for (const test of testsByChapter) {
      if (currentUserRole === "STUDENT" && !test.isPublished) {
        continue;
      }

      const attemptsUsed = currentUserRole === "STUDENT" ? (attemptCounts.get(test.id) ?? 0) : null;
      const chapterTests = testsMap.get(test.chapterId) ?? [];
      chapterTests.push({
        attemptsRemaining: this.attemptsRemaining(test.maxAttempts, attemptsUsed),
        attemptsUsed,
        chapterId: test.chapterId,
        description: test.description,
        durationInMinutes: test.durationInMinutes,
        id: test.id,
        isPublished: test.isPublished,
        lockAnswerOnSelect: test.lockAnswerOnSelect,
        maxAttempts: test.maxAttempts,
        passingScore: test.passingScore,
        questionCount: questionCountMap.get(test.id) ?? 0,
        sortOrder: test.sortOrder,
        title: test.title,
        totalMarks: totalMarksMap.get(test.id) ?? 0,
        type: test.type
      });
      testsMap.set(test.chapterId, chapterTests);
    }

    return chapters.map((chapter) => ({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      tests: testsMap.get(chapter.id) ?? []
    }));
  }

  public async createTest(
    chapterId: string,
    input: CreateTestInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<AssessmentTestSummary> {
    await this.access.requireManageableChapter(chapterId, currentUserId, currentUserRole);
    const existingTests = await this.testRepository.listTestsByChapterId(chapterId);
    const record = await this.testRepository.createTest({
      chapterId,
      description: normalizeOptionalHtml(input.description),
      durationInMinutes: input.durationInMinutes ?? null,
      isPublished: input.isPublished,
      lockAnswerOnSelect: input.lockAnswerOnSelect,
      maxAttempts: input.maxAttempts ?? null,
      passingScore: input.passingScore ?? null,
      sortOrder: existingTests.length,
      title: input.title.trim(),
      type: input.type
    });

    return {
      attemptsRemaining: null,
      attemptsUsed: null,
      chapterId: record.chapterId,
      description: record.description,
      durationInMinutes: record.durationInMinutes,
      id: record.id,
      isPublished: record.isPublished,
      lockAnswerOnSelect: record.lockAnswerOnSelect,
      maxAttempts: record.maxAttempts,
      passingScore: record.passingScore,
      questionCount: 0,
      sortOrder: record.sortOrder,
      title: record.title,
      totalMarks: 0,
      type: record.type
    };
  }

  public async updateTest(
    testId: string,
    input: UpdateTestInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<AssessmentTestSummary> {
    const test = await this.access.requireManageableTest(testId, currentUserId, currentUserRole);
    const nextType = input.type ?? test.type;
    const existingQuestions = await this.testRepository.listQuestionsByTestId(testId);

    for (const question of existingQuestions) {
      validateQuestionAgainstTest(nextType, question.type);
    }

    const record = await this.testRepository.updateTest(testId, {
      description:
        input.description !== undefined ? normalizeOptionalHtml(input.description) : undefined,
      durationInMinutes: input.durationInMinutes ?? undefined,
      isPublished: input.isPublished,
      lockAnswerOnSelect: input.lockAnswerOnSelect,
      // Not `?? undefined` — `maxAttempts: null` is an explicit "uncap this
      // test," and coalescing would turn it into `undefined`, which Drizzle's
      // `.set()` silently skips instead of writing NULL.
      maxAttempts: input.maxAttempts,
      passingScore: input.passingScore ?? undefined,
      title: input.title?.trim(),
      type: input.type
    });

    return {
      attemptsRemaining: null,
      attemptsUsed: null,
      chapterId: record.chapterId,
      description: record.description,
      durationInMinutes: record.durationInMinutes,
      id: record.id,
      isPublished: record.isPublished,
      lockAnswerOnSelect: record.lockAnswerOnSelect,
      maxAttempts: record.maxAttempts,
      passingScore: record.passingScore,
      questionCount: existingQuestions.length,
      sortOrder: record.sortOrder,
      title: record.title,
      totalMarks: existingQuestions.reduce((sum, question) => sum + question.marks, 0),
      type: record.type
    };
  }

  public async deleteTest(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    await this.access.requireManageableTest(testId, currentUserId, currentUserRole);
    await this.testRepository.deleteTest(testId);

    return { id: testId };
  }

  public async getTestDetail(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    revealAnswers = false
  ): Promise<AssessmentTestDetail> {
    const test = await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);
    const includeAnswers =
      currentUserRole === "ADMIN" ||
      currentUserRole === "TEACHER" ||
      (revealAnswers &&
        currentUserRole === "STUDENT" &&
        ((await this.testRepository.countCompletedSubmissionsByTestIds([test.id], currentUserId)).get(
          test.id
        ) ?? 0) > 0);
    const { questions, totalMarks } = await this.loadTestQuestions(test.id, includeAnswers);
    const attemptsUsed =
      currentUserRole === "STUDENT"
        ? ((
            await this.testRepository.countCompletedSubmissionsByTestIds([test.id], currentUserId)
          ).get(test.id) ?? 0)
        : null;

    return {
      attemptsRemaining: this.attemptsRemaining(test.maxAttempts, attemptsUsed),
      attemptsUsed,
      chapterId: test.chapterId,
      description: test.description,
      durationInMinutes: test.durationInMinutes,
      id: test.id,
      isPublished: test.isPublished,
      lockAnswerOnSelect: test.lockAnswerOnSelect,
      maxAttempts: test.maxAttempts,
      passingScore: test.passingScore,
      questionCount: questions.length,
      questions,
      sortOrder: test.sortOrder,
      title: test.title,
      totalMarks,
      type: test.type
    };
  }

  public async createQuestion(
    testId: string,
    input: CreateQuestionInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<AssessmentQuestion> {
    const test = await this.access.requireManageableTest(testId, currentUserId, currentUserRole);
    validateQuestionAgainstTest(test.type, input.type);
    validateQuestionInput(input);

    const existingQuestions = await this.testRepository.listQuestionsByTestId(testId);
    const question = await this.testRepository.createQuestion({
      expectedAnswer: normalizeOptionalHtml(input.expectedAnswer),
      marks: input.marks,
      options: (input.options ?? []).map((option) => ({
        isCorrect: option.isCorrect,
        optionText: option.optionText.trim()
      })),
      questionText: sanitizeHtml(input.questionText.trim()),
      sortOrder: existingQuestions.length,
      testId,
      type: input.type
    });
    const optionRecords = await this.testRepository.listOptionsByQuestionIds([question.id]);

    return {
      expectedAnswer: question.expectedAnswer,
      id: question.id,
      marks: question.marks,
      options: optionRecords.map((option) => ({
        id: option.id,
        isCorrect: option.isCorrect,
        optionText: option.optionText,
        sortOrder: option.sortOrder
      })),
      questionText: question.questionText,
      sortOrder: question.sortOrder,
      type: question.type
    };
  }

  public async updateQuestion(
    questionId: string,
    input: UpdateQuestionInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<AssessmentQuestion> {
    const question = await this.access.requireManageableQuestion(
      questionId,
      currentUserId,
      currentUserRole
    );
    const nextType = input.type ?? question.type;
    validateQuestionAgainstTest(question.test.type, nextType);
    validateQuestionInput({
      expectedAnswer: input.expectedAnswer ?? question.expectedAnswer ?? "",
      marks: input.marks ?? question.marks,
      options:
        input.options ??
        (await this.testRepository.listOptionsByQuestionIds([questionId])).map((option) => ({
          isCorrect: option.isCorrect,
          optionText: option.optionText
        })),
      questionText: input.questionText ?? question.questionText,
      type: nextType
    });

    const updatedQuestion = await this.testRepository.updateQuestion(questionId, {
      expectedAnswer:
        input.expectedAnswer !== undefined
          ? normalizeOptionalHtml(input.expectedAnswer)
          : undefined,
      marks: input.marks,
      options: input.options?.map((option) => ({
        isCorrect: option.isCorrect,
        optionText: option.optionText.trim()
      })),
      questionText: input.questionText === undefined ? undefined : sanitizeHtml(input.questionText.trim()),
      type: input.type
    });
    const optionRecords = await this.testRepository.listOptionsByQuestionIds([questionId]);

    return {
      expectedAnswer: updatedQuestion.expectedAnswer,
      id: updatedQuestion.id,
      marks: updatedQuestion.marks,
      options: optionRecords.map((option) => ({
        id: option.id,
        isCorrect: option.isCorrect,
        optionText: option.optionText,
        sortOrder: option.sortOrder
      })),
      questionText: updatedQuestion.questionText,
      sortOrder: updatedQuestion.sortOrder,
      type: updatedQuestion.type
    };
  }

  public async deleteQuestion(
    questionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    await this.access.requireManageableQuestion(questionId, currentUserId, currentUserRole);
    await this.testRepository.deleteQuestion(questionId);

    return { id: questionId };
  }

  public async reorderCourseItems(
    chapterId: string,
    input: ReorderCourseItemsInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ chapterId: string }> {
    const chapter = await this.access.requireManageableChapter(
      chapterId,
      currentUserId,
      currentUserRole
    );
    const chapters = await this.contentRepository.listCourseChapters(chapter.courseId);
    const chapterIds = chapters.map((item) => item.id);
    const validChapterIds = new Set(chapterIds);
    const lectures = await this.contentRepository.listLecturesByChapterIds(chapterIds);
    const tests = await this.testRepository.listTestsByChapterIds(chapterIds);
    const lectureIds = new Set(lectures.map((lecture) => lecture.id));
    const testIds = new Set(tests.map((test) => test.id));

    const isValid = input.items.every(
      (item) =>
        validChapterIds.has(item.chapterId) &&
        (item.kind === "LECTURE" ? lectureIds.has(item.id) : testIds.has(item.id))
    );

    if (!isValid) {
      throw new ValidationError("Course item reorder payload is invalid", [
        {
          field: "items",
          message: "Items can only be moved inside this course"
        }
      ]);
    }

    await this.contentRepository.reorderLectures(
      input.items
        .filter((item) => item.kind === "LECTURE")
        .map((item) => ({
          chapterId: item.chapterId,
          id: item.id,
          sortOrder: item.sortOrder
        }))
    );
    await this.testRepository.reorderTests(
      input.items
        .filter((item) => item.kind === "EXAM")
        .map((item) => ({
          chapterId: item.chapterId,
          id: item.id,
          sortOrder: item.sortOrder
        }))
    );

    return { chapterId };
  }

  public async reorderQuestions(
    testId: string,
    input: ReorderQuestionsInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<AssessmentTestDetail> {
    await this.access.requireManageableTest(testId, currentUserId, currentUserRole);
    const questions = await this.testRepository.listQuestionsByTestId(testId);
    const questionIds = new Set(questions.map((question) => question.id));

    if (!input.items.every((item) => questionIds.has(item.id))) {
      throw new ValidationError("Question reorder payload is invalid", [
        {
          field: "items",
          message: "Question list contains an invalid item"
        }
      ]);
    }

    await this.testRepository.reorderQuestions(input.items);

    return this.getTestDetail(testId, currentUserId, currentUserRole);
  }

  public async startSubmission(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    return this.submissions.startSubmission(testId, currentUserId, currentUserRole);
  }

  public async saveSubmissionAnswers(
    submissionId: string,
    input: SaveSubmissionAnswersInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    return this.submissions.saveSubmissionAnswers(
      submissionId,
      input,
      currentUserId,
      currentUserRole
    );
  }

  public async submitTest(
    testId: string,
    input: SubmitTestInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    return this.submissions.submitTest(testId, input, currentUserId, currentUserRole);
  }

  public async listSubmissions(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly SubmissionSummary[]> {
    return this.submissions.listSubmissions(testId, currentUserId, currentUserRole);
  }

  public async getSubmissionDetail(
    submissionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    return this.submissions.getSubmissionDetail(submissionId, currentUserId, currentUserRole);
  }

  public async gradeSubmission(
    submissionId: string,
    input: GradeSubmissionInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    return this.submissions.gradeSubmission(submissionId, input, currentUserId, currentUserRole);
  }
}
