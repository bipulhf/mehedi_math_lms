import { describe, expect, test } from "bun:test";

import type { UploadRecord, UploadRepository } from "@/repositories/upload-repository";
import {
  isParsableVideoContainer,
  processVideoMetadataJob,
  type StoredFileReader
} from "@/services/file-processing-processor";

interface Calls {
  updates: { durationInSeconds: number | null; height: number | null; width: number | null }[];
}

function buildRepository(upload: UploadRecord | null): {
  calls: Calls;
  repository: UploadRepository;
} {
  const calls: Calls = { updates: [] };

  const repository = {
    findUploadById: async () => upload,
    updateMediaMetadata: async (input: {
      durationInSeconds: number | null;
      height: number | null;
      width: number | null;
    }) => {
      calls.updates.push({
        durationInSeconds: input.durationInSeconds,
        height: input.height,
        width: input.width
      });

      return upload;
    }
  } as unknown as UploadRepository;

  return { calls, repository };
}

const videoUpload = {
  contentType: "video/mp4",
  fileUrl: "https://cdn.example.com/development/lecture-videos/user-1/abc.mp4",
  id: "upload-1",
  kind: "VIDEO",
  status: "READY"
} as unknown as UploadRecord;

function box(type: string, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + payload.byteLength);
  const view = new DataView(bytes.buffer);

  view.setUint32(0, bytes.byteLength);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(payload, 8);

  return bytes;
}

/** A minimal faststart MP4: `moov` holding one `mvhd` and one video `trak`. */
function buildVideoFile(): Uint8Array {
  const mvhd = new Uint8Array(100);
  new DataView(mvhd.buffer).setUint32(12, 1_000);
  new DataView(mvhd.buffer).setUint32(16, 45_000);

  const tkhd = new Uint8Array(84);
  new DataView(tkhd.buffer).setUint32(76, 1920 * 65536);
  new DataView(tkhd.buffer).setUint32(80, 1080 * 65536);

  const moovPayload = new Uint8Array(
    box("mvhd", mvhd).byteLength + box("trak", box("tkhd", tkhd)).byteLength
  );
  moovPayload.set(box("mvhd", mvhd), 0);
  moovPayload.set(box("trak", box("tkhd", tkhd)), box("mvhd", mvhd).byteLength);

  return box("moov", moovPayload);
}

function readerFor(file: Uint8Array): StoredFileReader {
  return {
    getSize: async () => file.byteLength,
    readRange: async (_fileUrl, start, endInclusive) => file.slice(start, endInclusive + 1)
  };
}

describe("isParsableVideoContainer", () => {
  test("accepts the ISO base media types", () => {
    expect(isParsableVideoContainer("video/mp4")).toBe(true);
    expect(isParsableVideoContainer("VIDEO/QUICKTIME")).toBe(true);
  });

  test("rejects containers the parser cannot read", () => {
    expect(isParsableVideoContainer("video/webm")).toBe(false);
  });
});

describe("processVideoMetadataJob", () => {
  test("writes the metadata it read back to the upload", async () => {
    const { calls, repository } = buildRepository(videoUpload);
    const result = await processVideoMetadataJob(repository, readerFor(buildVideoFile()), {
      contentType: "video/mp4",
      uploadId: videoUpload.id
    });

    expect(result).toEqual({ durationInSeconds: 45, height: 1080, width: 1920 });
    expect(calls.updates).toEqual([{ durationInSeconds: 45, height: 1080, width: 1920 }]);
  });

  test("an unsupported container is a success that records nothing", async () => {
    // Otherwise every WebM upload would retry until BullMQ gave up on it.
    const { calls, repository } = buildRepository(videoUpload);
    const result = await processVideoMetadataJob(repository, readerFor(buildVideoFile()), {
      contentType: "video/webm",
      uploadId: videoUpload.id
    });

    expect(result).toBeNull();
    expect(calls.updates).toHaveLength(0);
  });

  test("an upload deleted before the job ran is not an error", async () => {
    const { calls, repository } = buildRepository(null);
    const result = await processVideoMetadataJob(repository, readerFor(buildVideoFile()), {
      contentType: "video/mp4",
      uploadId: videoUpload.id
    });

    expect(result).toBeNull();
    expect(calls.updates).toHaveLength(0);
  });

  test("a file with no readable metadata is not written back", async () => {
    const { calls, repository } = buildRepository(videoUpload);
    const empty = box("ftyp", new Uint8Array(16));
    const result = await processVideoMetadataJob(repository, readerFor(empty), {
      contentType: "video/mp4",
      uploadId: videoUpload.id
    });

    expect(result).toEqual({ durationInSeconds: null, height: null, width: null });
    expect(calls.updates).toHaveLength(0);
  });
});
