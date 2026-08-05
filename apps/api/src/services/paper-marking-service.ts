import {
  markingDocumentSchema,
  type MarkingReviewMode,
  type UserRole
} from "@genex/shared";
import type { z } from "zod";
import type { saveMarkingSchema, setAnswerMarkSchema, submitPaperSchema } from "@genex/shared";

import { normalizeOptionalHtml } from "@/lib/html";
import type { AnswerScriptRepository } from "@/repositories/answer-script-repository";
import type {
  QuestionRecord,
  SubmissionAnswerRecord,
  TestRepository
} from "@/repositories/test-repository";
import type { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import { roundMarks, totalMarks } from "@/services/assessment-grading";
import { mapScriptPageView, type ScriptPageView } from "@/services/assessment-views";
import type { NotificationService } from "@/services/notification-service";
import type { TestSubmissionService } from "@/services/test-submission-service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type SetAnswerMarkInput = z.infer<typeof setAnswerMarkSchema>;
type SaveMarkingInput = z.infer<typeof saveMarkingSchema>;
type SubmitPaperInput = z.infer<typeof submitPaperSchema>;

/**
 * How long a teacher's claim on one answer lasts without being renewed. Short
 * enough that a closed tab frees the answer while the next teacher is still
 * looking at the queue.
 */
const markingLockTtlMs = 2 * 60 * 1000;

export interface MarkingQuestionView {
  /** Null until the student has uploaded something for this question. */
  answerId: string | null;
  awardedMarks: number | null;
  id: string;
  /** Who else is marking this answer right now, if anyone. */
  lockedByName: string | null;
  markingGuide: string | null;
  marks: number;
  pageCount: number;
  questionText: string;
  sortOrder: number;
}

export interface MarkingPaperView {
  attemptNumber: number;
  /** Every attempted question has a mark — the paper can be submitted. */
  isComplete: boolean;
  markedCount: number;
  questions: readonly MarkingQuestionView[];
  status: "STARTED" | "SUBMITTED" | "GRADED";
  student: { email: string; id: string; name: string };
  submissionId: string;
  toMarkCount: number;
}

export interface MarkingQueueView {
  mode: MarkingReviewMode;
  papers: readonly MarkingPaperView[];
  testId: string;
  testTitle: string;
  totalMarks: number;
}

export interface MarkingAnswerView {
  awardedMarks: number | null;
  id: string;
  lockedByName: string | null;
  markingGuide: string | null;
  marks: number;
  pages: readonly ScriptPageView[];
  questionId: string;
  questionText: string;
  student: { id: string; name: string };
  submissionId: string;
}

/**
 * Marking a written paper.
 *
 * Marks and Marking are written straight onto the answer as the teacher works;
 * the submission stays `SUBMITTED` until they submit the paper, which is
 * refused while any attempted question is unmarked. A per-answer claim keeps a
 * student-first pass and a question-first sweep from overwriting each other.
 */
export class PaperMarkingService {
  public constructor(
    private readonly testRepository: TestRepository,
    private readonly answerScriptRepository: AnswerScriptRepository,
    private readonly access: AssessmentAccessGuards,
    private readonly submissions: TestSubmissionService,
    private readonly notificationService: NotificationService
  ) {}

  private async requireWrittenTest(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ chapterId: string; passingScore: number | null; title: string }> {
    const test = await this.access.requireManageableTest(testId, currentUserId, currentUserRole, {
      allowArchived: true
    });

    if (test.type !== "WRITTEN") {
      throw new ValidationError("This test is not marked by hand", [
        {
          field: "testId",
          message: "Only a written paper has scripts to mark"
        }
      ]);
    }

    return { chapterId: test.chapterId, passingScore: test.passingScore, title: test.title };
  }

  /**
   * Claims the answer for this teacher, or renews their own claim. Refuses only
   * when someone else's claim is still live — an expired one belongs to nobody.
   */
  private async claim(answerId: string, currentUserId: string): Promise<void> {
    const acquired = await this.answerScriptRepository.acquireMarkingLock({
      expiresAt: new Date(Date.now() + markingLockTtlMs),
      lockedById: currentUserId,
      submissionAnswerId: answerId
    });

    if (!acquired) {
      const [lock] = await this.answerScriptRepository.listMarkingLocksByAnswerIds([answerId]);

      throw new ConflictError(
        lock
          ? `${lock.lockedByName} is marking this answer right now`
          : "Another teacher is marking this answer right now"
      );
    }
  }

  private async requireMarkableAnswer(
    answerId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ answer: SubmissionAnswerRecord; question: QuestionRecord }> {
    const answer = await this.testRepository.findSubmissionAnswerById(answerId);

    if (!answer) {
      throw new NotFoundError("Answer not found");
    }

    const submission = await this.testRepository.findSubmissionById(answer.submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    await this.requireWrittenTest(submission.testId, currentUserId, currentUserRole);

    if (submission.status !== "SUBMITTED") {
      throw new ValidationError(
        submission.status === "GRADED"
          ? "This paper has been submitted and is locked"
          : "This paper has not been handed in yet",
        [
          {
            field: "status",
            message:
              submission.status === "GRADED"
                ? "An admin can reopen it if it needs changing"
                : "Wait for the student to submit"
          }
        ]
      );
    }

    const question = await this.testRepository.findQuestionById(answer.questionId);

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    return { answer, question };
  }

  public async getQueue(
    testId: string,
    mode: MarkingReviewMode,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<MarkingQueueView> {
    const test = await this.requireWrittenTest(testId, currentUserId, currentUserRole);
    const questions = await this.testRepository.listQuestionsByTestId(testId);
    const submissions = (await this.testRepository.listSubmissionsByTestId(testId)).filter(
      (submission) => submission.status !== "STARTED"
    );
    const answers = await this.testRepository.listAnswersBySubmissionIds(
      submissions.map((submission) => submission.id)
    );
    const pages = await this.answerScriptRepository.listScriptPagesByAnswerIds(
      answers.map((answer) => answer.id)
    );
    const locks = await this.answerScriptRepository.listMarkingLocksByAnswerIds(
      answers.map((answer) => answer.id)
    );

    const pageCountByAnswerId = new Map<string, number>();
    for (const page of pages) {
      pageCountByAnswerId.set(
        page.submissionAnswerId,
        (pageCountByAnswerId.get(page.submissionAnswerId) ?? 0) + 1
      );
    }

    const lockByAnswerId = new Map(locks.map((lock) => [lock.submissionAnswerId, lock]));
    const answersBySubmissionId = new Map<string, SubmissionAnswerRecord[]>();
    for (const answer of answers) {
      const existing = answersBySubmissionId.get(answer.submissionId) ?? [];
      existing.push(answer);
      answersBySubmissionId.set(answer.submissionId, existing);
    }

    const attemptCounts = new Map<string, number>();
    const papers = [...submissions]
      .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
      .map((submission) => {
        const attemptNumber = (attemptCounts.get(submission.userId) ?? 0) + 1;
        attemptCounts.set(submission.userId, attemptNumber);

        const answersByQuestionId = new Map(
          (answersBySubmissionId.get(submission.id) ?? []).map((answer) => [
            answer.questionId,
            answer
          ])
        );

        const questionViews = questions.map((question) => {
          const answer = answersByQuestionId.get(question.id);
          const pageCount = answer ? (pageCountByAnswerId.get(answer.id) ?? 0) : 0;
          const lock = answer ? lockByAnswerId.get(answer.id) : undefined;

          return {
            answerId: answer?.id ?? null,
            awardedMarks: answer?.awardedMarks ?? null,
            id: question.id,
            lockedByName:
              lock && lock.lockedById !== currentUserId ? lock.lockedByName : null,
            markingGuide: question.markingGuide,
            marks: question.marks,
            pageCount,
            questionText: question.questionText,
            sortOrder: question.sortOrder
          };
        });

        const attempted = questionViews.filter((question) => question.pageCount > 0);
        const marked = attempted.filter((question) => question.awardedMarks !== null);

        return {
          attemptNumber,
          isComplete: attempted.length === marked.length,
          markedCount: marked.length,
          questions: questionViews,
          status: submission.status,
          student: {
            email: submission.userEmail,
            id: submission.userId,
            name: submission.userName
          },
          submissionId: submission.id,
          toMarkCount: attempted.length
        };
      });

    return {
      mode,
      papers,
      testId,
      testTitle: test.title,
      totalMarks: totalMarks(questions)
    };
  }

  /** One answer, opened for marking. Claiming it is part of opening it. */
  public async openAnswer(
    answerId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<MarkingAnswerView> {
    const { answer, question } = await this.requireMarkableAnswer(
      answerId,
      currentUserId,
      currentUserRole
    );
    await this.claim(answerId, currentUserId);

    const submission = await this.testRepository.findSubmissionById(answer.submissionId);
    const submissionSummaries = await this.testRepository.listSubmissionsByTestId(
      submission!.testId
    );
    const summary = submissionSummaries.find((item) => item.id === answer.submissionId);
    const pages = await this.answerScriptRepository.listScriptPagesByAnswerIds([answerId]);

    return {
      awardedMarks: answer.awardedMarks,
      id: answer.id,
      lockedByName: null,
      markingGuide: question.markingGuide,
      marks: question.marks,
      pages: pages.map((page) => mapScriptPageView(page, true)),
      questionId: question.id,
      questionText: question.questionText,
      student: { id: summary?.userId ?? "", name: summary?.userName ?? "" },
      submissionId: answer.submissionId
    };
  }

  /** Renews the claim while a teacher keeps working on the same answer. */
  public async renewClaim(
    answerId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ expiresInMs: number }> {
    await this.requireMarkableAnswer(answerId, currentUserId, currentUserRole);
    await this.claim(answerId, currentUserId);

    return { expiresInMs: markingLockTtlMs };
  }

  public async releaseClaim(answerId: string, currentUserId: string): Promise<{ id: string }> {
    await this.answerScriptRepository.releaseMarkingLock(answerId, currentUserId);

    return { id: answerId };
  }

  public async setAnswerMark(
    answerId: string,
    input: SetAnswerMarkInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ awardedMarks: number; id: string }> {
    const { question } = await this.requireMarkableAnswer(
      answerId,
      currentUserId,
      currentUserRole
    );
    await this.claim(answerId, currentUserId);

    if (input.awardedMarks > question.marks) {
      throw new ValidationError("Awarded marks exceed question marks", [
        {
          field: "awardedMarks",
          message: `This question is worth ${question.marks}`
        }
      ]);
    }

    const updated = await this.testRepository.updateSubmissionAnswer(answerId, {
      awardedMarks: input.awardedMarks,
      isCorrect: null
    });

    return { awardedMarks: updated.awardedMarks ?? 0, id: updated.id };
  }

  public async saveMarking(
    pageId: string,
    input: SaveMarkingInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    const page = await this.answerScriptRepository.findScriptPageById(pageId);

    if (!page) {
      throw new NotFoundError("Page not found");
    }

    await this.requireMarkableAnswer(page.submissionAnswerId, currentUserId, currentUserRole);
    await this.claim(page.submissionAnswerId, currentUserId);

    // Parsed again here rather than trusted from the route: this document is
    // read back by three clients and a bad one would break all of them.
    const marking = markingDocumentSchema.parse(input.marking);
    await this.answerScriptRepository.saveScriptPageMarking(pageId, marking);

    return { id: pageId };
  }

  /**
   * Finishes one student's paper.
   *
   * Refused while any attempted question is unmarked. A question the student
   * left blank scores zero without a click — there is nothing there to judge.
   */
  public async submitPaper(
    submissionId: string,
    input: SubmitPaperInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ score: number; submissionId: string }> {
    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    const test = await this.requireWrittenTest(
      submission.testId,
      currentUserId,
      currentUserRole
    );

    if (submission.status !== "SUBMITTED") {
      throw new ValidationError(
        submission.status === "GRADED"
          ? "This paper has already been submitted"
          : "This paper has not been handed in yet",
        [{ field: "status", message: "Nothing to submit" }]
      );
    }

    const questions = await this.testRepository.listQuestionsByTestId(submission.testId);
    const answers = await this.testRepository.listAnswersBySubmissionIds([submissionId]);
    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
    const pages = await this.answerScriptRepository.listScriptPagesByAnswerIds(
      answers.map((answer) => answer.id)
    );
    const answerIdsWithPages = new Set(pages.map((page) => page.submissionAnswerId));

    const unmarked = questions.filter((question) => {
      const answer = answersByQuestionId.get(question.id);

      return answer && answerIdsWithPages.has(answer.id) && answer.awardedMarks === null;
    });

    if (unmarked.length > 0) {
      throw new ValidationError("Every answered question needs a mark", [
        {
          field: "answers",
          message: `${unmarked.length} answered question${unmarked.length === 1 ? "" : "s"} still unmarked`
        }
      ]);
    }

    // An unattempted question scores zero, written down rather than implied, so
    // the paper's answers add up to its score on their own.
    const blanks = questions
      .filter((question) => {
        const answer = answersByQuestionId.get(question.id);

        return !answer || !answerIdsWithPages.has(answer.id);
      })
      .map((question) => ({
        awardedMarks: 0,
        isCorrect: null,
        questionId: question.id
      }));

    if (blanks.length > 0) {
      await this.testRepository.upsertSubmissionAnswers({ answers: blanks, submissionId });
    }

    const finalAnswers = await this.testRepository.listAnswersBySubmissionIds([submissionId]);
    const score = roundMarks(
      finalAnswers.reduce((sum, answer) => sum + (answer.awardedMarks ?? 0), 0)
    );

    await this.testRepository.updateSubmission(submissionId, {
      feedback: input.feedback !== undefined ? normalizeOptionalHtml(input.feedback) : undefined,
      gradedAt: new Date(),
      gradedById: currentUserId,
      maxScore: totalMarks(questions),
      score,
      status: "GRADED"
    });

    await this.submissions.promoteEnrollmentIfFinished(test.chapterId, submission.userId);
    await this.notificationService.notifyUsers([submission.userId], {
      body: `Your paper for ${test.title} has been marked.`,
      data: { submissionId, testId: submission.testId },
      title: "Your paper is marked",
      type: "COURSE"
    });

    return { score, submissionId };
  }

  /**
   * Puts a submitted paper back into a teacher's hands. Admin only: a graded
   * paper is final, and this is the one way past that. The marks and Marking
   * already on it survive — only the student's view of them goes away.
   */
  public async reopenPaper(
    submissionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ submissionId: string }> {
    if (currentUserRole !== "ADMIN") {
      throw new ForbiddenError("Only an admin can reopen a submitted paper");
    }

    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    await this.requireWrittenTest(submission.testId, currentUserId, currentUserRole);

    if (submission.status !== "GRADED") {
      throw new ValidationError("This paper is not submitted", [
        { field: "status", message: "Only a submitted paper can be reopened" }
      ]);
    }

    await this.testRepository.updateSubmission(submissionId, {
      gradedAt: null,
      status: "SUBMITTED"
    });

    return { submissionId };
  }
}
