import type { AuthUser } from "@genex/auth/server";
import {
  buildImageVariantKey,
  scriptPageContentType,
  type StorageProvider,
  type UploadKind,
  type UploadPurpose,
  withImageVariants
} from "@genex/shared";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fetchObjectBytes } from "@/lib/object-url-fetch";
import { enqueue } from "@/lib/queues";
import {
  objectUrlStoredFileReader,
  processVideoMetadataJob
} from "@/services/file-processing-processor";
import { writeStoredFile } from "@/lib/s3";
import type { UploadRepository, UploadRecord } from "@/repositories/upload-repository";
import {
  generateImageVariants,
  isResizableImage,
  sizeDownScriptPage
} from "@/services/image-variants";
import { S3StorageProvider } from "@/services/s3-storage-provider";
import type { StorageProviderAdapter, StorageProviderAdapters } from "@/services/storage-provider";
import { UploadThingStorageProvider } from "@/services/uploadthing-storage-provider";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface VariantFileWriter {
  write: (key: string, body: Uint8Array, contentType: string) => Promise<void>;
}

function requireS3Configuration(): void {
  if (!env.isS3Configured) {
    throw new ConflictError("S3 upload is not configured");
  }
}

export const s3VariantFileWriter: VariantFileWriter = {
  write: async (key: string, body: Uint8Array, contentType: string) => {
    requireS3Configuration();
    await writeStoredFile(key, body, contentType);
  }
};

export interface CreatePresignedUploadRequest {
  contentType: string;
  fileName: string;
  fileSize: number;
  purpose: UploadPurpose;
}

export interface ConfirmUploadRequest {
  durationInSeconds?: number | undefined;
  height?: number | undefined;
  uploadId: string;
  width?: number | undefined;
}

export interface PreparedUploadResponse {
  fileUrl: string;
  id: string;
  key: string;
  purpose: UploadPurpose;
  status: UploadRecord["status"];
  uploadUrl: string;
}

export interface UploadResponse extends Omit<
  UploadRecord,
  "createdAt" | "updatedAt" | "confirmedAt"
