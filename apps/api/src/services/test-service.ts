import type { UserRole } from "@genex/shared";
import type { z } from "zod";
import type {
  createQuestionSchema,
  createTestSchema,
  gradeSubmissionSchema,
  reorderQuestionsSchema,
  saveSubmissionAnswersSchema,
  submitTestSchema,
  updateQuestionSchema,
  updateTestSchema
} from "@genex/shared";

import type { ContentRepository } from "@/repositories/content-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { SubmissionSummaryRecord, TestRepository } from "@/repositories/test-repository";
import type { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import {
  gradeAnswers,
  validateQuestionAgainstTest,
  validateQuestionInput
} from "@/services/assessment-grading";
import {
  mapSubmissionDetail,
  mapSubmissionSummary,
  normalizeOptionalString,
  type AssessmentOption,
  type AssessmentQuestion,
  type AssessmentTestDetail,
  type AssessmentChapterSummary,
  type AssessmentTestSummary,
  type SubmissionDetail,
  type SubmissionSummary
} from "@/services/assessment-views";
import type { ProgressService } from "@/services/progress-service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

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
type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
type SubmitTestInput = z.infer<typeof submitTestSchema>;
type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

export class TestService {
  public constructor(
    private readonly testRepository: TestRepository,
    private readonly contentRepository: ContentRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly access: AssessmentAccessGuards,
    private readonly progressService: ProgressService
  ) {}

  /**
   * A graded submission can be the last thing a course was waiting on, so the
   * enrolment is re-evaluated here. For an Exam-Only Course this is the only
   * path to completion — it has no lectures to mark. ADR-0005.
   */
  private async promoteEnrollmentIfFinished(chapterId: string, userId: string): Promise<void> {
    const chapter = await this.contentRepository.findChapterById(chapterId);

    if (!chapter) {
      return;
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      chapter.courseId
    );

    if (!enrollment) {
      return;
    }

    await this.progressService.promoteIfFinished(chapter.courseId, enrollment);
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

    const chapters = await this.contentRepository.listCourseChapters(courseId);
    const chapterIds = chapters.map((chapter) => chapter.id);
    const testsByChapter = await this.testRepository.listTestsByChapterIds(chapterIds);
    const testIds = testsByChapter.map((test) => test.id);
    const questions = await this.testRepository.listQuestionsByTestIds(testIds);
    const questionCountMap = new Map<string, number>();
    const totalMarksMap = new Map<string, number>();

    for (const question of questions) {
      questionCountMap.set(question.testId, (questionCountMap.get(question.testId) ?? 0) + 1);
      totalMarksMap.set(question.testId, (totalMarksMap.get(question.testId) ?? 0) + question.marks);
    }

    const testsMap = new Map<string, AssessmentTestSummary[]>();
    for (const test of testsByChapter) {
      if (currentUserRole === "STUDENT" && !test.isPublished) {
        continue;
      }

      const chapterTests = testsMap.get(test.chapterId) ?? [];
      chapterTests.push({
        chapterId: test.chapterId,
        description: test.description,
        durationInMinutes: test.durationInMinutes,
        id: test.id,
        isPublished: test.isPublished,
        passingScore: test.passingScore,
        questionCount: questionCountMap.get(test.id) ?? 0,
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
      description: normalizeOptionalString(input.description),
      durationInMinutes: input.durationInMinutes ?? null,
      isPublished: input.isPublished,
      passingScore: input.passingScore ?? null,
      sortOrder: existingTests.length,
      title: input.title.trim(),
      type: input.type
    });

    return {
      chapterId: record.chapterId,
      description: record.description,
      durationInMinutes: record.durationInMinutes,
      id: record.id,
      isPublished: record.isPublished,
      passingScore: record.passingScore,
      questionCount: 0,
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
      description: input.description !== undefined ? normalizeOptionalString(input.description) : undefined,
      durationInMinutes: input.durationInMinutes ?? undefined,
      isPublished: input.isPublished,
      passingScore: input.passingScore ?? undefined,
      title: input.title?.trim(),
      type: input.type
    });

    return {
      chapterId: record.chapterId,
      description: record.description,
      durationInMinutes: record.durationInMinutes,
      id: record.id,
      isPublished: record.isPublished,
      passingScore: record.passingScore,
      questionCount: existingQuestions.length,
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
    currentUserRole: UserRole
  ): Promise<AssessmentTestDetail> {
    const test = await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);
    const includeAnswers = currentUserRole === "ADMIN" || currentUserRole === "TEACHER";
    const { questions, totalMarks } = await this.loadTestQuestions(test.id, includeAnswers);

    return {
      chapterId: test.chapterId,
      description: test.description,
      durationInMinutes: test.durationInMinutes,
      id: test.id,
      isPublished: test.isPublished,
      passingScore: test.passingScore,
      questionCount: questions.length,
      questions,
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
      expectedAnswer: normalizeOptionalString(input.expectedAnswer),
      marks: input.marks,
      options: (input.options ?? []).map((option) => ({
        isCorrect: option.isCorrect,
        optionText: option.optionText.trim()
      })),
      questionText: input.questionText.trim(),
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
    const question = await this.access.requireManageableQuestion(questionId, currentUserId, currentUserRole);
    const nextType = input.type ?? question.type;
    validateQuestionAgainstTest(question.test.type, nextType);
    validateQuestionInput({
      expectedAnswer: input.expectedAnswer ?? question.expectedAnswer ?? "",
      marks: input.marks ?? question.marks,
      options:
        input.options ??
        (
          await this.testRepository.listOptionsByQuestionIds([questionId])
        ).map((option) => ({
          isCorrect: option.isCorrect,
          optionText: option.optionText
        })),
      questionText: input.questionText ?? question.questionText,
      type: nextType
    });

    const updatedQuestion = await this.testRepository.updateQuestion(questionId, {
      expectedAnswer:
        input.expectedAnswer !== undefined
          ? normalizeOptionalString(input.expectedAnswer)
          : undefined,
      marks: input.marks,
      options: input.options?.map((option) => ({
        isCorrect: option.isCorrect,
        optionText: option.optionText.trim()
      })),
      questionText: input.questionText?.trim(),
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
    await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);

    let submission = await this.testRepository.findLatestSubmissionByTestAndUser(testId, currentUserId);

    if (!submission || submission.status !== "STARTED") {
      submission = await this.testRepository.createSubmission(testId, currentUserId);
    }

    const answers = await this.testRepository.listAnswersBySubmissionIds([submission.id]);

    return {
      answers: answers.map((answer) => ({
        awardedMarks: answer.awardedMarks,
        id: answer.id,
        isCorrect: answer.isCorrect,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        writtenAnswer: answer.writtenAnswer
      })),
      createdAt: submission.createdAt.toISOString(),
      feedback: submission.feedback,
      gradedAt: submission.gradedAt?.toISOString() ?? null,
      gradedById: submission.gradedById,
      id: submission.id,
      maxScore: submission.maxScore,
      score: submission.score,
      startedAt: submission.startedAt?.toISOString() ?? null,
      status: submission.status,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      testId: submission.testId,
      user: {
        email: "",
        id: currentUserId,
        name: ""
      }
    };
  }

  public async saveSubmissionAnswers(
    submissionId: string,
    input: SaveSubmissionAnswersInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    if (submission.userId !== currentUserId && currentUserRole !== "ADMIN") {
      throw new ForbiddenError("You do not have permission to edit this submission");
    }

    if (submission.status !== "STARTED") {
      throw new ValidationError("Only started submissions can be updated", [
        {
          field: "status",
          message: "This submission can no longer be edited"
        }
      ]);
    }

    const questions = await this.testRepository.listQuestionsByTestId(submission.testId);
    const options = await this.testRepository.listOptionsByQuestionIds(
      questions.map((question) => question.id)
    );
    const graded = gradeAnswers(questions, options, input.answers);
    await this.testRepository.replaceSubmissionAnswers({
      answers: graded.normalizedAnswers,
      submissionId
    });

    return this.startSubmission(submission.testId, currentUserId, currentUserRole);
  }

  public async submitTest(
    testId: string,
    input: SubmitTestInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);

    let submission = await this.testRepository.findLatestSubmissionByTestAndUser(testId, currentUserId);

    if (!submission || submission.status !== "STARTED") {
      submission = await this.testRepository.createSubmission(testId, currentUserId);
    }

    const questions = await this.testRepository.listQuestionsByTestId(testId);
    const options = await this.testRepository.listOptionsByQuestionIds(
      questions.map((question) => question.id)
    );
    const graded = gradeAnswers(questions, options, input.answers);
    await this.testRepository.replaceSubmissionAnswers({
      answers: graded.normalizedAnswers,
      submissionId: submission.id
    });

    const updatedSubmission = await this.testRepository.updateSubmission(submission.id, {
      maxScore: graded.maxScore,
      score: graded.autoGradedScore,
      status: graded.hasWrittenQuestions ? "SUBMITTED" : "GRADED",
      submittedAt: new Date()
    });
    if (updatedSubmission.status === "GRADED") {
      const test = await this.testRepository.findTestById(testId);

      if (test) {
        await this.promoteEnrollmentIfFinished(test.chapterId, currentUserId);
      }
    }

    const summaryRecord: SubmissionSummaryRecord = {
      ...updatedSubmission,
      userEmail: "",
      userName: ""
    };
    const savedAnswers = await this.testRepository.listAnswersBySubmissionIds([submission.id]);

    return mapSubmissionDetail(
      summaryRecord,
      savedAnswers.map((answer) => ({
        awardedMarks: answer.awardedMarks,
        id: answer.id,
        isCorrect: answer.isCorrect,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        writtenAnswer: answer.writtenAnswer
      }))
    );
  }

  public async listSubmissions(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly SubmissionSummary[]> {
    await this.access.requireManageableTest(testId, currentUserId, currentUserRole);
    const submissions = await this.testRepository.listSubmissionsByTestId(testId);

    return submissions.map(mapSubmissionSummary);
  }

  public async getSubmissionDetail(
    submissionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    const test = await this.testRepository.findTestById(submission.testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    if (currentUserRole === "ADMIN" || currentUserRole === "TEACHER") {
      await this.access.requireManageableTest(test.id, currentUserId, currentUserRole);
    } else if (submission.userId !== currentUserId) {
      throw new ForbiddenError("You do not have permission to view this submission");
    }

    const submissions = await this.testRepository.listSubmissionsByTestId(test.id);
    const summaryRecord = submissions.find((item) => item.id === submissionId);

    if (!summaryRecord) {
      throw new NotFoundError("Submission not found");
    }

    const answers = await this.testRepository.listAnswersBySubmissionIds([submissionId]);

    return mapSubmissionDetail(
      summaryRecord,
      answers.map((answer) => ({
        awardedMarks: answer.awardedMarks,
        id: answer.id,
        isCorrect: answer.isCorrect,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        writtenAnswer: answer.writtenAnswer
      }))
    );
  }

  public async gradeSubmission(
    submissionId: string,
    input: GradeSubmissionInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    await this.access.requireManageableTest(submission.testId, currentUserId, currentUserRole);

    const questions = await this.testRepository.listQuestionsByTestId(submission.testId);
    const questionMap = new Map(questions.map((question) => [question.id, question]));
    const answers = await this.testRepository.listAnswersBySubmissionIds([submissionId]);
    const answerMap = new Map(answers.map((answer) => [answer.id, answer]));

    for (const gradedAnswer of input.answers) {
      const answer = answerMap.get(gradedAnswer.answerId);

      if (!answer) {
        throw new ValidationError("Invalid grading payload", [
          {
            field: "answers",
            message: "Answer does not belong to the submission"
          }
        ]);
      }

      const question = questionMap.get(answer.questionId);

      if (!question || question.type !== "WRITTEN") {
        throw new ValidationError("Only written answers can be graded manually", [
          {
            field: "answers",
            message: "One or more graded answers are not written responses"
          }
        ]);
      }

      if (gradedAnswer.awardedMarks > question.marks) {
        throw new ValidationError("Awarded marks exceed question marks", [
          {
            field: "answers",
            message: "Awarded marks must be less than or equal to the question marks"
          }
        ]);
      }
    }

    for (const gradedAnswer of input.answers) {
      await this.testRepository.updateSubmissionAnswer(gradedAnswer.answerId, {
        awardedMarks: gradedAnswer.awardedMarks,
        isCorrect: null
      });
    }

    const refreshedAnswers = await this.testRepository.listAnswersBySubmissionIds([submissionId]);
    const score = refreshedAnswers.reduce((sum, answer) => sum + (answer.awardedMarks ?? 0), 0);
    const maxScore = questions.reduce((sum, question) => sum + question.marks, 0);
    const updatedSubmission = await this.testRepository.updateSubmission(submissionId, {
      feedback: input.feedback !== undefined ? normalizeOptionalString(input.feedback) : undefined,
      gradedAt: new Date(),
      gradedById: currentUserId,
      maxScore,
      score,
      status: "GRADED"
    });
    const gradedTest = await this.testRepository.findTestById(updatedSubmission.testId);

    if (gradedTest) {
      await this.promoteEnrollmentIfFinished(gradedTest.chapterId, updatedSubmission.userId);
    }

    const summaries = await this.testRepository.listSubmissionsByTestId(updatedSubmission.testId);
    const summaryRecord = summaries.find((item) => item.id === submissionId);

    if (!summaryRecord) {
      throw new NotFoundError("Submission not found");
    }

    return mapSubmissionDetail(
      summaryRecord,
      refreshedAnswers.map((answer) => ({
        awardedMarks: answer.awardedMarks,
        id: answer.id,
        isCorrect: answer.isCorrect,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        writtenAnswer: answer.writtenAnswer
      }))
    );
  }
}
