import type { UserRole } from "@mma/shared";
import type { z } from "zod";
import type { saveSubmissionAnswersSchema, submitTestSchema } from "@mma/shared";

import type { AnswerScriptRepository } from "@/repositories/answer-script-repository";
import type { ContentRepository } from "@/repositories/content-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type {
  SubmissionAnswerRecord,
  SubmissionRecord,
  SubmissionSummaryRecord,
  TestRecord,
  TestRepository
} from "@/repositories/test-repository";
import type { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import { gradeMcqAnswers, totalMarks } from "@/services/assessment-grading";
import {
  attachAttemptNumbers,
  mapScriptPageView,
  mapSubmissionDetail,
  mapSubmissionSummary,
  type SubmissionAnswerView,
  type SubmissionDetail,
  type SubmissionSummary
} from "@/services/assessment-views";
import type { ProgressService } from "@/services/progress-service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
type SubmitTestInput = z.infer<typeof submitTestSchema>;

/**
 * Sitting a test: starting or resuming an attempt, autosaving MCQ selections,
 * and submitting. Marking a written paper is a teacher's job and lives in
 * `PaperMarkingService`.
 */
export class TestSubmissionService {
  public constructor(
    private readonly testRepository: TestRepository,
    private readonly answerScriptRepository: AnswerScriptRepository,
    private readonly contentRepository: ContentRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly access: AssessmentAccessGuards,
    private readonly progressService: ProgressService
  ) {}

  /**
   * A graded submission can be the last thing a course was waiting on, so the
   * enrolment is re-evaluated here. For an Exam-Only Course this is the only
   * path to completion — it has no lectures to mark. ADR-0005.
   *
   * Returns whether *this call* was the one that crossed the finish line, so
   * the caller can tell a fresh completion from an enrolment that was already
   * `COMPLETED` (or still isn't) — the signal a client-side celebration needs.
   */
  public async promoteEnrollmentIfFinished(chapterId: string, userId: string): Promise<boolean> {
    const chapter = await this.contentRepository.findChapterById(chapterId);

    if (!chapter) {
      return false;
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      chapter.courseId
    );

    if (!enrollment || enrollment.status === "COMPLETED") {
      return false;
    }

    const promoted = await this.progressService.promoteIfFinished(chapter.courseId, enrollment);

    return promoted.status === "COMPLETED";
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

  /**
   * A `STARTED` submission is always the newest for its user (only one can
   * exist at a time), so every completed attempt precedes it chronologically
   * — its rank is simply the completed count plus one.
   */
  private async getAttemptNumber(testId: string, userId: string): Promise<number> {
    const counts = await this.testRepository.countCompletedSubmissionsByTestIds([testId], userId);

    return (counts.get(testId) ?? 0) + 1;
  }

  /**
   * Answers with their Script Pages attached.
   *
   * `revealMarking` is what keeps a half-marked paper private: a student sees
   * their own pages but no marks and no Marking until the paper is submitted.
   */
  public async buildAnswerViews(
    answers: readonly SubmissionAnswerRecord[],
    revealMarking: boolean
  ): Promise<readonly SubmissionAnswerView[]> {
    const pages = await this.answerScriptRepository.listScriptPagesByAnswerIds(
      answers.map((answer) => answer.id)
    );
    const pagesByAnswerId = new Map<string, typeof pages>();

    for (const page of pages) {
      const existing = pagesByAnswerId.get(page.submissionAnswerId) ?? [];
      pagesByAnswerId.set(page.submissionAnswerId, [...existing, page]);
    }

    return answers.map((answer) => ({
      awardedMarks: revealMarking ? answer.awardedMarks : null,
      id: answer.id,
      isCorrect: revealMarking ? answer.isCorrect : null,
      questionId: answer.questionId,
      scriptPages: (pagesByAnswerId.get(answer.id) ?? []).map((page) =>
        mapScriptPageView(page, revealMarking)
      ),
      selectedOptionId: answer.selectedOptionId
    }));
  }

  private async loadSubmissionDetail(
    submission: SubmissionRecord,
    test: TestRecord,
    attemptNumber: number,
    revealMarking: boolean,
    summary?: SubmissionSummaryRecord,
    courseCompletedJustNow = false
  ): Promise<SubmissionDetail> {
    const answers = await this.testRepository.listAnswersBySubmissionIds([submission.id]);
    const answerViews = await this.buildAnswerViews(answers, revealMarking);
    const summaryRecord: SubmissionSummaryRecord = summary ?? {
      ...submission,
      userEmail: "",
      userName: ""
    };

    return mapSubmissionDetail(
      summaryRecord,
      answerViews,
      test.passingScore,
      attemptNumber,
      courseCompletedJustNow
    );
  }

  public async startSubmission(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    const test = await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);
    const submission = await this.getOrCreateActiveSubmission(test, currentUserId);
    const attemptNumber = await this.getAttemptNumber(testId, currentUserId);

    return this.loadSubmissionDetail(
      submission,
      test,
      attemptNumber,
      submission.status === "GRADED"
    );
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

    if (test.type === "WRITTEN") {
      throw new ValidationError("A written paper has no answers to save", [
        {
          field: "answers",
          message: "Upload the pages of your answer instead"
        }
      ]);
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
    const graded = gradeMcqAnswers(questions, options, input.answers);
    await this.testRepository.upsertSubmissionAnswers({
      answers: graded.normalizedAnswers,
      submissionId
    });

    return this.startSubmission(submission.testId, currentUserId, currentUserRole);
  }

  /**
   * Closes the attempt.
   *
   * An MCQ paper grades itself and lands on `GRADED`. A written paper lands on
   * `SUBMITTED` — its Answer Scripts were uploaded page by page while the
   * student worked, and a teacher has to read them.
   */
  public async submitTest(
    testId: string,
    input: SubmitTestInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<SubmissionDetail> {
    const test = await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);
    const submission = await this.getOrCreateActiveSubmission(test, currentUserId);
    const attemptNumber = await this.getAttemptNumber(testId, currentUserId);
    const questions = await this.testRepository.listQuestionsByTestId(testId);
    const isWritten = test.type === "WRITTEN";

    if (!isWritten) {
      const options = await this.testRepository.listOptionsByQuestionIds(
        questions.map((question) => question.id)
      );
      const graded = gradeMcqAnswers(questions, options, input.answers);
      await this.testRepository.upsertSubmissionAnswers({
        answers: graded.normalizedAnswers,
        submissionId: submission.id
      });

      const updatedSubmission = await this.testRepository.updateSubmission(submission.id, {
        maxScore: graded.maxScore,
        score: graded.autoGradedScore,
        status: "GRADED",
        submittedAt: new Date()
      });

      const courseCompletedJustNow = await this.promoteEnrollmentIfFinished(
        test.chapterId,
        currentUserId
      );

      return this.loadSubmissionDetail(
        updatedSubmission,
        test,
        attemptNumber,
        true,
        undefined,
        courseCompletedJustNow
      );
    }

    const updatedSubmission = await this.testRepository.updateSubmission(submission.id, {
      maxScore: totalMarks(questions),
      score: null,
      status: "SUBMITTED",
      submittedAt: new Date()
    });

    return this.loadSubmissionDetail(updatedSubmission, test, attemptNumber, false);
  }

  public async listSubmissions(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly SubmissionSummary[]> {
    // Read-only path: a teacher may still see who submitted what on an
    // archived course's test.
    const test = await this.access.requireManageableTest(testId, currentUserId, currentUserRole, {
      allowArchived: true
    });
    const submissions = await this.testRepository.listSubmissionsByTestId(testId);
    const attemptNumbers = attachAttemptNumbers(submissions);

    return submissions.map((submission) =>
      mapSubmissionSummary(submission, test.passingScore, attemptNumbers.get(submission.id) ?? 1)
    );
  }

  /** A student's own attempt history for one test — every attempt, oldest first is `attemptNumber` 1. */
  public async listMySubmissions(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly SubmissionSummary[]> {
    const test = await this.access.requireAccessibleTest(testId, currentUserId, currentUserRole);
    const submissions = await this.testRepository.listSubmissionsByTestAndUser(
      testId,
      currentUserId
    );
    const attemptNumbers = attachAttemptNumbers(submissions);

    return submissions.map((submission) =>
      mapSubmissionSummary(submission, test.passingScore, attemptNumbers.get(submission.id) ?? 1)
    );
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

    const isStaff = currentUserRole === "ADMIN" || currentUserRole === "TEACHER";

    if (isStaff) {
      await this.access.requireManageableTest(test.id, currentUserId, currentUserRole, {
        allowArchived: true
      });
    } else if (submission.userId !== currentUserId) {
      throw new ForbiddenError("You do not have permission to view this submission");
    }

    const submissions = await this.testRepository.listSubmissionsByTestId(test.id);
    const summaryRecord = submissions.find((item) => item.id === submissionId);

    if (!summaryRecord) {
      throw new NotFoundError("Submission not found");
    }

    const attemptNumbers = attachAttemptNumbers(submissions);

    return this.loadSubmissionDetail(
      submission,
      test,
      attemptNumbers.get(summaryRecord.id) ?? 1,
      isStaff || submission.status === "GRADED",
      summaryRecord
    );
  }
}
