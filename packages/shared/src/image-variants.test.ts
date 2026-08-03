import { describe, expect, test } from "bun:test";

import {
  buildImageSrcSet,
  buildImageVariantKey,
  imageVariantWidths,
  pickImageVariant,
  readImageVariants,
  withImageVariants
} from "./image-variants";

const ORIGINAL = "https://cdn.example.com/production/course-covers/user-1/abc.jpg";

describe("buildImageVariantKey", () => {
  test("puts the width before the extension, not after the name", () => {
    expect(buildImageVariantKey("production/course-covers/user-1/abc.jpg", 400)).toBe(
      "production/course-covers/user-1/abc@400.jpg"
    );
  });

  test("appends when there is no extension to sit in front of", () => {
    expect(buildImageVariantKey("covers/abc", 800)).toBe("covers/abc@800");
  });

  test("a dot in a directory name is not an extension", () => {
    expect(buildImageVariantKey("covers/v1.2/abc", 800)).toBe("covers/v1.2/abc@800");
  });
});

describe("withImageVariants", () => {
  test("marks the URL with the widths that were generated", () => {
    const marked = withImageVariants(ORIGINAL, [800, 400]);

    expect(readImageVariants(marked).variants.map((variant) => variant.width)).toEqual([400, 800]);
  });

  test("no widths means no marker — nothing was generated, so say nothing", () => {
    expect(withImageVariants(ORIGINAL, [])).toBe(ORIGINAL);
  });

  test("a URL it cannot parse is returned untouched", () => {
    expect(withImageVariants("not a url", [400])).toBe("not a url");
  });

  test("survives a round trip with another query parameter present", () => {
    const withParam = `${ORIGINAL}?token=abc`;
    const source = readImageVariants(withImageVariants(withParam, [400]));

    expect(source.src).toBe(withParam);
    expect(source.variants[0]?.url).toBe(
      "https://cdn.example.com/production/course-covers/user-1/abc@400.jpg?token=abc"
    );
  });
});

describe("readImageVariants", () => {
  test("an unmarked URL yields itself and no variants", () => {
    expect(readImageVariants(ORIGINAL)).toEqual({ src: ORIGINAL, variants: [] });
  });

  test("a hand-typed value that is not a URL is passed through rather than dropped", () => {
    expect(readImageVariants("/local/cover.png")).toEqual({
      src: "/local/cover.png",
      variants: []
    });
  });

  test("src has the marker stripped, so it stays the canonical URL", () => {
    expect(readImageVariants(withImageVariants(ORIGINAL, [400, 800])).src).toBe(ORIGINAL);
  });

  test("junk widths are discarded rather than turned into a broken candidate", () => {
    const source = readImageVariants(`${ORIGINAL}?variants=400,abc,-1,0`);

    expect(source.variants.map((variant) => variant.width)).toEqual([400]);
  });
});

describe("buildImageSrcSet", () => {
  test("smallest first, each candidate carrying its own width descriptor", () => {
    expect(buildImageSrcSet(readImageVariants(withImageVariants(ORIGINAL, [800, 400])))).toBe(
      "https://cdn.example.com/production/course-covers/user-1/abc@400.jpg 400w, " +
        "https://cdn.example.com/production/course-covers/user-1/abc@800.jpg 800w"
    );
  });

  test("empty for an unmarked URL, so the attribute can be left off entirely", () => {
    expect(buildImageSrcSet(readImageVariants(ORIGINAL))).toBe("");
  });
});

describe("pickImageVariant", () => {
  const source = readImageVariants(withImageVariants(ORIGINAL, [...imageVariantWidths]));

  test("takes the smallest variant that still covers the target", () => {
    expect(pickImageVariant(source, 320)).toContain("@400.jpg");
    expect(pickImageVariant(source, 400)).toContain("@400.jpg");
    expect(pickImageVariant(source, 401)).toContain("@800.jpg");
  });

  test("falls back to the original rather than upscaling a small variant", () => {
    expect(pickImageVariant(source, 4000)).toBe(ORIGINAL);
  });

  test("an unmarked URL is its own answer at every size", () => {
    expect(pickImageVariant(readImageVariants(ORIGINAL), 400)).toBe(ORIGINAL);
  });
});
