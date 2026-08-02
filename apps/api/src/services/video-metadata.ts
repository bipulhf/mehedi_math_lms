/**
 * Minimal ISO base media file format reader (MP4, M4V, QuickTime MOV).
 *
 * It answers exactly the two questions the `uploads` table asks -- how long is
 * this video, and how big is its picture -- and nothing else. There is no
 * ffmpeg on the API host, and installing one is a deployment decision rather
 * than a code change, so the container header is parsed directly.
 *
 * The file is never downloaded whole. `readVideoMetadata` walks the top-level
 * boxes by reading each 16-byte header and skipping the payload, so a 500MB
 * upload costs a handful of ranged reads plus the `moov` box itself.
 */

/** Reads `[start, endInclusive]` from the stored object. */
export type ByteRangeReader = (start: number, endInclusive: number) => Promise<Uint8Array>;

export interface VideoMetadata {
  durationInSeconds: number | null;
  height: number | null;
  width: number | null;
}

interface BoxHeader {
  headerSize: number;
  /** Total box size including the header. `null` means "runs to end of file". */
  size: number | null;
  type: string;
}

interface ChildBox {
  payloadEnd: number;
  payloadStart: number;
  type: string;
}

const BOX_HEADER_SIZE = 8;
const EXTENDED_BOX_HEADER_SIZE = 16;
/** A `moov` box larger than this is not something we are willing to buffer. */
const MAX_MOOV_SIZE = 32 * 1024 * 1024;

const EMPTY_METADATA: VideoMetadata = { durationInSeconds: null, height: null, width: null };

function toDataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readBoxType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0
  );
}

/**
 * A `size` of 0 means the box runs to the end of the file; a size of 1 means
 * the real size is a 64-bit value in the eight bytes that follow the type.
 */
export function readBoxHeader(bytes: Uint8Array, offset: number): BoxHeader | null {
  if (offset + BOX_HEADER_SIZE > bytes.byteLength) {
    return null;
  }

  const view = toDataView(bytes);
  const declaredSize = view.getUint32(offset);
  const type = readBoxType(bytes, offset + 4);

  if (declaredSize === 1) {
    if (offset + EXTENDED_BOX_HEADER_SIZE > bytes.byteLength) {
      return null;
    }

    return {
      headerSize: EXTENDED_BOX_HEADER_SIZE,
      size: Number(view.getBigUint64(offset + BOX_HEADER_SIZE)),
      type
    };
  }

  return {
    headerSize: BOX_HEADER_SIZE,
    size: declaredSize === 0 ? null : declaredSize,
    type
  };
}

/** Lists the boxes directly inside `[start, end)` without recursing. */
export function listChildBoxes(bytes: Uint8Array, start: number, end: number): readonly ChildBox[] {
  const boxes: ChildBox[] = [];
  let offset = start;

  while (offset + BOX_HEADER_SIZE <= end) {
    const header = readBoxHeader(bytes, offset);

    if (!header) {
      break;
    }

    const size = header.size ?? end - offset;

    if (size < header.headerSize) {
      break;
    }

    boxes.push({
      payloadEnd: Math.min(offset + size, end),
      payloadStart: offset + header.headerSize,
      type: header.type
    });

    offset += size;
  }

  return boxes;
}

/** `mvhd` carries the movie timescale and the overall duration. */
function parseMovieHeader(bytes: Uint8Array, start: number, end: number): number | null {
  const view = toDataView(bytes);
  const version = bytes[start];

  if (version === undefined) {
    return null;
  }

  const timescaleOffset = version === 1 ? start + 20 : start + 12;
  const durationOffset = version === 1 ? start + 24 : start + 16;
  const durationSize = version === 1 ? 8 : 4;

  if (durationOffset + durationSize > end) {
    return null;
  }

  const timescale = view.getUint32(timescaleOffset);
  const duration = version === 1 ? Number(view.getBigUint64(durationOffset)) : view.getUint32(durationOffset);

  // A timescale of zero, or the all-ones "unknown duration" sentinel, means the
  // header cannot answer the question. Report nothing rather than a wrong number.
  if (timescale === 0 || duration === 0 || duration === 0xffffffff) {
    return null;
  }

  return Math.round(duration / timescale);
}

/**
 * `tkhd` carries the track's display size as a 16.16 fixed-point pair. Audio
 * tracks report 0x0, which is how the video track is picked out.
 */
function parseTrackHeader(bytes: Uint8Array, start: number, end: number): { height: number; width: number } | null {
  const view = toDataView(bytes);
  const version = bytes[start];

  if (version === undefined) {
    return null;
  }

  const widthOffset = version === 1 ? start + 88 : start + 76;

  if (widthOffset + 8 > end) {
    return null;
  }

  const width = Math.round(view.getUint32(widthOffset) / 65536);
  const height = Math.round(view.getUint32(widthOffset + 4) / 65536);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { height, width };
}

/** Extracts what it can from an in-memory `moov` payload. */
export function parseMoovBox(bytes: Uint8Array, start: number, end: number): VideoMetadata {
  let durationInSeconds: number | null = null;
  let dimensions: { height: number; width: number } | null = null;

  for (const child of listChildBoxes(bytes, start, end)) {
    if (child.type === "mvhd") {
      durationInSeconds = parseMovieHeader(bytes, child.payloadStart, child.payloadEnd);
      continue;
    }

    if (child.type !== "trak" || dimensions) {
      continue;
    }

    for (const trackChild of listChildBoxes(bytes, child.payloadStart, child.payloadEnd)) {
      if (trackChild.type === "tkhd") {
        dimensions = parseTrackHeader(bytes, trackChild.payloadStart, trackChild.payloadEnd);
        break;
      }
    }
  }

  return {
    durationInSeconds,
    height: dimensions?.height ?? null,
    width: dimensions?.width ?? null
  };
}

/**
 * Walks the top-level boxes looking for `moov`. It is commonly written after
 * `mdat`, which is why the whole file has to be traversed -- but only its box
 * headers are ever read.
 */
async function locateMoovBox(
  read: ByteRangeReader,
  fileSize: number
): Promise<{ size: number; start: number } | null> {
  let offset = 0;

  while (offset + BOX_HEADER_SIZE <= fileSize) {
    const headerBytes = await read(offset, Math.min(offset + EXTENDED_BOX_HEADER_SIZE, fileSize) - 1);
    const header = readBoxHeader(headerBytes, 0);

    if (!header) {
      return null;
    }

    const size = header.size ?? fileSize - offset;

    if (size < header.headerSize) {
      return null;
    }

    if (header.type === "moov") {
      return { size, start: offset };
    }

    offset += size;
  }

  return null;
}

export async function readVideoMetadata(read: ByteRangeReader, fileSize: number): Promise<VideoMetadata> {
  if (fileSize <= 0) {
    return EMPTY_METADATA;
  }

  const moov = await locateMoovBox(read, fileSize);

  if (!moov || moov.size > MAX_MOOV_SIZE) {
    return EMPTY_METADATA;
  }

  const moovBytes = await read(moov.start, moov.start + moov.size - 1);
  const header = readBoxHeader(moovBytes, 0);

  if (!header) {
    return EMPTY_METADATA;
  }

  return parseMoovBox(moovBytes, header.headerSize, moovBytes.byteLength);
}
