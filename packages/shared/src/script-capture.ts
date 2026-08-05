/**
 * How a photographed Script Page is sized down before it is stored.
 *
 * A Script Page keeps no original: the client shrinks the photograph before the
 * upload and the API re-encodes it on confirm as a backstop, so these numbers
 * have to be the same on the web, in Expo, and on the server. ADR-0009.
 */

/** Longest edge, in pixels, of a stored Script Page. */
export const scriptPageMaxEdge = 2000;

/** JPEG quality for the sized-down page, 0-1 as the browser canvas takes it. */
export const scriptPageJpegQuality = 0.82;

/** The same quality on the 0-100 scale sharp uses. */
export const scriptPageJpegQualityPercent = Math.round(scriptPageJpegQuality * 100);

export const scriptPageContentType = "image/jpeg";

export const scriptPageFileExtension = "jpg";

/** Pages per question. High enough never to be hit by honest work. */
export const maxScriptPagesPerAnswer = 30;

/**
 * The size the sized-down page should be rendered at, given the longest edge of
 * the source. Never enlarges: a page already smaller than the cap is uploaded as
 * it is, minus the re-encode.
 */
export function scaleForScriptPage(width: number, height: number): number {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= 0 || longestEdge <= scriptPageMaxEdge) {
    return 1;
  }

  return scriptPageMaxEdge / longestEdge;
}
