import {
  decodeHtmlEntities,
  hasMathDelimiters,
  segmentMath,
  splitHtmlTextNodes
} from "./math-segments";

/**
 * Turns the LaTeX between two dollars into whatever the caller draws with.
 *
 * Injected rather than imported so this package stays runtime-agnostic: the web
 * passes KaTeX, the app passes its own renderer, and a test passes a stub. A
 * `katex` dependency here would land in the React Native bundle whether or not
 * the app renders maths.
 */
export type MathRenderer = (latex: string, isDisplay: boolean) => string;

/**
 * Render every maths run in a piece of **already sanitised** HTML.
 *
 * The order matters and is the whole safety argument: the caller sanitises
 * first, so what arrives here is the allowlist's 16 tags; then this replaces
 * text runs with markup our own renderer produced. Author bytes never come back
 * through as HTML, so the allowlist never has to learn about KaTeX. ADR-0014.
 *
 * HTML with no `$` in it is returned byte-identical — the common case pays
 * nothing.
 */
export function renderMathInHtml(sanitizedHtml: string, render: MathRenderer): string {
  if (!hasMathDelimiters(sanitizedHtml)) {
    return sanitizedHtml;
  }

  return splitHtmlTextNodes(sanitizedHtml)
    .map((chunk) => {
      if (chunk.isTag) {
        return chunk.value;
      }

      return segmentMath(chunk.value)
        .map((segment) =>
          segment.kind === "text"
            ? segment.value
            : // The stored LaTeX is HTML-escaped, because the editor escaped the
              // text the teacher typed. KaTeX needs it back the way they typed it.
              render(decodeHtmlEntities(segment.value), segment.kind === "display")
        )
        .join("");
    })
    .join("");
}
