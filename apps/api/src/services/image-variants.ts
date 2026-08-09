import {
  imageVariantWidths,
  scriptPageJpegQualityPercent,
  scriptPageMaxEdge
} from "@mma/shared";
import sharp, { type Sharp } from "sharp";

export interface GeneratedImageVariant {
  body: Uint8Array;
  contentType: string;
  width: number;
}

/**
 * Only formats where a smaller copy is both possible and worth having.
 *
 * GIF is excluded because resizing one costs its animation, and SVG because it
 * has no pixel size to reduce -- both are already the smallest they need to be
 * at any display width.
 */
const RESIZABLE_FORMATS: Readonly<Record<string, "jpeg" | "png" | "webp">> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp"
};

export function isResizableImage(contentType: string): boolean {
  return contentType.toLowerCase().trim() in RESIZABLE_FORMATS;
}

function encode(pipeline: Sharp, format: "jpeg" | "png" | "webp"): Sharp {
  if (format === "png") {
    return pipeline.png({ compressionLevel: 9 });
  }

  if (format === "webp") {
    return pipeline.webp({ quality: 78 });
  }

  // 78 is where a downscaled photograph stops shedding bytes and starts shedding
  // detail. The original is untouched either way -- this only governs the copies.
  return pipeline.jpeg({ mozjpeg: true, quality: 78 });
}

export interface SizedDownPage {
  body: Uint8Array;
  height: number;
  width: number;
}

/**
 * The backstop for a Script Page: the client already sized the photograph down,
 * and this makes sure of it. Returns null when the stored page is already
 * within the cap, which is the normal case — there is then nothing to rewrite.
 *
 * `rotate()` with no argument applies the camera's EXIF orientation and drops
 * the tag, so a page photographed sideways is stored the way it was held.
 * ADR-0009.
 */
export async function sizeDownScriptPage(original: Uint8Array): Promise<SizedDownPage | null> {
  const metadata = await sharp(original).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 0 || height <= 0) {
    return null;
  }

  const isOriented = metadata.orientation === undefined || metadata.orientation <= 1;

  if (Math.max(width, height) <= scriptPageMaxEdge && isOriented) {
    return null;
  }

  const resized = sharp(original)
    .rotate()
    .resize({
      fit: "inside",
      height: scriptPageMaxEdge,
      width: scriptPageMaxEdge,
      withoutEnlargement: true
    })
    .jpeg({ mozjpeg: true, quality: scriptPageJpegQualityPercent });
  const { data, info } = await resized.toBuffer({ resolveWithObject: true });

  return { body: new Uint8Array(data), height: info.height, width: info.width };
}

/**
 * Downscaled copies of an uploaded image, smallest first.
 *
 * Never upscales: a width at or above the original's is skipped, so a 500px
 * cover yields one 400px variant and nothing else, and a 300px one yields
 * nothing at all. An image that yields nothing is not a failure -- it means the
 * original is already the right size to serve, which the empty result says.
 *
 * EXIF and colour profiles are dropped along the way, because sharp only carries
 * them forward when asked to.
 */
export async function generateImageVariants(
  original: Uint8Array,
  contentType: string
): Promise<GeneratedImageVariant[]> {
  const format = RESIZABLE_FORMATS[contentType.toLowerCase().trim()];

  if (!format) {
    return [];
  }

  const metadata = await sharp(original).metadata();
  const originalWidth = metadata.width;

  if (originalWidth === undefined || originalWidth <= 0) {
    return [];
  }

  const variants: GeneratedImageVariant[] = [];

  for (const width of imageVariantWidths) {
    if (width >= originalWidth) {
      continue;
    }

    const body = await encode(
      sharp(original).resize({ width, withoutEnlargement: true }),
      format
    ).toBuffer();

    variants.push({
      body: new Uint8Array(body),
      contentType: format === "jpeg" ? "image/jpeg" : `image/${format}`,
      width
    });
  }

  return variants;
}
