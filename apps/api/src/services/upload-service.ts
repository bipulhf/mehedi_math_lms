import { createSignedUploadUrl, getPublicFileUrl } from "@/lib/s3";
import { env } from "@/lib/env";
import { ConflictError, ValidationError } from "@/utils/errors";

export interface CreateProfilePhotoUploadRequest {
  contentType: string;
  fileName: string;
}

export interface ProfilePhotoUploadResponse {
  key: string;
  publicUrl: string;
  uploadUrl: string;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createImageValidationIssue(field: string, message: string): ValidationError {
  return new ValidationError(message, [
    {
      field,
      message
    }
  ]);
}

export class UploadService {
  private async createUpload(
    folderName: string,
    input: CreateProfilePhotoUploadRequest,
    validator: (contentType: string) => void
  ): Promise<ProfilePhotoUploadResponse> {
    if (!env.isS3Configured) {
      throw new ConflictError("S3 upload is not configured");
    }

    validator(input.contentType);

    const sanitizedFileName = sanitizeFileName(input.fileName);
    const key = `${folderName}/${crypto.randomUUID()}-${sanitizedFileName || "upload"}`;
    const uploadUrl = await createSignedUploadUrl(key, input.contentType);

    return {
      key,
      publicUrl: getPublicFileUrl(key),
      uploadUrl
    };
  }

  private validateImageUpload(contentType: string): void {
    if (!contentType.startsWith("image/")) {
      throw createImageValidationIssue("contentType", "Uploads must be image files");
    }
  }

  private validateCourseMaterialUpload(contentType: string): void {
    const normalizedType = contentType.toLowerCase();
    const isAllowed =
      normalizedType.startsWith("image/") ||
      normalizedType === "application/pdf" ||
      normalizedType === "application/msword" ||
      normalizedType === "application/vnd.ms-powerpoint" ||
      normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      normalizedType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    if (!isAllowed) {
      throw createImageValidationIssue(
        "contentType",
        "Material uploads must be PDF, DOC, DOCX, PPT, PPTX, or image files"
      );
    }
  }

  private validateLectureVideoUpload(contentType: string): void {
    if (!contentType.startsWith("video/")) {
      throw createImageValidationIssue("contentType", "Lecture video uploads must be video files");
    }
  }

  public async createProfilePhotoUpload(
    input: CreateProfilePhotoUploadRequest
  ): Promise<ProfilePhotoUploadResponse> {
    return this.createUpload("profile-photos", input, (contentType) =>
      this.validateImageUpload(contentType)
    );
  }

  public async createBugScreenshotUpload(
    input: CreateProfilePhotoUploadRequest
  ): Promise<ProfilePhotoUploadResponse> {
    return this.createUpload("bug-screenshots", input, (contentType) =>
      this.validateImageUpload(contentType)
    );
  }

  public async createCourseCoverUpload(
    input: CreateProfilePhotoUploadRequest
  ): Promise<ProfilePhotoUploadResponse> {
    return this.createUpload("course-covers", input, (contentType) =>
      this.validateImageUpload(contentType)
    );
  }

  public async createCourseMaterialUpload(
    input: CreateProfilePhotoUploadRequest
  ): Promise<ProfilePhotoUploadResponse> {
    return this.createUpload("course-materials", input, (contentType) =>
      this.validateCourseMaterialUpload(contentType)
    );
  }

  public async createLectureVideoUpload(
    input: CreateProfilePhotoUploadRequest
  ): Promise<ProfilePhotoUploadResponse> {
    return this.createUpload("lecture-videos", input, (contentType) =>
      this.validateLectureVideoUpload(contentType)
    );
  }
}
