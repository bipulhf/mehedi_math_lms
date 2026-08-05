import { auditLogService } from "@/lib/container";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * The ninety-day audit sweep, for a deployment with no scheduler.
 *
 * With Redis this is a BullMQ repeatable job owned by
 * `workers/audit-log-cleanup-worker.ts`. Without one there is no worker and no
 * scheduler, and audit logs would grow without limit — quietly, for months,
 * until somebody notices the table. So the API process runs it itself: once
 * shortly after boot, then daily.
 *
 * It is deliberately not clever. There is no lock, because with Redis off there
 * is one process (ADR-0015); a second one would delete rows the first already
 * deleted, which is harmless.
 */

const RETENTION_DAYS = 90;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
/** Late enough that a boot loop does not run it repeatedly. */
const FIRST_RUN_DELAY_MS = 60_000;

async function sweep(): Promise<void> {
  try {
    const removed = await auditLogService.pruneOlderThan(RETENTION_DAYS);

    logger.info({ removed, retentionDays: RETENTION_DAYS }, "Audit log retention sweep finished");
  } catch (error) {
    logger.error({ err: error }, "Audit log retention sweep failed");
  }
}

export function startAuditLogRetention(): void {
  if (env.isRedisEnabled) {
    return;
  }

  const first = setTimeout(() => void sweep(), FIRST_RUN_DELAY_MS);
  const daily = setInterval(() => void sweep(), DAY_IN_MS);

  // Neither timer should hold the process open at shutdown.
  first.unref();
  daily.unref();
}
