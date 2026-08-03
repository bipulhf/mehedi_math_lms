import type { AuthUser } from "@genex/auth/server";
import { buildImageVariantKey, type UploadKind, type UploadPurpose, withImageVariants } from "@genex/shared";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { queues } from "@/lib/queues";
import {
  createSignedUploadUrl,
  deleteStoredFile,
  getPublicFileUrl,
  readStoredFile,
  writeStoredFile
} from "@/lib/s3";
import type { UploadRepository} from "@/repositories/upload-repository";
import { type UploadRecord } from "@/repositories/upload-repository";
import { generateImageVariants, isResizableImage } from "@/services/image-variants";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

/**
 * The bucket, behind an interface, so the confirm and delete paths can be tested
 * without one. Mirrors `StoredFileReader` in the file-processing processor --
 * this workspace injects its way around S3 rather than mocking the module.
 */
export interface UploadFileStore {
  delete: (key: string) => Promise<void>;
  read: (key: string) => Promise<Uint8Array>;
  write: (key: string, body: Uint8Array, contentType: string) => Promise<void>;
}

function requireS3Configuration(): void {
  if (!env.isS3Configured) {
    throw new ConflictError("S3 upload is not configured");
  }
}

/**
 * The configuration guard lives here rather than at each call site, so a new
 * path through the bucket cannot forget it and crash where it should 409.
 */
export const s3UploadFileStore: UploadFileStore = {
  delete: async (key: string) => {
    requireS3Configuration();
    await deleteStoredFile(key);
  },
  read: async (key: string) => {
    requireS3Configuration();

    return readStoredFile(key);
  },
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
    private readonly fileStore: UploadFileStore = s3UploadFileStore
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
    if (!isResizableImage(upload.contentType)) {
      return upload;
    }

    try {
      const original = await this.fileStore.read(upload.fileKey);
      const variants = await generateImageVariants(original, upload.contentType);

      if (variants.length === 0) {
        return upload;
      }

      await Promise.all(
        variants.map(async (variant) =>
          this.fileStore.write(
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

  public async createPresignedUpload(
    actor: AuthUser,
    input: CreatePresignedUploadRequest
  ): Promise<PreparedUploadResponse> {
    requireS3Configuration();

    this.validateUploadInput(input);
    const extension = getFileExtension(input.fileName, input.contentType);
    const key = this.buildStorageKey(input.purpose, actor.id, extension);
    const fileUrl = getPublicFileUrl(key);
    const uploadUrl = await createSignedUploadUrl(key, input.contentType);
    const upload = await this.uploadRepository.createPendingUpload({
      contentType: input.contentType.toLowerCase(),
      fileExtension: extension,
      fileKey: key,
      fileSize: input.fileSize,
      fileUrl,
      kind: resolveUploadKind(input.contentType.toLowerCase()),
      originalFileName: input.fileName.trim(),
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
      await queues["file-processing"].add("extract-video-metadata", {
        contentType: confirmedUpload.contentType,
        fileKey: confirmedUpload.fileKey,
        uploadId: confirmedUpload.id
      });
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
    // The store carries the "S3 is not configured" 409 now, so this reads as one
    // delete of the original and then of its copies.
    await this.fileStore.delete(upload.fileKey);
    // The row is the only record of which copies exist. Guessing the widths
    // instead would orphan every variant the day that list changes.
    await Promise.all(
      (upload.variantWidths ?? []).map(async (width) =>
        this.fileStore.delete(buildImageVariantKey(upload.fileKey, width))
      )
    );
    await this.uploadRepository.deleteUpload(uploadId);
  }
}
