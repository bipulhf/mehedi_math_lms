import type { StorageProviderAdapter } from "@/services/storage-provider";
import { ConflictError } from "@/utils/errors";
import { env } from "@/lib/env";
import { createSignedUploadUrl, deleteStoredFile, getPublicFileUrl } from "@/lib/s3";

function requireS3Configuration(): void {
  if (!env.isS3Configured) {
    throw new ConflictError("S3 upload is not configured");
  }
}

export class S3StorageProvider implements StorageProviderAdapter {
  public readonly provider = "s3" as const;

  public async prepareUpload(input: {
    contentType: string;
    key: string;
  }): Promise<{ fileUrl: string; uploadUrl: string }> {
    requireS3Configuration();

    return {
      fileUrl: getPublicFileUrl(input.key),
      uploadUrl: await createSignedUploadUrl(input.key, input.contentType)
    };
  }

  public async delete(key: string): Promise<void> {
    requireS3Configuration();
    await deleteStoredFile(key);
  }
}
