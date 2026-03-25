import {
  and,
  count,
  db,
  desc,
  enrollments,
  eq,
  inArray,
  smsBatches,
  smsRecipients,
  studentProfiles,
  teacherProfiles,
  users
} from "@mma/db";
import type { UserRole } from "@mma/shared";

export type SmsBatchStatus = "QUEUED" | "SENDING" | "COMPLETED" | "FAILED";
export type SmsRecipientStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED_NO_PHONE";
export type SmsTargetKind = "ALL_STUDENTS" | "ROLE" | "COURSE";

export interface SmsBatchRecord {
  completedAt: Date | null;
  courseId: string | null;
  createdAt: Date;
  createdByUserId: string;
  failedCount: number;
  id: string;
  messageBody: string;
  providerLastResponse: string | null;
  sentCount: number;
  skippedCount: number;
  status: SmsBatchStatus;
  targetKind: SmsTargetKind;
  targetRole: UserRole | null;
  totalRecipients: number;
}

export interface SmsRecipientRecord {
  batchId: string;
  errorMessage: string | null;
  id: string;
  phoneE164: string | null;
  status: SmsRecipientStatus;
  updatedAt: Date;
  userId: string | null;
}

export interface SmsBatchListRow extends SmsBatchRecord {
  createdByName: string;
}

export class SmsRepository {
  public async listActiveStudentPhones(): Promise<
    readonly { phone: string | null; userId: string }[]
  > {
    return db
      .select({
        phone: studentProfiles.phone,
        userId: users.id
      })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(
        and(eq(users.role, "STUDENT"), eq(users.isActive, true), eq(users.banned, false))
      );
  }

  public async listPhonesForRole(role: UserRole): Promise<readonly { phone: string | null; userId: string }[]> {
    if (role === "STUDENT") {
      return this.listActiveStudentPhones();
    }

    if (role === "TEACHER") {
      return db
        .select({
          phone: teacherProfiles.phone,
          userId: users.id
        })
        .from(users)
        .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
        .where(and(eq(users.role, "TEACHER"), eq(users.isActive, true), eq(users.banned, false)));
    }

    return [];
  }

