import { logger } from "@/lib/logger";
import { fetchObjectRange, fetchObjectSize } from "@/lib/object-url-fetch";
import type { UploadRepository } from "@/repositories/upload-repository";
import { readVideoMetadata, type VideoMetadata } from "@/services/video-metadata";

export interface ExtractVideoMetadataJob {
  contentType: string;
  uploadId: string;
}

/** Injected so the processor can be tested without S3. */
export interface StoredFileReader {
  getSize: (fileUrl: string) => Promise<number | null>;
  readRange: (fileUrl: string, start: number, endInclusive: number) => Promise<Uint8Array>;
}

export const objectUrlStoredFileReader: StoredFileReader = {
  getSize: fetchObjectSize,
  readRange: fetchObjectRange
};

/**
 * Only ISO base media containers can be read by `video-metadata`. WebM and
 * friends are accepted uploads, so the job succeeds and records nothing rather
 * than failing and retrying forever.
 */
export function isParsableVideoContainer(contentType: string): boolean {
  const normalised = contentType.toLowerCase();

  return (
    normalised === "video/mp4" ||
    normalised === "video/quicktime" ||
    normalised === "video/x-m4v" ||
    normalised === "application/mp4"
  );
}

export async function processVideoMetadataJob(
  uploadRepository: UploadRepository,
  reader: StoredFileReader,
  job: ExtractVideoMetadataJob
): Promise<VideoMetadata | null> {
  if (!isParsableVideoContainer(job.contentType)) {
    logger.info(
      { contentType: job.contentType, uploadId: job.uploadId },
      "Skipping video metadata extraction for an unsupported container"
    );

    return null;
  }

  const upload = await uploadRepository.findUploadById(job.uploadId);

  if (!upload) {
    logger.warn(
      { uploadId: job.uploadId },
      "Upload disappeared before metadata could be extracted"
    );

    return null;
  }

  const fileSize = await reader.getSize(upload.fileUrl);

  if (fileSize === null || fileSize <= 0) {
    logger.warn(
      { fileUrl: upload.fileUrl, uploadId: job.uploadId },
      "Stored video has no readable size"
    );

    return null;
  }

  const metadata = await readVideoMetadata(
    (start, endInclusive) => reader.readRange(upload.fileUrl, start, endInclusive),
    fileSize
  );

  if (metadata.durationInSeconds === null && metadata.width === null && metadata.height === null) {
    logger.warn({ uploadId: job.uploadId }, "No usable metadata found in the video container");

    return metadata;
  }

  await uploadRepository.updateMediaMetadata({
    durationInSeconds: metadata.durationInSeconds,
    height: metadata.height,
    id: job.uploadId,
    width: metadata.width
  });

  logger.info({ ...metadata, uploadId: job.uploadId }, "Video metadata extracted");

  return metadata;
}
