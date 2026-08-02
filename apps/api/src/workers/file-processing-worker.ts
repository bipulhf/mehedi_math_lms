import { Worker } from "bullmq";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { UploadRepository } from "@/repositories/upload-repository";
import {
  type ExtractVideoMetadataJob,
  processVideoMetadataJob,
  s3StoredFileReader
} from "@/services/file-processing-processor";

const uploadRepository = new UploadRepository();

const worker = new Worker<ExtractVideoMetadataJob>(
  "file-processing",
  async (job) => {
    if (job.name !== "extract-video-metadata") {
      logger.warn({ jobId: job.id, name: job.name }, "Unknown file-processing job discarded");

      return;
    }

    if (!env.isS3Configured) {
      logger.warn({ jobId: job.id }, "S3 is not configured; file-processing job skipped");

      return;
    }

    await processVideoMetadataJob(uploadRepository, s3StoredFileReader, job.data);
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
