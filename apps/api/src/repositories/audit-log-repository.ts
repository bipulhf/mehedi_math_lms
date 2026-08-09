import type { SQL } from "@mma/db";
import { and, auditLogs, count, db, desc, eq, gte, ilike, lte, or, users } from "@mma/db";

export interface CreateAuditLogInput {
  action: string;
  actorId: string | null;
  entityId: string;
  entityType: string;
  metadata?: Record<string, string | number | boolean | null> | undefined;
}

export interface AuditLogQuery {
  action?: string | undefined;
  actorSearch?: string | undefined;
  from?: Date | undefined;
  limit: number;
  page: number;
  to?: Date | undefined;
}

export interface AuditLogRecord {
  action: string;
  actor: {
    email: string;
    id: string;
    name: string;
  } | null;
  createdAt: Date;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, string | number | boolean | null> | null;
}

function buildAuditLogFilters(query: AuditLogQuery): SQL<unknown> | undefined {
  const filters: Array<SQL<unknown>> = [];

  if (query.action) {
    filters.push(eq(auditLogs.action, query.action));
  }

  if (query.from) {
    filters.push(gte(auditLogs.createdAt, query.from));
  }

  if (query.to) {
    filters.push(lte(auditLogs.createdAt, query.to));
  }

  if (query.actorSearch && query.actorSearch.trim().length > 0) {
    const searchTerm = `%${query.actorSearch.trim()}%`;
    const searchFilter = or(ilike(users.name, searchTerm), ilike(users.email, searchTerm));

    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (filters.length === 0) {
    return undefined;
  }

  return filters.length === 1 ? filters[0] : and(...filters);
}

export class AuditLogRepository {
  public async create(input: CreateAuditLogInput): Promise<void> {
    await db.insert(auditLogs).values({
      action: input.action,
      actorId: input.actorId,
      entityId: input.entityId,
      entityType: input.entityType,
      metadata: input.metadata
    });
  }

  public async list(
    query: AuditLogQuery
  ): Promise<{ items: readonly AuditLogRecord[]; total: number }> {
    const whereClause = buildAuditLogFilters(query);
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        action: auditLogs.action,
        actorEmail: users.email,
        actorId: auditLogs.actorId,
        actorName: users.name,
        createdAt: auditLogs.createdAt,
        entityId: auditLogs.entityId,
        entityType: auditLogs.entityType,
        id: auditLogs.id,
        metadata: auditLogs.metadata
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(query.limit)
      .offset(offset);

    const totalRows = await db
      .select({ value: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(whereClause);

    return {
      items: rows.map((row) => ({
        action: row.action,
        actor:
          row.actorId && row.actorName && row.actorEmail
            ? { email: row.actorEmail, id: row.actorId, name: row.actorName }
            : null,
        createdAt: row.createdAt,
        entityId: row.entityId,
        entityType: row.entityType,
        id: row.id,
        metadata: row.metadata ?? null
      })),
      total: totalRows[0]?.value ?? 0
    };
  }

  public async listDistinctActions(): Promise<readonly string[]> {
    const rows = await db.selectDistinct({ action: auditLogs.action }).from(auditLogs);

    return rows.map((row) => row.action).sort();
  }

  /** Retention sweep. Deletes every entry older than `cutoff`. */
  public async deleteOlderThan(cutoff: Date): Promise<number> {
    const deletedRows = await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, cutoff))
      .returning({ id: auditLogs.id });

    return deletedRows.length;
  }
}