  public async listPhonesForCourseEnrollments(
    courseId: string
  ): Promise<readonly { phone: string | null; userId: string }[]> {
    return db
      .selectDistinct({
        phone: studentProfiles.phone,
        userId: users.id
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(
        and(
          eq(enrollments.courseId, courseId),
          inArray(enrollments.status, ["ACTIVE", "COMPLETED"]),
          eq(users.isActive, true),
          eq(users.banned, false)
        )
      );
  }

  public async createBatchWithRecipients(input: {
    createdByUserId: string;
    courseId: string | null;
    failedCount: number;
    messageBody: string;
    recipients: readonly {
      phoneE164: string | null;
      status: SmsRecipientStatus;
      userId: string | null;
    }[];
    sentCount: number;
    skippedCount: number;
    status: SmsBatchStatus;
    targetKind: SmsTargetKind;
    targetRole: UserRole | null;
    totalRecipients: number;
  }): Promise<{ batchId: string }> {
    return db.transaction(async (tx) => {
      const [batch] = await tx
        .insert(smsBatches)
        .values({
          courseId: input.courseId,
          createdByUserId: input.createdByUserId,
          failedCount: input.failedCount,
          messageBody: input.messageBody,
          sentCount: input.sentCount,
          skippedCount: input.skippedCount,
          status: input.status,
          targetKind: input.targetKind,
          targetRole: input.targetRole,
          totalRecipients: input.totalRecipients
        })
        .returning({ id: smsBatches.id });

      if (!batch) {
        throw new Error("Failed to create SMS batch");
      }

      if (input.recipients.length > 0) {
        await tx.insert(smsRecipients).values(
          input.recipients.map((recipient) => ({
            batchId: batch.id,
            phoneE164: recipient.phoneE164,
            status: recipient.status,
            userId: recipient.userId
          }))
        );
      }

      return { batchId: batch.id };
    });
  }

  public async getBatchById(id: string): Promise<SmsBatchRecord | null> {
    const [row] = await db
      .select({
        completedAt: smsBatches.completedAt,
        courseId: smsBatches.courseId,
        createdAt: smsBatches.createdAt,
        createdByUserId: smsBatches.createdByUserId,
        failedCount: smsBatches.failedCount,
        id: smsBatches.id,
        messageBody: smsBatches.messageBody,
        providerLastResponse: smsBatches.providerLastResponse,
        sentCount: smsBatches.sentCount,
        skippedCount: smsBatches.skippedCount,
        status: smsBatches.status,
        targetKind: smsBatches.targetKind,
        targetRole: smsBatches.targetRole,
        totalRecipients: smsBatches.totalRecipients
      })
      .from(smsBatches)
      .where(eq(smsBatches.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...row,
      status: row.status as SmsBatchStatus,
      targetKind: row.targetKind as SmsTargetKind,
      targetRole: row.targetRole as UserRole | null
    };
  }

  public async listBatches(params: { limit: number; page: number }): Promise<{
    items: readonly SmsBatchListRow[];
    total: number;
  }> {
    const offset = (params.page - 1) * params.limit;

    const [totalRow] = await db.select({ total: count() }).from(smsBatches);

    const rows = await db
      .select({
        completedAt: smsBatches.completedAt,
        courseId: smsBatches.courseId,
        createdAt: smsBatches.createdAt,
        createdByName: users.name,
        createdByUserId: smsBatches.createdByUserId,
        failedCount: smsBatches.failedCount,
        id: smsBatches.id,
        messageBody: smsBatches.messageBody,
        providerLastResponse: smsBatches.providerLastResponse,
        sentCount: smsBatches.sentCount,
        skippedCount: smsBatches.skippedCount,
        status: smsBatches.status,
        targetKind: smsBatches.targetKind,
        targetRole: smsBatches.targetRole,
        totalRecipients: smsBatches.totalRecipients
      })
      .from(smsBatches)
      .innerJoin(users, eq(smsBatches.createdByUserId, users.id))
      .orderBy(desc(smsBatches.createdAt))
      .limit(params.limit)
      .offset(offset);

    return {
      items: rows.map((row) => ({
        ...row,
        status: row.status as SmsBatchStatus,
        targetKind: row.targetKind as SmsTargetKind,
        targetRole: row.targetRole as UserRole | null
      })),
      total: Number(totalRow?.total ?? 0)
    };
  }

  public async updateBatch(
    id: string,
    patch: Partial<{
      completedAt: Date | null;
      failedCount: number;
      providerLastResponse: string | null;
      sentCount: number;
      skippedCount: number;
      status: SmsBatchStatus;
    }>
  ): Promise<void> {
    await db.update(smsBatches).set(patch).where(eq(smsBatches.id, id));
  }

  public async listPendingRecipients(batchId: string): Promise<readonly SmsRecipientRecord[]> {
    const rows = await db
      .select({
        batchId: smsRecipients.batchId,
        errorMessage: smsRecipients.errorMessage,
        id: smsRecipients.id,
        phoneE164: smsRecipients.phoneE164,
        status: smsRecipients.status,
        updatedAt: smsRecipients.updatedAt,
        userId: smsRecipients.userId
      })
      .from(smsRecipients)
      .where(and(eq(smsRecipients.batchId, batchId), eq(smsRecipients.status, "PENDING")));

    return rows.map((row) => ({
      ...row,
      status: row.status as SmsRecipientStatus
    }));
  }

  public async updateRecipient(
    id: string,
    input: { errorMessage?: string | null; status: SmsRecipientStatus }
  ): Promise<void> {
    await db
      .update(smsRecipients)
      .set({
        errorMessage: input.errorMessage ?? null,
        status: input.status,
        updatedAt: new Date()
      })
      .where(eq(smsRecipients.id, id));
  }

  public async countRecipientsByStatuses(
    batchId: string,
    statuses: readonly SmsRecipientStatus[]
  ): Promise<number> {
    const [row] = await db
      .select({ c: count() })
      .from(smsRecipients)
      .where(and(eq(smsRecipients.batchId, batchId), inArray(smsRecipients.status, statuses)));

    return Number(row?.c ?? 0);
  }
}
