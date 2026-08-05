import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { requireQueue } from "@/lib/queues";
import { createQueueConnection } from "@/lib/redis";
import { AuditLogRepository } from "@/repositories/audit-log-repository";
import { AuditLogService } from "@/services/audit-log-service";

// A worker with no queue is a process pretending to work. Exit loudly instead,
// so `docker ps` and a restart loop show it rather than hiding it. ADR-0015.
if (!env.isRedisEnabled) {
  logger.error("REDIS_ENABLED is false; this worker has no queue to read and will not start");
  process.exit(1);
}

const AUDIT_LOG_RETENTION_DAYS = 90;
const CLEANUP_JOB_ID = "audit-log-cleanup-daily";

const auditLogService = new AuditLogService(new AuditLogRepository());

const worker = new Worker(
  "audit-log-cleanup",
  async () => {
    const deletedCount = await auditLogService.pruneOlderThan(AUDIT_LOG_RETENTION_DAYS);

    logger.info({ deletedCount }, "Audit log retention sweep complete");
  },
  {
    connection: createQueueConnection(),
    concurrency: 1
  }
);

worker.on("failed", (job, error) => {
  logger.error({ error, jobId: job?.id }, "Audit log cleanup worker job failed");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Audit log cleanup worker job completed");
});

// upsertJobScheduler is idempotent on jobSchedulerId, so re-registering this
// on every worker boot is safe -- it does not pile up duplicate schedules.
await requireQueue("audit-log-cleanup").upsertJobScheduler(CLEANUP_JOB_ID, { pattern: "0 3 * * *" }, {
  name: "prune"
});

logger.info({ host: env.API_HOST }, "Audit log cleanup worker started");
