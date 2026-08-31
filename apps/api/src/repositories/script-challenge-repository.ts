import { and, db, desc, eq, scriptChallenges, users } from "@mma/db";
import type { ScriptChallengeStatus } from "@mma/shared";

export interface ScriptChallengeRecord {
  assignedTeacherId: string;
  createdAt: Date;
  id: string;
  raisedById: string;
  reason: string;
  resolvedAt: Date | null;
  resolvedById: string | null;
  response: string | null;
  scoreAfterReview: number | null;
  scoreAtChallenge: number | null;
  status: ScriptChallengeStatus;
  submissionId: string;
  updatedAt: Date;
}

export interface ScriptChallengeWithTeacher extends ScriptChallengeRecord {
  assignedTeacherName: string;
}

const challengeColumns = {
  assignedTeacherId: scriptChallenges.assignedTeacherId,
  createdAt: scriptChallenges.createdAt,
  id: scriptChallenges.id,
  raisedById: scriptChallenges.raisedById,
  reason: scriptChallenges.reason,
  resolvedAt: scriptChallenges.resolvedAt,
  resolvedById: scriptChallenges.resolvedById,
  response: scriptChallenges.response,
  scoreAfterReview: scriptChallenges.scoreAfterReview,
  scoreAtChallenge: scriptChallenges.scoreAtChallenge,
  status: scriptChallenges.status,
  submissionId: scriptChallenges.submissionId,
  updatedAt: scriptChallenges.updatedAt
};

export class ScriptChallengeRepository {
  /** The live challenge on a paper, if it has one. At most one can exist. */
  public async findOpenBySubmissionId(submissionId: string): Promise<ScriptChallengeRecord | null> {
    const [row] = await db
      .select(challengeColumns)
      .from(scriptChallenges)
      .where(
        and(eq(scriptChallenges.submissionId, submissionId), eq(scriptChallenges.status, "OPEN"))
      )
      .limit(1);

    return row ?? null;
  }

  /**
   * Newest first, so a paper challenged twice reads as a history.
   *
   * Only the teacher's name is joined. The student is always either the reader
   * or already named beside the paper the reader is looking at, so a second
   * join on `raised_by_id` would buy nothing.
   */
  public async listBySubmissionId(
    submissionId: string
  ): Promise<readonly ScriptChallengeWithTeacher[]> {
    return db
      .select({
        ...challengeColumns,
        assignedTeacherName: users.name
      })
      .from(scriptChallenges)
      .innerJoin(users, eq(scriptChallenges.assignedTeacherId, users.id))
      .where(eq(scriptChallenges.submissionId, submissionId))
      .orderBy(desc(scriptChallenges.createdAt));
  }

  public async findById(id: string): Promise<ScriptChallengeRecord | null> {
    const [row] = await db
      .select(challengeColumns)
      .from(scriptChallenges)
      .where(eq(scriptChallenges.id, id))
      .limit(1);

    return row ?? null;
  }

  public async listOpenByTeacherId(teacherId: string): Promise<readonly ScriptChallengeRecord[]> {
    return db
      .select(challengeColumns)
      .from(scriptChallenges)
      .where(
        and(eq(scriptChallenges.assignedTeacherId, teacherId), eq(scriptChallenges.status, "OPEN"))
      )
      .orderBy(desc(scriptChallenges.createdAt));
  }

  public async create(input: {
    assignedTeacherId: string;
    raisedById: string;
    reason: string;
    scoreAtChallenge: number | null;
    submissionId: string;
  }): Promise<ScriptChallengeRecord> {
    const [row] = await db.insert(scriptChallenges).values(input).returning(challengeColumns);

    if (!row) {
      throw new Error("Failed to raise the challenge");
    }

    return row;
  }

  public async resolve(
    id: string,
    input: { resolvedById: string; response: string | null; scoreAfterReview: number | null }
  ): Promise<ScriptChallengeRecord | null> {
    const [row] = await db
      .update(scriptChallenges)
      .set({
        resolvedAt: new Date(),
        resolvedById: input.resolvedById,
        response: input.response,
        scoreAfterReview: input.scoreAfterReview,
        status: "RESOLVED",
        updatedAt: new Date()
      })
      .where(eq(scriptChallenges.id, id))
      .returning(challengeColumns);

    return row ?? null;
  }
}
