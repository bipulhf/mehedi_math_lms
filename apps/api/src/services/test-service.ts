import type { UserRole } from "@mma/shared";
import type { z } from "zod";
import {
  createQuestionSchema,
  createTestSchema,
  gradeSubmissionSchema,
  reorderQuestionsSchema,
  saveSubmissionAnswersSchema,
  submitTestSchema,
  updateQuestionSchema,
  updateTestSchema
} from "@mma/shared";

import { ContentRepository, type ChapterRecord } from "@/repositories/content-repository";
import { CourseRepository, type CourseRecord } from "@/repositories/course-repository";
import { EnrollmentRepository } from "@/repositories/enrollment-repository";
import {
  TestRepository,
  type QuestionOptionRecord,
  type QuestionRecord,
  type SubmissionAnswerRecord,
  type SubmissionRecord,
  type SubmissionSummaryRecord,
  type TestRecord
} from "@/repositories/test-repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type CreateTestInput = z.infer<typeof createTestSchema>;
type UpdateTestInput = z.infer<typeof updateTestSchema>;
type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
type SubmitTestInput = z.infer<typeof submitTestSchema>;
type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

export interface AssessmentOption {
  id: string;
  isCorrect: boolean | null;
  optionText: string;
  sortOrder: number;
}

export interface AssessmentQuestion {
  expectedAnswer: string | null;
  id: string;
  marks: number;
  options: readonly AssessmentOption[];
  questionText: string;
  sortOrder: number;
  type: "MCQ" | "WRITTEN";
}

export interface AssessmentTestSummary {
  chapterId: string;
  description: string | null;
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
  passingScore: number | null;
  questionCount: number;
  title: string;
  totalMarks: number;
  type: "MCQ" | "WRITTEN" | "MIXED";
}

export interface AssessmentChapterSummary {
  chapterId: string;
  chapterTitle: string;
  tests: readonly AssessmentTestSummary[];
}

export interface SubmissionAnswerView {
  awardedMarks: number | null;
  id: string;
  isCorrect: boolean | null;
  questionId: string;
  selectedOptionId: string | null;
  writtenAnswer: string | null;
}

export interface SubmissionSummary {
  createdAt: string;
  feedback: string | null;
  gradedAt: string | null;
  id: string;
  maxScore: number | null;
  score: number | null;
  startedAt: string | null;
  status: "STARTED" | "SUBMITTED" | "GRADED";
  submittedAt: string | null;
  user: {
    email: string;
    id: string;
    name: string;
  };
}

export interface SubmissionDetail extends SubmissionSummary {
  answers: readonly SubmissionAnswerView[];
  gradedById: string | null;
  testId: string;
}

export interface AssessmentTestDetail extends AssessmentTestSummary {
  questions: readonly AssessmentQuestion[];
}

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function mapSubmissionSummary(record: SubmissionSummaryRecord): SubmissionSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    feedback: record.feedback,
    gradedAt: record.gradedAt?.toISOString() ?? null,
    id: record.id,
    maxScore: record.maxScore,
    score: record.score,
    startedAt: record.startedAt?.toISOString() ?? null,
    status: record.status,
    submittedAt: record.submittedAt?.toISOString() ?? null,
    user: {
      email: record.userEmail,
      id: record.userId,
      name: record.userName
    }
  };
}

function mapSubmissionDetail(
  record: SubmissionSummaryRecord,
  answers: readonly SubmissionAnswerView[]
): SubmissionDetail {
  return {
    ...mapSubmissionSummary(record),
    answers,
    gradedById: record.gradedById,
    testId: record.testId
  };
}

