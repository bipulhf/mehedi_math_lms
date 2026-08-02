import { describe, expect, test } from "bun:test";

import { parseMoovBox, readBoxHeader, readVideoMetadata } from "@/services/video-metadata";

/**
 * The parser exists because there is no ffmpeg on the API host. These tests
 * build real ISO base media boxes by hand so the offsets are pinned -- an
 * off-by-four in `tkhd` would otherwise silently record a 0x0 video.
 */

function box(type: string, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + payload.byteLength);
  const view = new DataView(bytes.buffer);

  view.setUint32(0, bytes.byteLength);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(payload, 8);

  return bytes;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }

  return bytes;
}

/** Version 0 `mvhd`: 4 flags, 4 creation, 4 modification, 4 timescale, 4 duration. */
function movieHeader(timescale: number, duration: number): Uint8Array {
  const payload = new Uint8Array(100);
  const view = new DataView(payload.buffer);

  view.setUint32(12, timescale);
  view.setUint32(16, duration);

  return box("mvhd", payload);
}

/** Version 0 `tkhd`: display size is a 16.16 fixed-point pair at offset 76. */
function trackHeader(width: number, height: number): Uint8Array {
  const payload = new Uint8Array(84);
  const view = new DataView(payload.buffer);

  view.setUint32(76, width * 65536);
  view.setUint32(80, height * 65536);

  return box("tkhd", payload);
}

function movieBox(children: readonly Uint8Array[]): Uint8Array {
  return box("moov", concat(children));
}

describe("readBoxHeader", () => {
  test("reads a plain 32-bit box header", () => {
    const header = readBoxHeader(box("mdat", new Uint8Array(4)), 0);

    expect(header).toEqual({ headerSize: 8, size: 12, type: "mdat" });
  });

  test("a declared size of 1 means the real size follows as 64 bits", () => {
    const bytes = new Uint8Array(16);
    const view = new DataView(bytes.buffer);

    view.setUint32(0, 1);
    bytes.set(new TextEncoder().encode("mdat"), 4);
    view.setBigUint64(8, 8_000_000_000n);

    expect(readBoxHeader(bytes, 0)).toEqual({ headerSize: 16, size: 8_000_000_000, type: "mdat" });
  });

  test("a declared size of 0 means the box runs to end of file", () => {
    const bytes = new Uint8Array(8);

    bytes.set(new TextEncoder().encode("mdat"), 4);

    expect(readBoxHeader(bytes, 0)?.size).toBeNull();
  });
});

describe("parseMoovBox", () => {
  test("reads the duration and the video track's display size", () => {
    const moov = movieBox([
      movieHeader(600, 7_200),
      box("trak", concat([trackHeader(1920, 1080)]))
    ]);

    expect(parseMoovBox(moov, 8, moov.byteLength)).toEqual({
      durationInSeconds: 12,
      height: 1080,
      width: 1920
    });
  });

  test("an audio track reports 0x0 and is passed over for the video track", () => {
    const moov = movieBox([
      movieHeader(1_000, 30_000),
      box("trak", concat([trackHeader(0, 0)])),
      box("trak", concat([trackHeader(1280, 720)]))
    ]);

    expect(parseMoovBox(moov, 8, moov.byteLength)).toEqual({
      durationInSeconds: 30,
      height: 720,
      width: 1280
    });
  });

  test("a zero timescale reports no duration rather than dividing by it", () => {
    const moov = movieBox([movieHeader(0, 30_000), box("trak", concat([trackHeader(640, 360)]))]);

    expect(parseMoovBox(moov, 8, moov.byteLength).durationInSeconds).toBeNull();
  });
});

describe("readVideoMetadata", () => {
  function readerFor(file: Uint8Array) {
    return async (start: number, endInclusive: number): Promise<Uint8Array> =>
      file.slice(start, endInclusive + 1);
  }

  test("finds moov when it trails a large mdat", async () => {
    // Non-faststart files put the header last, which is exactly the case the
    // top-level walk exists for.
    const file = concat([
      box("ftyp", new Uint8Array(16)),
      box("mdat", new Uint8Array(4_096)),
      movieBox([movieHeader(90_000, 900_000), box("trak", concat([trackHeader(854, 480)]))])
    ]);

    expect(await readVideoMetadata(readerFor(file), file.byteLength)).toEqual({
      durationInSeconds: 10,
      height: 480,
      width: 854
    });
  });

  test("a file with no moov yields nothing instead of throwing", async () => {
    const file = concat([box("ftyp", new Uint8Array(16)), box("mdat", new Uint8Array(64))]);

    expect(await readVideoMetadata(readerFor(file), file.byteLength)).toEqual({
      durationInSeconds: null,
      height: null,
      width: null
    });
  });

  test("an empty object is not read at all", async () => {
    let reads = 0;
    const read = async (): Promise<Uint8Array> => {
      reads += 1;

      return new Uint8Array(0);
    };

    await readVideoMetadata(read, 0);

    expect(reads).toBe(0);
  });
});
