import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { UploadRepository } from "@/repositories/upload-repository";
import {
  type ExtractVideoMetadataJob,
  objectUrlStoredFileReader,
  processVideoMetadataJob
} from "@/services/file-processing-processor";

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
    connection: redis,
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