export class TestService {
  public constructor(
    private readonly testRepository: TestRepository,
    private readonly contentRepository: ContentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  private async requireStudentCourseAccess(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<void> {
    if (currentUserRole !== "STUDENT") {
      throw new ForbiddenError("You do not have permission to access course assessments");
    }

    const hasAccess = await this.enrollmentRepository.hasCourseAccess(currentUserId, courseId);

    if (!hasAccess) {
      throw new ForbiddenError("You do not have access to this course assessments");
    }
  }

  private async requireManageableCourse(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CourseRecord> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (currentUserRole === "ADMIN") {
      return course;
    }

    const canManage =
      course.creator.id === currentUserId ||
      course.teachers.some((teacher) => teacher.id === currentUserId);

    if (!canManage) {
      throw new ForbiddenError("You do not have permission to manage course assessments");
    }

    return course;
  }

  private async requireManageableChapter(
    chapterId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ChapterRecord> {
    const chapter = await this.contentRepository.findChapterById(chapterId);

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    await this.requireManageableCourse(chapter.courseId, currentUserId, currentUserRole);

    return chapter;
  }

  private async requireManageableTest(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<TestRecord & { chapter: ChapterRecord }> {
    const test = await this.testRepository.findTestById(testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    const chapter = await this.requireManageableChapter(test.chapterId, currentUserId, currentUserRole);

    return {
      ...test,
      chapter
    };
  }

  private async requireAccessibleTest(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<TestRecord & { chapter: ChapterRecord }> {
    const test = await this.testRepository.findTestById(testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    const chapter = await this.contentRepository.findChapterById(test.chapterId);

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    if (currentUserRole === "ADMIN" || currentUserRole === "TEACHER") {
      await this.requireManageableChapter(chapter.id, currentUserId, currentUserRole);
      return {
        ...test,
        chapter
      };
    }

    await this.requireStudentCourseAccess(chapter.courseId, currentUserId, currentUserRole);

    if (!test.isPublished) {
      throw new ForbiddenError("This test is not available yet");
    }

    return {
      ...test,
      chapter
    };
  }

  private async requireManageableQuestion(
    questionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<QuestionRecord & { test: TestRecord }> {
    const question = await this.testRepository.findQuestionById(questionId);

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    const test = await this.requireManageableTest(question.testId, currentUserId, currentUserRole);

    return {
      ...question,
      test
    };
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

  private validateQuestionAgainstTest(
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

  private validateQuestionInput(input: CreateQuestionInput | UpdateQuestionInput): void {
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

  private gradeAnswers(
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

  public async listCourseAssessments(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly AssessmentChapterSummary[]> {
    if (currentUserRole === "ADMIN" || currentUserRole === "TEACHER") {
      await this.requireManageableCourse(courseId, currentUserId, currentUserRole);
    } else {
      await this.requireStudentCourseAccess(courseId, currentUserId, currentUserRole);
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
    await this.requireManageableChapter(chapterId, currentUserId, currentUserRole);
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
    const test = await this.requireManageableTest(testId, currentUserId, currentUserRole);
    const nextType = input.type ?? test.type;
    const existingQuestions = await this.testRepository.listQuestionsByTestId(testId);

    for (const question of existingQuestions) {
      this.validateQuestionAgainstTest(nextType, question.type);
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
    await this.requireManageableTest(testId, currentUserId, currentUserRole);
    await this.testRepository.deleteTest(testId);

    return { id: testId };
  }

  public async getTestDetail(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<AssessmentTestDetail> {
    const test = await this.requireAccessibleTest(testId, currentUserId, currentUserRole);
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
    const test = await this.requireManageableTest(testId, currentUserId, currentUserRole);
    this.validateQuestionAgainstTest(test.type, input.type);
    this.validateQuestionInput(input);

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
    const question = await this.requireManageableQuestion(questionId, currentUserId, currentUserRole);
    const nextType = input.type ?? question.type;
    this.validateQuestionAgainstTest(question.test.type, nextType);
    this.validateQuestionInput({
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
    await this.requireManageableQuestion(questionId, currentUserId, currentUserRole);
    await this.testRepository.deleteQuestion(questionId);

    return { id: questionId };
  }

  public async reorderQuestions(
    testId: string,
    input: ReorderQuestionsInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<AssessmentTestDetail> {
    await this.requireManageableTest(testId, currentUserId, currentUserRole);
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
    await this.requireAccessibleTest(testId, currentUserId, currentUserRole);

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
    const graded = this.gradeAnswers(questions, options, input.answers);
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
    await this.requireAccessibleTest(testId, currentUserId, currentUserRole);

    let submission = await this.testRepository.findLatestSubmissionByTestAndUser(testId, currentUserId);

    if (!submission || submission.status !== "STARTED") {
      submission = await this.testRepository.createSubmission(testId, currentUserId);
    }

    const questions = await this.testRepository.listQuestionsByTestId(testId);
    const options = await this.testRepository.listOptionsByQuestionIds(
      questions.map((question) => question.id)
    );
    const graded = this.gradeAnswers(questions, options, input.answers);
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
    await this.requireManageableTest(testId, currentUserId, currentUserRole);
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
      await this.requireManageableTest(test.id, currentUserId, currentUserRole);
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

    await this.requireManageableTest(submission.testId, currentUserId, currentUserRole);

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