> {
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UploadPurposeConfig {
  allowedContentTypes: readonly string[];
  maxFileSize: number;
  pathSegment: string;
}

const uploadPurposeConfig: Record<UploadPurpose, UploadPurposeConfig> = {
  /**
   * A photographed page of an Answer Script. The client has already sized it
   * down and re-encoded it to JPEG, which is why the cap is small and the type
   * list is one entry — anything else means the capture path was bypassed.
   * ADR-0009.
   */
  ANSWER_SCRIPT_PAGE: {
    allowedContentTypes: [scriptPageContentType],
    maxFileSize: 8 * 1024 * 1024,
    pathSegment: "answer-scripts"
  },
  BUG_SCREENSHOT: {
    allowedContentTypes: ["image/*"],
    maxFileSize: 5 * 1024 * 1024,
    pathSegment: "bug-screenshots"
  },
  COURSE_COVER: {
    allowedContentTypes: ["image/*"],
    maxFileSize: 5 * 1024 * 1024,
    pathSegment: "course-covers"
  },
  COURSE_MATERIAL: {
    allowedContentTypes: [
      "image/*",
      "application/pdf",
      "application/msword",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    maxFileSize: 50 * 1024 * 1024,
    pathSegment: "course-materials"
  },
  LECTURE_VIDEO: {
    allowedContentTypes: ["video/*"],
    maxFileSize: 500 * 1024 * 1024,
    pathSegment: "lecture-videos"
  },
  PROFILE_PHOTO: {
    allowedContentTypes: ["image/*"],
    maxFileSize: 5 * 1024 * 1024,
    pathSegment: "profile-photos"
  },
  QUESTION_IMAGE: {
    allowedContentTypes: ["image/*"],
    maxFileSize: 10 * 1024 * 1024,
    pathSegment: "question-images"
  }
};

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesContentType(pattern: string, contentType: string): boolean {
  if (pattern.endsWith("/*")) {
    return contentType.startsWith(pattern.slice(0, pattern.length - 1));
  }

  return pattern === contentType;
}

function createValidationIssue(field: string, message: string): ValidationError {
  return new ValidationError(message, [
    {
      field,
      message
    }
  ]);
}

function resolveUploadKind(contentType: string): UploadKind {
  if (contentType.startsWith("image/")) {
    return "IMAGE";
  }

  if (contentType.startsWith("video/")) {
    return "VIDEO";
  }

  return "DOCUMENT";
}

function formatUploadRecord(record: UploadRecord): UploadResponse {
  return {
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    contentType: record.contentType,
    createdAt: record.createdAt.toISOString(),
    durationInSeconds: record.durationInSeconds,
    fileExtension: record.fileExtension,
    fileKey: record.fileKey,
    fileSize: record.fileSize,
    fileUrl: record.fileUrl,
    height: record.height,
    id: record.id,
    kind: record.kind,
    originalFileName: record.originalFileName,
    provider: record.provider,
    purpose: record.purpose,
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
    userId: record.userId,
    variantWidths: record.variantWidths,
    width: record.width
  };
}

function getFileExtension(fileName: string, contentType: string): string {
  const sanitizedFileName = sanitizeFileName(fileName);
  const nameParts = sanitizedFileName.split(".");
  const lastPart = nameParts.at(-1);

  if (lastPart && nameParts.length > 1) {
    return lastPart;
  }

  const fallbackFromType = contentType
    .split("/")
    .at(-1)
    ?.replace(/[^a-z0-9]+/g, "-");

  return fallbackFromType && fallbackFromType.length > 0 ? fallbackFromType : "bin";
}

export class UploadService {
  public constructor(
    private readonly uploadRepository: UploadRepository,
    private readonly storageProviders: StorageProviderAdapters = {
      s3: new S3StorageProvider(),
      uploadthing: new UploadThingStorageProvider()
    },
    private readonly activeProvider: StorageProvider = env.STORAGE_PROVIDER,
    private readonly variantWriter: VariantFileWriter = s3VariantFileWriter
  ) {}

  private validateUploadInput(input: CreatePresignedUploadRequest): UploadPurposeConfig {
    const config = uploadPurposeConfig[input.purpose];
    const normalizedContentType = input.contentType.toLowerCase();
    const isAllowed = config.allowedContentTypes.some((pattern) =>
      matchesContentType(pattern, normalizedContentType)
    );

    if (!isAllowed) {
      throw createValidationIssue(
        "contentType",
        "This file type is not allowed for the selected upload"
      );
    }

    if (input.fileSize > config.maxFileSize) {
      throw createValidationIssue(
        "fileSize",
        `File is too large. Maximum allowed size is ${Math.floor(config.maxFileSize / (1024 * 1024))}MB`
      );
    }

    return config;
  }

  private buildStorageKey(purpose: UploadPurpose, userId: string, extension: string): string {
    const config = uploadPurposeConfig[purpose];

    return `${env.NODE_ENV}/${config.pathSegment}/${userId}/${crypto.randomUUID()}.${extension}`;
  }

  private assertUploadAccess(upload: UploadRecord, actor: AuthUser): void {
    if (upload.userId !== actor.id && actor.role !== "ADMIN") {
      throw new ForbiddenError("You do not have access to this upload");
    }
  }

  /**
   * Resizes a confirmed image into the shared variant widths and stores each one
   * beside the original, then marks the row's URL with the widths that exist.
   *
   * Synchronous rather than queued, and deliberately: the only thing kept
   * downstream is the URL this call returns, and the editor saves it the moment
   * confirm resolves. A worker would finish after that URL had already been
   * written to a course, leaving a marker nobody had put on it.
   *
   * Never fatal. A corrupt file, an unsupported format or S3 refusing the write
   * all end the same way -- the original stands alone, unmarked, and the upload
   * the user just made still succeeds.
   */
  private async storeImageVariants(upload: UploadRecord): Promise<UploadRecord> {
    if (upload.provider !== "s3" || !isResizableImage(upload.contentType)) {
      return upload;
    }

    try {
      const original = await fetchObjectBytes(upload.fileUrl);
      const variants = await generateImageVariants(original, upload.contentType);

      if (variants.length === 0) {
        return upload;
      }

      await Promise.all(
        variants.map(async (variant) =>
          this.variantWriter.write(
            buildImageVariantKey(upload.fileKey, variant.width),
            variant.body,
            variant.contentType
          )
        )
      );

      const variantWidths = variants.map((variant) => variant.width);

      return await this.uploadRepository.recordImageVariants({
        fileUrl: withImageVariants(upload.fileUrl, variantWidths),
        id: upload.id,
        variantWidths
      });
    } catch (error) {
      logger.warn(
        { err: error, uploadId: upload.id },
        "Image variant generation failed; serving the original alone"
      );

      return upload;
    }
  }

  /**
   * Rewrites a Script Page that arrived larger than the cap, over the same key.
   *
   * The client shrinks the photograph before uploading, so this normally finds
   * nothing to do. It exists because nothing else enforces the cap: the upload
   * goes client-direct to storage, and a client that skipped the canvas path —
   * or was never a browser — would otherwise park a camera-sized image in the
   * bucket forever. ADR-0009.
   *
   * Never fatal. If the rewrite fails the page still stands as uploaded, which
   * is worse than intended but better than losing a student's answer.
   */
  private async enforceScriptPageSize(upload: UploadRecord): Promise<UploadRecord> {
    if (upload.provider !== "s3") {
      return upload;
    }

    try {
      const original = await fetchObjectBytes(upload.fileUrl);
      const sizedDown = await sizeDownScriptPage(original);

      if (!sizedDown) {
        return upload;
      }

      await this.variantWriter.write(upload.fileKey, sizedDown.body, scriptPageContentType);

      return (
        (await this.uploadRepository.updateMediaMetadata({
          durationInSeconds: null,
          height: sizedDown.height,
          id: upload.id,
          width: sizedDown.width
        })) ?? upload
      );
    } catch (error) {
      logger.warn(
        { err: error, uploadId: upload.id },
        "Script page size backstop failed; storing the page as uploaded"
      );

      return upload;
    }
  }

  public async prepareUpload(
    actor: AuthUser,
    input: CreatePresignedUploadRequest
  ): Promise<PreparedUploadResponse> {
    this.validateUploadInput(input);
    const extension = getFileExtension(input.fileName, input.contentType);
    const key = this.buildStorageKey(input.purpose, actor.id, extension);
    const storage = this.getStorageProvider(this.activeProvider);
    const { fileUrl, uploadUrl } = await storage.prepareUpload({
      contentType: input.contentType,
      key
    });
    const upload = await this.uploadRepository.createPendingUpload({
      contentType: input.contentType.toLowerCase(),
      fileExtension: extension,
      fileKey: key,
      fileSize: input.fileSize,
      fileUrl,
      kind: resolveUploadKind(input.contentType.toLowerCase()),
      originalFileName: input.fileName.trim(),
      provider: this.activeProvider,
      purpose: input.purpose,
      userId: actor.id
    });

    return {
      fileUrl,
      id: upload.id,
      key,
      purpose: upload.purpose,
      status: upload.status,
      uploadUrl
    };
  }

  public async confirmUpload(
    actor: AuthUser,
    input: ConfirmUploadRequest
  ): Promise<UploadResponse> {
    const upload = await this.uploadRepository.findUploadById(input.uploadId);

    if (!upload) {
      throw new NotFoundError("Upload was not found");
    }

    this.assertUploadAccess(upload, actor);

    if (upload.status !== "PENDING") {
      throw new ConflictError("Upload has already been confirmed");
    }

    const confirmedUpload = await this.uploadRepository.confirmUpload({
      durationInSeconds: input.durationInSeconds,
      height: input.height,
      id: input.uploadId,
      status: "READY",
      width: input.width
    });

    if (confirmedUpload.kind === "VIDEO") {
      await enqueue(
        "file-processing",
        "extract-video-metadata",
        { contentType: confirmedUpload.contentType, uploadId: confirmedUpload.id },
        {},
        async () => {
          await processVideoMetadataJob(this.uploadRepository, objectUrlStoredFileReader, {
            contentType: confirmedUpload.contentType,
            uploadId: confirmedUpload.id
          });
        }
      );
    }

    if (confirmedUpload.purpose === "ANSWER_SCRIPT_PAGE") {
      // The page is the only copy there will ever be, so it is capped before
      // anything else reads it. No variants: a marking canvas wants the page.
      return formatUploadRecord(await this.enforceScriptPageSize(confirmedUpload));
    }

    if (confirmedUpload.kind === "IMAGE") {
      return formatUploadRecord(await this.storeImageVariants(confirmedUpload));
    }

    return formatUploadRecord(confirmedUpload);
  }

  public async deleteUpload(actor: AuthUser, uploadId: string): Promise<void> {
    const upload = await this.uploadRepository.findUploadById(uploadId);

    if (!upload) {
      throw new NotFoundError("Upload was not found");
    }

    this.assertUploadAccess(upload, actor);
    const storage = this.getStorageProvider(upload.provider);
    await storage.delete(upload.fileKey);
    // The row is the only record of which copies exist. Guessing the widths
    // instead would orphan every variant the day that list changes.
    await Promise.all(
      (upload.variantWidths ?? []).map(async (width) =>
        storage.delete(buildImageVariantKey(upload.fileKey, width))
      )
    );
    await this.uploadRepository.deleteUpload(uploadId);
  }

  private getStorageProvider(provider: StorageProvider): StorageProviderAdapter {
    return this.storageProviders[provider];
  }
}
