import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createQueueConnection } from "@/lib/redis";
import { SmsRepository } from "@/repositories/sms-repository";
import { processSmsBatchJob } from "@/services/sms-batch-processor";
import { OnecodesoftSmsProvider } from "@genex/sms";

// A worker with no queue is a process pretending to work. Exit loudly instead,
// so `docker ps` and a restart loop show it rather than hiding it. ADR-0015.
if (!env.isRedisEnabled) {
  logger.error("REDIS_ENABLED is false; this worker has no queue to read and will not start");
  process.exit(1);
}

const smsRepository = new SmsRepository();
const smsProvider = new OnecodesoftSmsProvider();

interface SmsJobPayload {
  batchId: string;
}

const worker = new Worker<SmsJobPayload>(
  "sms",
  async (job) => {
    await processSmsBatchJob(smsRepository, smsProvider, job.data.batchId);
  },
  {
    connection: createQueueConnection(),
    concurrency: 2
  }
);

worker.on("failed", (job, error) => {
  logger.error({ error, jobId: job?.id }, "SMS worker job failed");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "SMS worker job completed");
});

logger.info({ host: env.API_HOST }, "SMS worker started");
