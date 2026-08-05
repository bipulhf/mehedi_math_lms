import { decodeHtmlEntities, segmentMath } from "./math-segments";
import { mathCommandCharacters } from "./math-symbols";

/**
 * LaTeX reduced to characters, for the places that can only hold characters.
 *
 * A collapsed question row, an `aria-label`, an SMS. It is a readable
 * approximation, never a rendering: `\frac{a}{b}` becomes `a/b` and
 * `\sqrt{x}` becomes `√(x)`. Anywhere a reader is expected to *do* maths —
 * a question, an option, a marking guide — KaTeX renders it properly instead.
 */

const SUPERSCRIPTS: Readonly<Record<string, string>> = {
  "+": "⁺",
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  n: "ⁿ"
};

const SUBSCRIPTS: Readonly<Record<string, string>> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  a: "ₐ",
  i: "ᵢ",
  n: "ₙ",
  x: "ₓ"
};

function toScript(body: string, table: Readonly<Record<string, string>>, fallback: string): string {
  const mapped = [...body].map((character) => table[character]);

  return mapped.every((character) => character !== undefined)
    ? mapped.join("")
    : `${fallback}(${body})`;
}

export function latexToPlainText(latex: string): string {
  let text = latex;

  // Fractions first, innermost outward, so \frac{\frac{a}{b}}{c} resolves.
  for (let pass = 0; pass < 4; pass += 1) {
    const next = text.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2");

    if (next === text) {
      break;
    }

    text = next;
  }

  text = text
    .replace(/\\sqrt\[(\d+)\]\{([^{}]*)\}/g, "$1√($2)")
    .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
    .replace(/\^\{([^{}]+)\}/g, (_match, body: string) => toScript(body, SUPERSCRIPTS, "^"))
    .replace(/_\{([^{}]+)\}/g, (_match, body: string) => toScript(body, SUBSCRIPTS, "_"))
    .replace(/\^(\w)/g, (_match, body: string) => toScript(body, SUPERSCRIPTS, "^"))
    .replace(/_(\w)/g, (_match, body: string) => toScript(body, SUBSCRIPTS, "_"))
    .replace(/\\(?:text|mathrm|mathbf|mathbb)\{([^{}]*)\}/g, "$1")
    .replace(/\\begin\{[a-z]*\}|\\end\{[a-z]*\}/g, " ")
    .replace(/\\\\/g, "; ")
    // Spacing commands are typography, not content.
    .replace(/\\[,;!:>]|\\ /g, " ")
    .replace(/&/g, " ")
    // Everything left that is a command: a known glyph, or the bare word.
    .replace(/\\([a-zA-Z]+)/g, (_match, command: string) => mathCommandCharacters[command] ?? command)
    // Braces become spaces rather than nothing, so `\operatorname{sgn} x` reads
    // as three words instead of one.
    .replace(/[{}]/g, " ");

  return text.replace(/\s+/g, " ").trim();
}

export interface PlainTextOptions {
  /**
   * True when the input came out of an editor and its text is HTML-escaped.
   * Plain fields — an MCQ option — are not escaped, and decoding them would
   * turn a literal `&lt;` a student typed into a `<`.
   */
  decodeEntities?: boolean | undefined;
}

/** A whole field — prose and maths — flattened to characters. */
export function textWithMathToPlainText(text: string, options: PlainTextOptions = {}): string {
  const decode = (value: string): string =>
    options.decodeEntities === true ? decodeHtmlEntities(value) : value;

  return segmentMath(text)
    .map((segment) =>
      segment.kind === "text" ? decode(segment.value) : latexToPlainText(decode(segment.value))
    )
    .join("");
}

/**
 * Rich text flattened to characters, maths included.
 *
 * The tag strip is a regex rather than DOMPurify because this runs in three
 * runtimes; it is only ever used for labels and truncation, never for anything
 * that is inserted back into a document.
 */
export function richTextToPlainText(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, " ");

  return textWithMathToPlainText(withoutTags, { decodeEntities: true })
    .replace(/\s+/g, " ")
    .trim();
}
