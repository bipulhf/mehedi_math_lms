import { buildImageSrcSet, readImageVariants } from "@genex/shared";
import type { ImgHTMLAttributes, JSX } from "react";

export interface ResponsiveImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  alt: string;
  /**
   * What the browser should assume the rendered width will be, so it can pick a
   * candidate before layout. Without it every candidate is judged against the
   * full viewport and the largest one usually wins, which is the opposite of the
   * point.
   */
  sizes?: string | undefined;
  /** A stored URL, marker and all. */
  src: string;
}

/**
 * An `<img>` that serves the smallest copy that will do.
 *
 * Uploaded images are resized on confirm and the URL records which widths
 * exist, so this reads the marker and hands the browser the set. A URL without
 * one — typed in by hand, pointing at another host, uploaded before any of this
 * — renders exactly as a plain `<img>` would, with no `srcset` attribute at all.
 * That matters: a candidate that 404s breaks the image, and the browser does not
 * fall back to `src`.
 */
export function ResponsiveImage({
  alt,
  decoding = "async",
  loading = "lazy",
  sizes,
  src,
  ...props
}: ResponsiveImageProps): JSX.Element {
  const source = readImageVariants(src);
  const srcSet = buildImageSrcSet(source);

  return (
    <img
      {...props}
      alt={alt}
      decoding={decoding}
      loading={loading}
      src={source.src}
      {...(srcSet.length > 0 ? { sizes, srcSet } : {})}
    />
  );
}
