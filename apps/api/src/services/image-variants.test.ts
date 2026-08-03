import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import { generateImageVariants, isResizableImage } from "@/services/image-variants";

/**
 * Real pixels through the real encoder. A test against a mocked sharp would pass
 * while shipping variants that are upscaled, re-encoded into the wrong format,
 * or larger than the original they were supposed to save bytes on.
 */
async function createImage(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp"
): Promise<Uint8Array> {
  const pipeline = sharp({
    create: {
      background: { b: 200, g: 100, r: 30 },
      channels: 3,
      height,
      width
    }
  });
  const buffer = await (format === "jpeg"
    ? pipeline.jpeg()
    : format === "png"
      ? pipeline.png()
      : pipeline.webp()
  ).toBuffer();

  return new Uint8Array(buffer);
}

describe("isResizableImage", () => {
  test("accepts the raster formats a cover is uploaded as", () => {
    expect(isResizableImage("image/jpeg")).toBe(true);
    expect(isResizableImage("IMAGE/PNG")).toBe(true);
    expect(isResizableImage("image/webp")).toBe(true);
  });

  test("refuses formats where a smaller copy is not a smaller copy", () => {
    // A resized GIF loses its animation; an SVG has no pixels to lose.
    expect(isResizableImage("image/gif")).toBe(false);
    expect(isResizableImage("image/svg+xml")).toBe(false);
    expect(isResizableImage("application/pdf")).toBe(false);
  });
});

describe("generateImageVariants", () => {
  test("produces every width below the original, smallest first", async () => {
    const variants = await generateImageVariants(await createImage(1600, 900, "jpeg"), "image/jpeg");

    expect(variants.map((variant) => variant.width)).toEqual([400, 800, 1200]);
  });

  test("the bytes really are that wide", async () => {
    const variants = await generateImageVariants(await createImage(1600, 900, "jpeg"), "image/jpeg");
    const widths = await Promise.all(
      variants.map(async (variant) => (await sharp(variant.body).metadata()).width)
    );

    expect(widths).toEqual([400, 800, 1200]);
  });

  test("aspect ratio survives the resize", async () => {
    const [variant] = await generateImageVariants(
      await createImage(1600, 900, "jpeg"),
      "image/jpeg"
    );
    const metadata = await sharp(variant?.body ?? new Uint8Array()).metadata();

    expect(metadata.height).toBe(225);
  });

  test("never upscales -- a small original yields only the widths under it", async () => {
    const variants = await generateImageVariants(await createImage(500, 500, "jpeg"), "image/jpeg");

    expect(variants.map((variant) => variant.width)).toEqual([400]);
  });

  test("an original smaller than every variant yields none, which is not a failure", async () => {
    const variants = await generateImageVariants(await createImage(320, 240, "jpeg"), "image/jpeg");

    expect(variants).toEqual([]);
  });

  test("a width equal to the original is skipped rather than re-encoded for nothing", async () => {
    const variants = await generateImageVariants(await createImage(400, 400, "jpeg"), "image/jpeg");

    expect(variants).toEqual([]);
  });

  test("keeps the format it was given", async () => {
    const png = await generateImageVariants(await createImage(1600, 900, "png"), "image/png");
    const webp = await generateImageVariants(await createImage(1600, 900, "webp"), "image/webp");

    expect(png.every((variant) => variant.contentType === "image/png")).toBe(true);
    expect(webp.every((variant) => variant.contentType === "image/webp")).toBe(true);
    expect((await sharp(png[0]?.body ?? new Uint8Array()).metadata()).format).toBe("png");
  });

  test("image/jpg is normalised to image/jpeg rather than stored as a second spelling", async () => {
    const variants = await generateImageVariants(await createImage(1600, 900, "jpeg"), "image/jpg");

    expect(variants[0]?.contentType).toBe("image/jpeg");
  });

  test("an unsupported content type is skipped without touching the decoder", async () => {
    expect(await generateImageVariants(await createImage(1600, 900, "png"), "image/gif")).toEqual(
      []
    );
  });

  test("a variant is smaller than the original it came from", async () => {
    const original = await createImage(1600, 900, "jpeg");
    const variants = await generateImageVariants(original, "image/jpeg");

    expect(variants[0]?.body.byteLength).toBeLessThan(original.byteLength);
  });
});
