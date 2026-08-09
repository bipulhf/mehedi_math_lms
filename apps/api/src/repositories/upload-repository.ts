import { and, asc, db, eq, isNull, uploads } from "@mma/db";
import type { StorageProvider, UploadKind, UploadPurpose, UploadStatus } from "@mma/shared";

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
  provider: StorageProvider;
  purpose: UploadPurpose;
  status: UploadStatus;
  updatedAt: Date;
  userId: string;
  variantWidths: number[] | null;
  width: number | null;
}

interface CreateUploadInput {
  contentType: string;
  fileExtension: string;
  fileKey: string;
  fileSize: number;
  fileUrl: string;
  kind: UploadKind;
  originalFileName: string;
  provider: StorageProvider;
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

interface RecordImageVariantsInput {
  fileUrl: string;
  id: string;
  variantWidths: number[];
}

interface UpdateMediaMetadataInput {
  durationInSeconds: number | null;
  height: number | null;
  id: string;
  width: number | null;
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
    provider: record.provider,
    purpose: record.purpose,
    status: record.status,
    updatedAt: record.updatedAt,
    userId: record.userId,
    variantWidths: record.variantWidths,
    width: record.width
  };
}

export class UploadRepository {
  public async createPendingUpload(input: CreateUploadInput): Promise<UploadRecord> {
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
        provider: input.provider,
        purpose: input.purpose,
        userId: input.userId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create upload record");
    }

    return mapUploadRecord(record);
  }

  public async createReadyUpload(input: CreateUploadInput): Promise<UploadRecord> {
    const [record] = await db
      .insert(uploads)
      .values({
        confirmedAt: new Date(),
        contentType: input.contentType,
        fileExtension: input.fileExtension,
        fileKey: input.fileKey,
        fileSize: input.fileSize,
        fileUrl: input.fileUrl,
        kind: input.kind,
        originalFileName: input.originalFileName,
        provider: input.provider,
        purpose: input.purpose,
        status: "READY",
        userId: input.userId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create ready upload record");
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

  /**
   * Records the resized copies that now sit beside the original, and the URL
   * that declares them. The URL is written here rather than only returned
   * because it is what every later reader of this row will hand to a browser.
   */
  public async recordImageVariants(input: RecordImageVariantsInput): Promise<UploadRecord> {
    const [record] = await db
      .update(uploads)
      .set({
        fileUrl: input.fileUrl,
        updatedAt: new Date(),
        variantWidths: input.variantWidths
      })
      .where(eq(uploads.id, input.id))
      .returning();

    if (!record) {
      throw new Error("Failed to record image variants");
    }

    return mapUploadRecord(record);
  }

  /**
   * Writes back what the file-processing worker read out of the container.
   * Values the parser could not determine stay as they are, so a client that
   * supplied its own numbers on confirm is never overwritten with nulls.
   */
  public async updateMediaMetadata(input: UpdateMediaMetadataInput): Promise<UploadRecord | null> {
    const [record] = await db
      .update(uploads)
      .set({
        ...(input.durationInSeconds === null ? {} : { durationInSeconds: input.durationInSeconds }),
        ...(input.height === null ? {} : { height: input.height }),
        ...(input.width === null ? {} : { width: input.width }),
        updatedAt: new Date()
      })
      .where(eq(uploads.id, input.id))
      .returning();

    return record ? mapUploadRecord(record) : null;
  }

  /** Confirmed videos whose duration was never determined. Drives the backfill. */
  public async listVideosMissingMetadata(limit: number): Promise<readonly UploadRecord[]> {
    const records = await db
      .select()
      .from(uploads)
      .where(
        and(
          eq(uploads.kind, "VIDEO"),
          eq(uploads.status, "READY"),
          isNull(uploads.durationInSeconds)
        )
      )
      .orderBy(asc(uploads.createdAt))
      .limit(limit);

    return records.map(mapUploadRecord);
  }

  public async deleteUpload(id: string): Promise<void> {
    await db.delete(uploads).where(eq(uploads.id, id));
  }
}
