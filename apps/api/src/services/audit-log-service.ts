import { logger } from "@/lib/logger";
import type {
  AuditLogQuery,
  AuditLogRecord} from "@/repositories/audit-log-repository";
import {
  type AuditLogRepository
} from "@/repositories/audit-log-repository";

export interface LogAuditActionInput {
  action: string;
  actorId: string | null;
  entityId: string;
  entityType: string;
  metadata?: Record<string, string | number | boolean | null> | undefined;
}

export class AuditLogService {
  public constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Fire-and-forget by design: a failed audit write must never fail the
   * action it is describing. A missed log entry is recoverable; a refund or
   * a course publish silently failing because logging hiccuped is not.
   */
  public log(input: LogAuditActionInput): void {
    this.auditLogRepository.create(input).catch((writeError: unknown) => {
      logger.error({ action: input.action, error: writeError }, "Failed to write audit log entry");
    });
  }

  public async list(
    query: AuditLogQuery
  ): Promise<{ items: readonly AuditLogRecord[]; total: number }> {
    return this.auditLogRepository.list(query);
  }

  public async listActions(): Promise<readonly string[]> {
    return this.auditLogRepository.listDistinctActions();
  }

  /** Retention sweep entry point for the cleanup worker. */
  public async pruneOlderThan(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    return this.auditLogRepository.deleteOlderThan(cutoff);
  }
}
