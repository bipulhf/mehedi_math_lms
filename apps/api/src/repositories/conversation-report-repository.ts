import { and, conversationAccessLog, conversationReports, db, desc, eq, isNull } from "@genex/db";

import type { UserRole } from "@genex/shared";

import type {
  ConversationReportListRecord,
  ConversationReportRecord
} from "@/repositories/message-record-mappers";

/**
 * Conversation moderation: reports, the admin access log, and nothing else.
 *
 * Kept apart from `MessageRepository` because it answers a different question —
 * not "what was said" but "who is allowed to read it, and did they". ADR-0004.
 */
export class ConversationReportRepository {
  /** Record a participant's report. Reporting is what unlocks admin access. */
  public async createConversationReport(input: {
    conversationId: string;
    reason: string;
    reporterId: string;
  }): Promise<ConversationReportRecord> {
    const [record] = await db
      .insert(conversationReports)
      .values({
        conversationId: input.conversationId,
        reason: input.reason,
        reporterId: input.reporterId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create conversation report");
    }

    return record;
  }

  /**
   * Whether an unresolved report exists. This is the entire basis of an admin's
   * right to read a conversation — no open report, no access. ADR-0004.
   */
  public async hasOpenReport(conversationId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: conversationReports.id })
      .from(conversationReports)
      .where(
        and(
          eq(conversationReports.conversationId, conversationId),
          isNull(conversationReports.resolvedAt)
        )
      )
      .limit(1);

    return Boolean(row);
  }

  public async listOpenReports(): Promise<readonly ConversationReportListRecord[]> {
    const rows = await db.query.conversationReports.findMany({
      orderBy: [desc(conversationReports.createdAt)],
      where: isNull(conversationReports.resolvedAt),
      with: {
        conversation: {
          columns: { id: true },
          with: {
            participantOne: { columns: { id: true, name: true, role: true } },
            participantTwo: { columns: { id: true, name: true, role: true } }
          }
        },
        reporter: { columns: { id: true, name: true, role: true } }
      }
    });

    return rows.map((row) => ({
      conversationId: row.conversationId,
      createdAt: row.createdAt,
      id: row.id,
      participants: [
        {
          id: row.conversation.participantOne.id,
          name: row.conversation.participantOne.name,
          role: row.conversation.participantOne.role as UserRole
        },
        {
          id: row.conversation.participantTwo.id,
          name: row.conversation.participantTwo.name,
          role: row.conversation.participantTwo.role as UserRole
        }
      ],
      reason: row.reason,
      reporter: {
        id: row.reporter.id,
        name: row.reporter.name,
        role: row.reporter.role as UserRole
      },
      reporterId: row.reporterId,
      resolvedAt: row.resolvedAt,
      resolvedById: row.resolvedById
    }));
  }

  public async resolveReport(
    reportId: string,
    resolvedById: string
  ): Promise<ConversationReportRecord | null> {
    const [record] = await db
      .update(conversationReports)
      .set({
        resolvedAt: new Date(),
        resolvedById
      })
      .where(and(eq(conversationReports.id, reportId), isNull(conversationReports.resolvedAt)))
      .returning();

    return record ?? null;
  }

  /** Every admin read of a reported conversation, recorded. ADR-0004. */
  public async recordAdminAccess(conversationId: string, adminId: string): Promise<void> {
    await db.insert(conversationAccessLog).values({
      adminId,
      conversationId
    });
  }
}
