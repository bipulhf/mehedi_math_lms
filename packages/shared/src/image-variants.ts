/**
 * Responsive image variants, described by the URL itself.
 *
 * The only thing persisted downstream of an upload is a single URL string —
 * `courses.cover_image_url`, a profile photo field, a material link. There is no
 * upload id alongside it, so at render time there is no row to join against and
 * no way to ask whether a smaller copy of the image exists.
 *
 * So the URL carries the answer. `withImageVariants` marks a URL with the widths
 * that were generated for it, and `readImageVariants` reads them back. A reader
 * that knows about the marker builds a `srcset`; one that does not renders the
 * URL as it always did, and a URL typed in by hand or pointing at another host
 * has no marker and is left alone.
 *
 * Existence is the whole point of the marker. Deriving variant URLs by
 * convention alone would mean guessing, and a `srcset` candidate that 404s
 * breaks the image — the browser does not fall back to `src`.
 */

/** The widths generated for every managed image. Ordered small to large. */
export const imageVariantWidths = [400, 800, 1200] as const;

export type ImageVariantWidth = (typeof imageVariantWidths)[number];

const VARIANTS_PARAM = "variants";

export interface ImageVariant {
  url: string;
  width: number;
}

export interface ImageSource {
  /** The original, with the marker removed. Always safe to render on its own. */
  src: string;
  /** Smallest first. Empty when the URL carries no marker. */
  variants: ImageVariant[];
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function normaliseWidths(widths: readonly number[]): number[] {
  return [...new Set(widths)]
    .filter((width) => Number.isInteger(width) && width > 0)
    .sort((first, second) => first - second);
}

/**
 * `covers/abc.jpg` at 400 becomes `covers/abc@400.jpg`.
 *
 * Works on a storage key or a URL path — anything where the last `.` after the
 * last `/` is the extension. A path with no extension gets the suffix appended.
 */
export function buildImageVariantKey(key: string, width: number): string {
  const extensionIndex = key.lastIndexOf(".");
  const lastSlashIndex = key.lastIndexOf("/");

  if (extensionIndex <= lastSlashIndex) {
    return `${key}@${width}`;
  }

  return `${key.slice(0, extensionIndex)}@${width}${key.slice(extensionIndex)}`;
}

/** Marks a URL with the variant widths that exist for it. No widths, no marker. */
export function withImageVariants(url: string, widths: readonly number[]): string {
  const normalisedWidths = normaliseWidths(widths);

  if (normalisedWidths.length === 0) {
    return url;
  }

  const parsed = parseUrl(url);

  if (!parsed) {
    return url;
  }

  parsed.searchParams.set(VARIANTS_PARAM, normalisedWidths.join(","));

  return parsed.toString();
}

/** Splits a stored URL into the original and whatever variants it declares. */
export function readImageVariants(url: string): ImageSource {
  const parsed = parseUrl(url);
  const declaredWidths = parsed?.searchParams.get(VARIANTS_PARAM);

  if (!parsed || declaredWidths === null || declaredWidths === undefined) {
    return { src: url, variants: [] };
  }

  parsed.searchParams.delete(VARIANTS_PARAM);

  const src = parsed.toString();
  const widths = normaliseWidths(
    declaredWidths.split(",").map((width) => Number.parseInt(width.trim(), 10))
  );

  return {
    src,
    variants: widths.map((width) => {
      // The path, not the whole URL: any other query parameter must survive, and
      // `@400` belongs before the extension rather than at the end of the string.
      const variantUrl = new URL(parsed.toString());
      variantUrl.pathname = buildImageVariantKey(variantUrl.pathname, width);

      return { url: variantUrl.toString(), width };
    })
  };
}

/**
 * `srcset` for an `<img>`. Empty when there are no variants, so the attribute
 * can be omitted rather than set to something the browser has to parse.
 */
export function buildImageSrcSet(source: ImageSource): string {
  return source.variants.map((variant) => `${variant.url} ${variant.width}w`).join(", ");
}

/**
 * The smallest variant at least `targetWidth` across, or the original when every
 * variant is smaller than what is being asked for. For clients that pick one URL
 * rather than handing a set to the browser — React Native, an email, a PDF.
 */
export function pickImageVariant(source: ImageSource, targetWidth: number): string {
  const fitting = source.variants.find((variant) => variant.width >= targetWidth);

  return fitting?.url ?? source.src;
}
