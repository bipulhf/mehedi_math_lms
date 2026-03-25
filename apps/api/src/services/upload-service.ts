import type { AuthUser } from "@mma/auth";
import type { UploadKind, UploadPurpose } from "@mma/shared";

import { env } from "@/lib/env";
import { queues } from "@/lib/queues";
import { createSignedUploadUrl, deleteStoredFile, getPublicFileUrl } from "@/lib/s3";
import { UploadRepository, type UploadRecord } from "@/repositories/upload-repository";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

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

export interface UploadResponse extends Omit<UploadRecord, "createdAt" | "updatedAt" | "confirmedAt"> {
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

  const fallbackFromType = contentType.split("/").at(-1)?.replace(/[^a-z0-9]+/g, "-");

  return fallbackFromType && fallbackFromType.length > 0 ? fallbackFromType : "bin";
}

export class UploadService {
  public constructor(private readonly uploadRepository: UploadRepository) {}

  private requireS3Configuration(): void {
    if (!env.isS3Configured) {
      throw new ConflictError("S3 upload is not configured");
    }
  }

  private validateUploadInput(input: CreatePresignedUploadRequest): UploadPurposeConfig {
    const config = uploadPurposeConfig[input.purpose];
    const normalizedContentType = input.contentType.toLowerCase();
    const isAllowed = config.allowedContentTypes.some((pattern) =>
      matchesContentType(pattern, normalizedContentType)
    );

    if (!isAllowed) {
      throw createValidationIssue("contentType", "This file type is not allowed for the selected upload");
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

  public async createPresignedUpload(
    actor: AuthUser,
    input: CreatePresignedUploadRequest
  ): Promise<PreparedUploadResponse> {
    this.requireS3Configuration();

    const config = this.validateUploadInput(input);
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

  public async confirmUpload(actor: AuthUser, input: ConfirmUploadRequest): Promise<UploadResponse> {
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

    return formatUploadRecord(confirmedUpload);
  }

  public async deleteUpload(actor: AuthUser, uploadId: string): Promise<void> {
    const upload = await this.uploadRepository.findUploadById(uploadId);

    if (!upload) {
      throw new NotFoundError("Upload was not found");
    }

    this.assertUploadAccess(upload, actor);
    this.requireS3Configuration();
    await deleteStoredFile(upload.fileKey);
    await this.uploadRepository.deleteUpload(uploadId);
  }
}
