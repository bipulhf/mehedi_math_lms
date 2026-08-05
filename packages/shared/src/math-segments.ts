/**
 * Where maths lives in a question, and how it is found again.
 *
 * A question is rich HTML — bold, lists, Bangla prose — with LaTeX written
 * between dollars inside it: `Solve $\frac{dy}{dx}$ when <strong>$x = 2$</strong>`.
 * Nothing about the storage format changes to carry maths, which is what lets
 * the sanitiser allowlist stay closed: rendered KaTeX is minted from these
 * segments *after* sanitisation and never has to survive DOMPurify. ADR-0014.
 *
 * This module is the single definition of what counts as maths. Web renders it
 * with KaTeX in the browser and on the server; the app renders the same
 * segments in a WebView. If each side found maths its own way they would
 * eventually disagree about the same question — the reason `image-variants.ts`
 * and `progress-chunks.ts` live here too.
 */

export type MathSegmentKind = "display" | "inline" | "text";

export interface MathSegment {
  kind: MathSegmentKind;
  /** For a maths segment this is the LaTeX, without its delimiters. */
  value: string;
}

/** Cheap enough to run on every render, and it keeps the no-maths path free. */
export function hasMathDelimiters(text: string): boolean {
  return text.includes("$");
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"'
};

/**
 * Undo the escaping a rich text editor applies to what the teacher typed.
 *
 * This is the step that makes matrices and inequalities work at all. TipTap
 * serialises text nodes with `&` and `<` escaped, so `\begin{bmatrix} a & b`
 * reaches storage as `a &amp; b` and `$x < y$` as `$x &lt; y$` — and KaTeX
 * given `&amp;` renders the literal text, not a column break.
 *
 * One pass, deliberately: a second pass would turn `&amp;lt;` into `<` when the
 * author meant to write the four characters `&lt;`.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    const named = NAMED_ENTITIES[body.toLowerCase()];

    if (named !== undefined) {
      return named;
    }

    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);

      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }

    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);

      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }

    return match;
  });
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;

  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }

  return backslashes % 2 === 1;
}

function findClosing(text: string, from: number, delimiter: string): number {
  for (let cursor = from; cursor < text.length; cursor += 1) {
    if (text[cursor] !== "$" || isEscaped(text, cursor)) {
      continue;
    }

    const isDouble = text.startsWith("$$", cursor);

    if (delimiter === "$$" && isDouble) {
      return cursor;
    }

    if (delimiter === "$" && !isDouble) {
      return cursor;
    }
  }

  return -1;
}

/**
 * Split one run of text into prose and maths.
 *
 * The rules exist to keep a price out of a formula. `$5 off, $10 off` is two
 * prices, not one equation, so an opening `$` must be followed by something
 * other than a space, and the closing one must not follow a space. `\$` is a
 * literal dollar. `$$` is checked before `$`. Anything unterminated stays text —
 * a half-typed formula should read as what the teacher typed, not swallow the
 * rest of the paragraph.
 */
export function segmentMath(text: string): readonly MathSegment[] {
  if (!hasMathDelimiters(text)) {
    return text.length > 0 ? [{ kind: "text", value: text }] : [];
  }

  const segments: MathSegment[] = [];
  let buffer = "";
  let cursor = 0;

  const flush = (): void => {
    if (buffer.length > 0) {
      segments.push({ kind: "text", value: buffer });
      buffer = "";
    }
  };

  while (cursor < text.length) {
    const character = text[cursor];

    if (character !== "$" || isEscaped(text, cursor)) {
      buffer += character;
      cursor += 1;
      continue;
    }

    const isDisplay = text.startsWith("$$", cursor);
    const delimiter = isDisplay ? "$$" : "$";
    const contentStart = cursor + delimiter.length;
    const closing = findClosing(text, contentStart, delimiter);
    const latex = closing === -1 ? "" : text.slice(contentStart, closing);
    const isWellFormed =
      closing !== -1 &&
      latex.trim().length > 0 &&
      // Inline maths has to hug its dollars. Display maths is a block, so it may
      // be written across a line and does not.
      (isDisplay || (!/^\s/.test(latex) && !/\s$/.test(latex)));

    if (!isWellFormed) {
      buffer += character;
      cursor += 1;
      continue;
    }

    flush();
    segments.push({ kind: isDisplay ? "display" : "inline", value: latex });
    cursor = closing + delimiter.length;
  }

  flush();

  return segments;
}

export interface HtmlChunk {
  /** True for `<strong>` and friends: markup, never scanned for maths. */
  isTag: boolean;
  value: string;
}

/**
 * Cut HTML into tags and the text between them.
 *
 * Maths is only ever looked for in the text runs, so a `$` inside an `href` is
 * a dollar in a URL and nothing else. It also means a run cannot cross a tag:
 * `$a <br> b$` is two literal dollars, which is the honest reading — the
 * teacher pressed Enter in the middle.
 */
export function splitHtmlTextNodes(html: string): readonly HtmlChunk[] {
  const chunks: HtmlChunk[] = [];
  const pattern = /<[^>]*>/g;
  let lastIndex = 0;
  let match = pattern.exec(html);

  while (match !== null) {
    if (match.index > lastIndex) {
      chunks.push({ isTag: false, value: html.slice(lastIndex, match.index) });
    }

    chunks.push({ isTag: true, value: match[0] });
    lastIndex = match.index + match[0].length;
    match = pattern.exec(html);
  }

  if (lastIndex < html.length) {
    chunks.push({ isTag: false, value: html.slice(lastIndex) });
  }

  return chunks;
}
