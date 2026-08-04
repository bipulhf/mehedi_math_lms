import type { UserRole } from "@genex/shared";
import type { z } from "zod";
import type {
  gradeSubmissionSchema,
  saveSubmissionAnswersSchema,
  submitTestSchema
} from "@genex/shared";

import type { ContentRepository } from "@/repositories/content-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type {
  SubmissionRecord,
  SubmissionSummaryRecord,
  TestRecord,
  TestRepository
} from "@/repositories/test-repository";
import type { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import { gradeAnswers } from "@/services/assessment-grading";
import {
  isTestPassed,
  mapSubmissionDetail,
  mapSubmissionSummary,
  type SubmissionDetail,
  type SubmissionSummary
} from "@/services/assessment-views";
import { normalizeOptionalHtml } from "@/lib/html";
import type { ProgressService } from "@/services/progress-service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
type SubmitTestInput = z.infer<typeof submitTestSchema>;
type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

/**
 * Taking a test and grading it: starting/resuming an attempt, autosaving
 * answers, submitting, and a teacher's manual grading pass. Split out of
 * `TestService` (which keeps test/question authoring) — a distinct
 * responsibility, not a file-size trick.
 */
export class TestSubmissionService {
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

  /**
   * Resumes an in-progress attempt if one exists — that's not a new attempt,
   * just picking back up — otherwise starts a fresh one, gated by
   * `maxAttempts`. `STARTED` submissions are deliberately excluded from the
   * attempt count so opening a test and abandoning it doesn't burn a try.
   */
  private async getOrCreateActiveSubmission(
    test: TestRecord,
    currentUserId: string
  ): Promise<SubmissionRecord> {
    const submission = await this.testRepository.findLatestSubmissionByTestAndUser(
      test.id,
      currentUserId
    );

    if (submission && submission.status === "STARTED") {
      return submission;
    }

    if (test.maxAttempts !== null) {
      const counts = await this.testRepository.countCompletedSubmissionsByTestIds(
        [test.id],
        currentUserId
      );

      if ((counts.get(test.id) ?? 0) >= test.maxAttempts) {
        throw new ForbiddenError("You have used all of your attempts for this test");
      }
    }

    return this.testRepository.createSubmission(test.id, currentUserId);
  }

  public async startSubmission(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    const test = await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);
    const submission = await this.getOrCreateActiveSubmission(test, currentUserId);
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
      passed: isTestPassed(submission.score, test.passingScore),
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

    const test = await this.testRepository.findTestById(submission.testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    if (test.lockAnswerOnSelect) {
      const existingAnswers = await this.testRepository.listAnswersBySubmissionIds([submissionId]);
      const lockedOptionByQuestionId = new Map(
        existingAnswers
          .filter((answer) => answer.selectedOptionId !== null)
          .map((answer) => [answer.questionId, answer.selectedOptionId])
      );

      for (const answer of input.answers) {
        const lockedOptionId = lockedOptionByQuestionId.get(answer.questionId);

        if (lockedOptionId && answer.selectedOptionId && answer.selectedOptionId !== lockedOptionId) {
          throw new ValidationError("This answer is locked", [
            {
              field: "answers",
              message: "Once you pick an option for this question you can't change it"
            }
          ]);
        }
      }
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
    const test = await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);
    const submission = await this.getOrCreateActiveSubmission(test, currentUserId);

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
      await this.promoteEnrollmentIfFinished(test.chapterId, currentUserId);
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
      })),
      test.passingScore
    );
  }

  public async listSubmissions(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly SubmissionSummary[]> {
    const test = await this.access.requireManageableTest(testId, currentUserId, currentUserRole);
    const submissions = await this.testRepository.listSubmissionsByTestId(testId);

    return submissions.map((submission) => mapSubmissionSummary(submission, test.passingScore));
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
      })),
      test.passingScore
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
      feedback: input.feedback !== undefined ? normalizeOptionalHtml(input.feedback) : undefined,
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
      })),
      gradedTest?.passingScore ?? null
    );
  }
}
