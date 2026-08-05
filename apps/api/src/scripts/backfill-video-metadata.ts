/**
 * Enqueues an `extract-video-metadata` job for every confirmed video whose
 * duration was never recorded. Those uploads predate the file-processing
 * worker, so nothing ever read their containers.
 *
 * Run once after deploying the worker: `bun run backfill:video-metadata`.
 * It is safe to run again -- an upload that already has a duration is skipped.
 */
import { logger } from "@/lib/logger";
import { requireQueue } from "@/lib/queues";
import { redis } from "@/lib/redis";
import { UploadRepository } from "@/repositories/upload-repository";

const BATCH_SIZE = 500;

async function backfillVideoMetadata(): Promise<void> {
  const uploadRepository = new UploadRepository();
  const pending = await uploadRepository.listVideosMissingMetadata(BATCH_SIZE);

  if (pending.length === 0) {
    logger.info("No videos are missing metadata");

    return;
  }

  for (const upload of pending) {
    await requireQueue("file-processing").add("extract-video-metadata", {
      contentType: upload.contentType,
      fileKey: upload.fileKey,
      uploadId: upload.id
    });
  }

  logger.info({ count: pending.length }, "Queued video metadata extraction");

  if (pending.length === BATCH_SIZE) {
    logger.info({ batchSize: BATCH_SIZE }, "Batch was full; run the backfill again once the queue drains");
  }
}

await backfillVideoMetadata();
await requireQueue("file-processing").close();
redis?.disconnect();
