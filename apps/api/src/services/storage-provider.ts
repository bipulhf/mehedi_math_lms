import type { StorageProvider } from "@genex/shared";

export interface PreparedUpload {
  id: string;
  provider: StorageProvider;
  uploadUrl?: string | undefined;
}

export interface StorageProviderAdapter {
  readonly provider: StorageProvider;
  delete(key: string): Promise<void>;
  prepareUpload(input: { contentType: string; key: string }): Promise<{
    fileUrl: string;
    uploadUrl: string;
  }>;
}

export type StorageProviderAdapters = Record<StorageProvider, StorageProviderAdapter>;
