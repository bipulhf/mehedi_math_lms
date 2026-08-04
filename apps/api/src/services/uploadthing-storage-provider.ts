import { UTApi } from "uploadthing/server";

import { env } from "@/lib/env";
import type { StorageProviderAdapter } from "@/services/storage-provider";

export class UploadThingStorageProvider implements StorageProviderAdapter {
  public readonly provider = "uploadthing" as const;
  private readonly api = new UTApi({ token: env.UPLOADTHING_TOKEN });

  public async prepareUpload(): Promise<{ fileUrl: string; uploadUrl: string }> {
    throw new Error("UploadThing uploads must use the UploadThing client route");
  }

  public async delete(key: string): Promise<void> {
    await this.api.deleteFiles(key);
  }
}
