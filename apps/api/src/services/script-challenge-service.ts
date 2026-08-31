import type { RaiseScriptChallengeInput, ScriptChallengeStatus, UserRole } from "@mma/shared";

import type { NotificationService } from "@/services/notification-service";
import type {
  ScriptChallengeRecord,
  ScriptChallengeRepository,
  ScriptChallengeWithTeacher
} from "@/repositories/script-challenge-repository";
import type { TestRepository } from "@/repositories/test-repository";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface ScriptChallengeView {
  assignedTeacher: {
    id: string;
    name: string;
  };
  createdAt: string;
  id: string;
  reason: string;
  resolvedAt: string | null;
  response: string | null;
  scoreAfterReview: number | null;
  scoreAtChallenge: number | null;
  status: ScriptChallengeStatus;
  submissionId: string;
}

/**
 * A student's right to a second look at their marked script.
 *
 * The rule the feature exists for is that the second look comes from the same
 * teacher, so raising a challenge does two things at once: it records the
 * dispute, and it puts the paper back into that teacher's hands by reopening
 * it. `PaperMarkingService` asks this service who a reopened paper belongs to
 * before letting anyone mark it.
 */
export class ScriptChallengeService {
  public constructor(
    private readonly scriptChallengeRepository: ScriptChallengeRepository,
    private readonly testRepository: TestRepository,
    private readonly notificationService: NotificationService
  ) {}

  public async raise(
    submissionId: string,
    input: RaiseScriptChallengeInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ScriptChallengeView> {
    if (currentUserRole !== "STUDENT") {
      throw new ForbiddenError("Only the student who sat the paper can challenge its marking");
    }

    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    if (submission.userId !== currentUserId) {
      throw new ForbiddenError("This is not your paper");
    }

    const test = await this.testRepository.findTestById(submission.testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    if (test.type !== "WRITTEN") {
      throw new ValidationError("Only a written paper is marked by hand", [
        { field: "submissionId", message: "There is no marking to challenge" }
      ]);
    }

    // Before the status check, not after: raising a challenge reopens the
    // paper, so a student who challenges twice would otherwise be told their
    // paper is not marked yet — which is true, and is their own challenge's
    // doing.
    const open = await this.scriptChallengeRepository.findOpenBySubmissionId(submissionId);

    if (open) {
      throw new ConflictError("You have already challenged this paper");
    }

    if (submission.status !== "GRADED") {
      throw new ValidationError("This paper has not been marked yet", [
        { field: "status", message: "Wait for the marking before challenging it" }
      ]);
    }

    // Without a marker there is nobody the rule can send the paper back to. A
    // paper graded before `graded_by_id` was recorded lands here; an admin can
    // still reopen it the old way.
    if (!submission.gradedById) {
      throw new ValidationError("No teacher is recorded against this marking", [
        { field: "submissionId", message: "Ask an admin to look at this paper" }
      ]);
    }

    const challenge = await this.scriptChallengeRepository.create({
      assignedTeacherId: submission.gradedById,
      raisedById: currentUserId,
      reason: input.reason,
      scoreAtChallenge: submission.score,
      submissionId
    });

    // Reopening is the challenge. Marks and Marking already on the paper
    // survive — `reopenPaper` has always worked this way — so the teacher
    // reviews what they wrote rather than starting from a blank script.
    await this.testRepository.updateSubmission(submissionId, {
      gradedAt: null,
      status: "SUBMITTED"
    });

    await this.notificationService.notifyUsers([submission.gradedById], {
      body: `A student has challenged your marking on ${test.title}.`,
      data: { challengeId: challenge.id, submissionId, testId: submission.testId },
      title: "A paper you marked is challenged",
      type: "COURSE"
    });

    // Read back through the joined query so the view carries the teacher's
    // name, rather than teaching this service a second way to look a user up.
    const saved = await this.scriptChallengeRepository.listBySubmissionId(submissionId);
    const match = saved.find((row) => row.id === challenge.id);

    if (!match) {
      throw new Error("Failed to load the raised challenge");
    }

    return this.mapWithTeacher(match);
  }

  public async listForSubmission(
    submissionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly ScriptChallengeView[]> {
    const submission = await this.testRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new NotFoundError("Submission not found");
    }

    if (currentUserRole === "STUDENT" && submission.userId !== currentUserId) {
      throw new ForbiddenError("This is not your paper");
    }

    if (currentUserRole !== "STUDENT" && currentUserRole !== "ADMIN" && currentUserRole !== "TEACHER") {
      throw new ForbiddenError("You do not have access to this paper");
    }

    const rows = await this.scriptChallengeRepository.listBySubmissionId(submissionId);

    return rows.map((row) => this.mapWithTeacher(row));
  }

  /**
   * The teacher a challenged paper belongs to, or null when it is not under
   * challenge. `PaperMarkingService` calls this to decide whether the ordinary
   * "any teacher on the course" rule applies.
   */
  public async findAssignedTeacherId(submissionId: string): Promise<string | null> {
    const open = await this.scriptChallengeRepository.findOpenBySubmissionId(submissionId);

    return open?.assignedTeacherId ?? null;
  }

  /**
   * Called when a challenged paper is handed back. The challenge closes on the
   * re-submit rather than on a button of its own: what the student is owed is
   * the second look, and handing the paper back is the evidence it happened.
   */
  public async resolveOnResubmit(
    submissionId: string,
    resolvedById: string,
    response: string | null,
    scoreAfterReview: number
  ): Promise<void> {
    const open = await this.scriptChallengeRepository.findOpenBySubmissionId(submissionId);

    if (!open) {
      return;
    }

    await this.scriptChallengeRepository.resolve(open.id, {
      resolvedById,
      response,
      scoreAfterReview
    });

    const changed = open.scoreAtChallenge !== scoreAfterReview;

    await this.notificationService.notifyUsers([open.raisedById], {
      body: changed
        ? `Your paper was checked again and the score is now ${scoreAfterReview}.`
        : "Your paper was checked again and the score is unchanged.",
      data: { challengeId: open.id, submissionId },
      title: "Your challenge has been answered",
      type: "COURSE"
    });
  }

  private mapWithTeacher(row: ScriptChallengeWithTeacher): ScriptChallengeView {
    return this.map(row, row.assignedTeacherName);
  }

  private map(row: ScriptChallengeRecord, assignedTeacherName: string): ScriptChallengeView {
    return {
      assignedTeacher: {
        id: row.assignedTeacherId,
        name: assignedTeacherName
      },
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      reason: row.reason,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      response: row.response,
      scoreAfterReview: row.scoreAfterReview,
      scoreAtChallenge: row.scoreAtChallenge,
      status: row.status,
      submissionId: row.submissionId
    };
  }
}
