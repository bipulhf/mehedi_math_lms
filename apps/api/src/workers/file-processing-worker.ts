import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createQueueConnection } from "@/lib/redis";
import { UploadRepository } from "@/repositories/upload-repository";
import {
  type ExtractVideoMetadataJob,
  objectUrlStoredFileReader,
  processVideoMetadataJob
} from "@/services/file-processing-processor";

// A worker with no queue is a process pretending to work. Exit loudly instead,
// so `docker ps` and a restart loop show it rather than hiding it. ADR-0015.
if (!env.isRedisEnabled) {
  logger.error("REDIS_ENABLED is false; this worker has no queue to read and will not start");
  process.exit(1);
}

const uploadRepository = new UploadRepository();

const worker = new Worker<ExtractVideoMetadataJob>(
  "file-processing",
  async (job) => {
    if (job.name !== "extract-video-metadata") {
      logger.warn({ jobId: job.id, name: job.name }, "Unknown file-processing job discarded");

      return;
    }

    await processVideoMetadataJob(uploadRepository, objectUrlStoredFileReader, job.data);
  },
  {
    connection: createQueueConnection(),
    concurrency: 2
  }
);

worker.on("failed", (job, error) => {
  logger.error({ error, jobId: job?.id }, "File processing worker job failed");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "File processing worker job completed");
});

logger.info({ host: env.API_HOST }, "File processing worker started");
