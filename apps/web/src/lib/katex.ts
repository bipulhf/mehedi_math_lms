import katex from "katex";

/**
 * The one place LaTeX becomes markup on the web.
 *
 * `renderToString` is pure JavaScript with no DOM, so this runs identically in
 * the server pass and in the browser — which is the point. A client-only
 * renderer would ship the raw `$x^2$` first and swap it after hydration, and a
 * student reading a question would watch it change under them.
 *
 * The options are fixed rather than per-call for safety: `trust: false` refuses
 * `\href` and `\includegraphics`, and `maxExpand` bounds macro recursion, so a
 * question cannot make the server render loop. An invalid formula renders as
 * KaTeX's own inline error rather than throwing — a teacher's typo must not be
 * able to blank a page.
 */

const CACHE_LIMIT = 500;
const cache = new Map<string, string>();

export function renderMathToHtml(latex: string, isDisplay: boolean): string {
  const key = `${isDisplay ? "d" : "i"}|${latex}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const html = katex.renderToString(latex, {
    displayMode: isDisplay,
    maxExpand: 1000,
    maxSize: 50,
    output: "htmlAndMathml",
    strict: "ignore",
    throwOnError: false,
    trust: false
  });

  // A blunt bound rather than an LRU: the same page renders the same handful of
  // formulas repeatedly, and the entries are small.
  if (cache.size >= CACHE_LIMIT) {
    cache.clear();
  }

  cache.set(key, html);

  return html;
}
