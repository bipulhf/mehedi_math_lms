import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { SmsRepository } from "@/repositories/sms-repository";
import { processSmsBatchJob } from "@/services/sms-batch-processor";
import { OnecodesoftSmsProvider } from "@/services/onecodesoft-sms-provider";

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
    connection: redis,
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
