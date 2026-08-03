import type { AuthUser } from "@mma/auth/server";
import { readImageVariants } from "@mma/shared";
import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import type { UploadRecord, UploadRepository } from "@/repositories/upload-repository";
import { UploadService, type UploadFileStore } from "@/services/upload-service";

/**
 * The confirm path resizes an image and marks its URL with the widths that now
 * exist beside it. What matters here is not the resize -- `image-variants` tests
 * that -- but that the marker only ever appears when the copies really landed,
 * because a `srcset` candidate that 404s breaks the image it was meant to help.
 */

const ACTOR = { id: "user-1", role: "TEACHER" } as unknown as AuthUser;
const KEY = "test/course-covers/user-1/cover.jpg";
const URL = `https://cdn.example.com/${KEY}`;

async function jpeg(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { background: { b: 200, g: 100, r: 30 }, channels: 3, height, width }
  })
    .jpeg()
    .toBuffer();

  return new Uint8Array(buffer);
}

interface Calls {
  deleted: string[];
  written: string[];
}

function buildService(
  original: Uint8Array,
  options: { contentType?: string; variantWidths?: number[] | null; writeFails?: boolean } = {}
): { calls: Calls; record: () => UploadRecord; service: UploadService } {
  const calls: Calls = { deleted: [], written: [] };
  let stored: UploadRecord = {
    confirmedAt: null,
    contentType: options.contentType ?? "image/jpeg",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    durationInSeconds: null,
    fileExtension: "jpg",
    fileKey: KEY,
    fileSize: original.byteLength,
    fileUrl: URL,
    height: null,
    id: "upload-1",
    kind: "IMAGE",
    originalFileName: "cover.jpg",
    purpose: "COURSE_COVER",
    status: "PENDING",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    userId: "user-1",
    variantWidths: options.variantWidths ?? null,
    width: null
  };

  const uploadRepository = {
    confirmUpload: async () => {
      stored = { ...stored, confirmedAt: new Date(), status: "READY" };

      return stored;
    },
    deleteUpload: async () => undefined,
    findUploadById: async () => stored,
    recordImageVariants: async (input: {
      fileUrl: string;
      id: string;
      variantWidths: number[];
    }) => {
      stored = { ...stored, fileUrl: input.fileUrl, variantWidths: input.variantWidths };

      return stored;
    }
  } as unknown as UploadRepository;

  const fileStore: UploadFileStore = {
    delete: async (key: string) => {
      calls.deleted.push(key);
    },
    read: async () => original,
    write: async (key: string) => {
      if (options.writeFails === true) {
        throw new Error("S3 is having a day");
      }

      calls.written.push(key);
    }
  };

  return { calls, record: () => stored, service: new UploadService(uploadRepository, fileStore) };
}

describe("UploadService.confirmUpload", () => {
  test("stores a variant per width and marks the URL with what exists", async () => {
    const { calls, service } = buildService(await jpeg(1600, 900));
    const response = await service.confirmUpload(ACTOR, { uploadId: "upload-1" });

    expect(calls.written).toEqual([
      "test/course-covers/user-1/cover@400.jpg",
      "test/course-covers/user-1/cover@800.jpg",
      "test/course-covers/user-1/cover@1200.jpg"
    ]);
    expect(response.variantWidths).toEqual([400, 800, 1200]);
    expect(readImageVariants(response.fileUrl).variants.map((variant) => variant.width)).toEqual([
      400, 800, 1200
    ]);
  });

  test("the marker survives on the row, not just in the response", async () => {
    const { record, service } = buildService(await jpeg(1600, 900));
    await service.confirmUpload(ACTOR, { uploadId: "upload-1" });

    expect(record().fileUrl).not.toBe(URL);
    expect(readImageVariants(record().fileUrl).src).toBe(URL);
  });

  test("an image smaller than every width is left unmarked rather than upscaled", async () => {
    const { calls, service } = buildService(await jpeg(320, 240));
    const response = await service.confirmUpload(ACTOR, { uploadId: "upload-1" });

    expect(calls.written).toEqual([]);
    expect(response.fileUrl).toBe(URL);
    expect(response.variantWidths).toBeNull();
  });

  test("a format that cannot be resized is confirmed unmarked", async () => {
    const { calls, service } = buildService(await jpeg(1600, 900), { contentType: "image/gif" });
    const response = await service.confirmUpload(ACTOR, { uploadId: "upload-1" });

    expect(calls.written).toEqual([]);
    expect(response.fileUrl).toBe(URL);
  });

  test("a failed write leaves the upload confirmed and the URL unmarked", async () => {
    // The student's image is already in the bucket and already usable. Losing
    // the smaller copies is not a reason to fail the upload that produced them.
    const { record, service } = buildService(await jpeg(1600, 900), { writeFails: true });
    const response = await service.confirmUpload(ACTOR, { uploadId: "upload-1" });

    expect(response.status).toBe("READY");
    expect(response.fileUrl).toBe(URL);
    expect(record().variantWidths).toBeNull();
  });
});

describe("UploadService.deleteUpload", () => {
  test("removes the variants alongside the original", async () => {
    const { calls, service } = buildService(await jpeg(1600, 900), {
      variantWidths: [400, 800]
    });
    await service.deleteUpload(ACTOR, "upload-1");

    expect(calls.deleted).toEqual([
      KEY,
      "test/course-covers/user-1/cover@400.jpg",
      "test/course-covers/user-1/cover@800.jpg"
    ]);
  });

  test("an upload that never had variants deletes only itself", async () => {
    const { calls, service } = buildService(await jpeg(320, 240));
    await service.deleteUpload(ACTOR, "upload-1");

    expect(calls.deleted).toEqual([KEY]);
  });
});
