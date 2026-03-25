import { db, eq, uploads } from "@mma/db";
import type { UploadKind, UploadPurpose, UploadStatus } from "@mma/shared";

export interface UploadRecord {
  confirmedAt: Date | null;
  contentType: string;
  createdAt: Date;
  durationInSeconds: number | null;
  fileExtension: string;
  fileKey: string;
  fileSize: number;
  fileUrl: string;
  height: number | null;
  id: string;
  kind: UploadKind;
  originalFileName: string;
  purpose: UploadPurpose;
  status: UploadStatus;
  updatedAt: Date;
  userId: string;
  width: number | null;
}

interface CreatePendingUploadInput {
  contentType: string;
  fileExtension: string;
  fileKey: string;
  fileSize: number;
  fileUrl: string;
  kind: UploadKind;
  originalFileName: string;
  purpose: UploadPurpose;
  userId: string;
}

interface ConfirmUploadInput {
  durationInSeconds?: number | undefined;
  height?: number | undefined;
  id: string;
  status: UploadStatus;
  width?: number | undefined;
}

function mapUploadRecord(record: typeof uploads.$inferSelect): UploadRecord {
  return {
    confirmedAt: record.confirmedAt,
    contentType: record.contentType,
    createdAt: record.createdAt,
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
    updatedAt: record.updatedAt,
    userId: record.userId,
    width: record.width
  };
}

export class UploadRepository {
  public async createPendingUpload(input: CreatePendingUploadInput): Promise<UploadRecord> {
    const [record] = await db
      .insert(uploads)
      .values({
        contentType: input.contentType,
        fileExtension: input.fileExtension,
        fileKey: input.fileKey,
        fileSize: input.fileSize,
        fileUrl: input.fileUrl,
        kind: input.kind,
        originalFileName: input.originalFileName,
        purpose: input.purpose,
        userId: input.userId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create upload record");
    }

    return mapUploadRecord(record);
  }

  public async findUploadById(id: string): Promise<UploadRecord | null> {
    const [record] = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);

    return record ? mapUploadRecord(record) : null;
  }

  public async confirmUpload(input: ConfirmUploadInput): Promise<UploadRecord> {
    const [record] = await db
      .update(uploads)
      .set({
        confirmedAt: new Date(),
        durationInSeconds: input.durationInSeconds,
        height: input.height,
        status: input.status,
        updatedAt: new Date(),
        width: input.width
      })
      .where(eq(uploads.id, input.id))
      .returning();

    if (!record) {
      throw new Error("Failed to confirm upload record");
    }

    return mapUploadRecord(record);
  }

  public async deleteUpload(id: string): Promise<void> {
    await db.delete(uploads).where(eq(uploads.id, id));
  }
}
