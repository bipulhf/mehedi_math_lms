import {
  and,
  answerMarkingLocks,
  asc,
  db,
  eq,
  gt,
  inArray,
  scriptPages,
  sql,
  uploads,
  users
} from "@mma/db";

/** One photographed page of an Answer Script, with the teacher's Marking. */
export interface ScriptPageRecord {
  createdAt: Date;
  fileUrl: string;
  height: number | null;
  id: string;
  marking: unknown;
  markedAt: Date | null;
  sortOrder: number;
  submissionAnswerId: string;
  uploadId: string;
  width: number | null;
}

/** A teacher's live claim on one answer while they mark it. */
export interface MarkingLockRecord {
  expiresAt: Date;
  lockedById: string;
  lockedByName: string;
  submissionAnswerId: string;
}

/**
 * Answer Scripts and the Marking over them: pages, their order, the teacher's
 * overlay, and the per-answer claim that lets a student-first pass and a
 * question-first sweep run at the same time.
 *
 * Separate from `TestRepository`, which owns tests, questions and submissions.
 */
export class AnswerScriptRepository {
  public async listScriptPagesByAnswerIds(
    answerIds: readonly string[]
  ): Promise<readonly ScriptPageRecord[]> {
    if (answerIds.length === 0) {
      return [];
    }

    return db
      .select({
        createdAt: scriptPages.createdAt,
        fileUrl: uploads.fileUrl,
        height: uploads.height,
        id: scriptPages.id,
        markedAt: scriptPages.markedAt,
        marking: scriptPages.marking,
        sortOrder: scriptPages.sortOrder,
        submissionAnswerId: scriptPages.submissionAnswerId,
        uploadId: scriptPages.uploadId,
        width: uploads.width
      })
      .from(scriptPages)
      .innerJoin(uploads, eq(uploads.id, scriptPages.uploadId))
      .where(inArray(scriptPages.submissionAnswerId, [...answerIds]))
      .orderBy(asc(scriptPages.submissionAnswerId), asc(scriptPages.sortOrder));
  }

  public async findScriptPageById(id: string): Promise<ScriptPageRecord | null> {
    const [record] = await db
      .select({
        createdAt: scriptPages.createdAt,
        fileUrl: uploads.fileUrl,
        height: uploads.height,
        id: scriptPages.id,
        markedAt: scriptPages.markedAt,
        marking: scriptPages.marking,
        sortOrder: scriptPages.sortOrder,
        submissionAnswerId: scriptPages.submissionAnswerId,
        uploadId: scriptPages.uploadId,
        width: uploads.width
      })
      .from(scriptPages)
      .innerJoin(uploads, eq(uploads.id, scriptPages.uploadId))
      .where(eq(scriptPages.id, id))
      .limit(1);

    return record ?? null;
  }

  public async countScriptPagesByAnswerId(answerId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(scriptPages)
      .where(eq(scriptPages.submissionAnswerId, answerId));

    return Number(row?.count ?? 0);
  }

  public async appendScriptPage(input: {
    sortOrder: number;
    submissionAnswerId: string;
    uploadId: string;
  }): Promise<{ id: string }> {
    const [record] = await db.insert(scriptPages).values(input).returning({ id: scriptPages.id });

    if (!record) {
      throw new Error("Failed to add script page");
    }

    return record;
  }

  public async deleteScriptPage(id: string): Promise<void> {
    await db.delete(scriptPages).where(eq(scriptPages.id, id));
  }

  public async reorderScriptPages(
    items: readonly { id: string; sortOrder: number }[]
  ): Promise<void> {
    await db.transaction(async (transaction) => {
      for (const item of items) {
        await transaction
          .update(scriptPages)
          .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
          .where(eq(scriptPages.id, item.id));
      }
    });
  }

  public async saveScriptPageMarking(id: string, marking: unknown): Promise<void> {
    await db
      .update(scriptPages)
      .set({ markedAt: new Date(), marking, updatedAt: new Date() })
      .where(eq(scriptPages.id, id));
  }

  /**
   * Claims an answer for a teacher, or renews their own claim. A claim whose
   * `expires_at` has passed belongs to nobody, so it is taken over rather than
   * waited on -- a dead browser tab must not hold a paper hostage.
   */
  public async acquireMarkingLock(input: {
    expiresAt: Date;
    lockedById: string;
    submissionAnswerId: string;
  }): Promise<boolean> {
    const now = new Date();
    const [record] = await db
      .insert(answerMarkingLocks)
      .values(input)
      .onConflictDoUpdate({
        set: { expiresAt: input.expiresAt, lockedById: input.lockedById, updatedAt: now },
        target: answerMarkingLocks.submissionAnswerId,
        setWhere: sql`${answerMarkingLocks.lockedById} = ${input.lockedById} or ${answerMarkingLocks.expiresAt} < ${now}`
      })
      .returning({ submissionAnswerId: answerMarkingLocks.submissionAnswerId });

    return record !== undefined;
  }

  public async releaseMarkingLock(submissionAnswerId: string, lockedById: string): Promise<void> {
    await db
      .delete(answerMarkingLocks)
      .where(
        and(
          eq(answerMarkingLocks.submissionAnswerId, submissionAnswerId),
          eq(answerMarkingLocks.lockedById, lockedById)
        )
      );
  }

  /** Live claims only -- an expired row is not a lock. */
  public async listMarkingLocksByAnswerIds(
    answerIds: readonly string[]
  ): Promise<readonly MarkingLockRecord[]> {
    if (answerIds.length === 0) {
      return [];
    }

    return db
      .select({
        expiresAt: answerMarkingLocks.expiresAt,
        lockedById: answerMarkingLocks.lockedById,
        lockedByName: users.name,
        submissionAnswerId: answerMarkingLocks.submissionAnswerId
      })
      .from(answerMarkingLocks)
      .innerJoin(users, eq(users.id, answerMarkingLocks.lockedById))
      .where(
        and(
          inArray(answerMarkingLocks.submissionAnswerId, [...answerIds]),
          gt(answerMarkingLocks.expiresAt, new Date())
        )
      );
  }
}
