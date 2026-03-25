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

export class UploadService {
  public async createProfilePhotoUpload(
    input: CreateProfilePhotoUploadRequest
  ): Promise<ProfilePhotoUploadResponse> {
    if (!env.isS3Configured) {
      throw new ConflictError("S3 upload is not configured");
    }

    if (!input.contentType.startsWith("image/")) {
      throw new ValidationError("Only image uploads are allowed", [
        {
          field: "contentType",
          message: "Profile photos must be image files"
        }
      ]);
    }

    const sanitizedFileName = sanitizeFileName(input.fileName);
    const key = `profile-photos/${crypto.randomUUID()}-${sanitizedFileName || "upload"}`;
    const uploadUrl = await createSignedUploadUrl(key, input.contentType);

    return {
      key,
      publicUrl: getPublicFileUrl(key),
      uploadUrl
    };
  }
}
