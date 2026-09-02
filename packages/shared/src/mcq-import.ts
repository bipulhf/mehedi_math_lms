import { bijoyToUnicode, isBijoyEncoded } from "./bijoy";
import { escapeHtmlText, hasMathDelimiters } from "./math-segments";
import { checkMathBudget } from "./validators/math";

/**
 * Reading a paper that has already been through the Bijoy-to-LaTeX converter.
 *
 * That tool turns a SutonnyMJ Word document into
 * `{ question: string; options: string[] }[]`, with Word equations converted to
 * **bare LaTeX concatenated straight into the string** -- no delimiters, no
 * marker of any kind:
 *
 * ```
 * \begin{bmatrix}4 & 0 & -2\end{bmatrix} ম্যাট্রিক্সটি প্রতিসম হলে m = কত? [CB 2023]
 * ```
 *
 * The owner's other project accepts that as-is because it renders a whole field
 * as one LaTeX expression and auto-wraps Bangla in `\text{}`. Here maths is
 * LaTeX between dollars inside ordinary rich text (ADR-0014), so something has
 * to decide which spans of that string are maths. The tool does not say, so
 * this module works it out -- and is deliberately biased towards saying "no".
 */

/** A question ready for the builder's draft, once a teacher marks an answer. */
export interface ImportedMcqQuestion {
  optionTexts: readonly string[];
  /** HTML, because question text is rich text. Options are plain. */
  questionHtml: string;
}

export interface McqImportRejection {
  /** 1-based, so it matches what the teacher counts in the pasted list. */
  index: number;
  reason: "emptyQuestion" | "tooFewOptions" | "tooLong";
}

export interface McqImportResult {
  questions: readonly ImportedMcqQuestion[];
  rejected: readonly McqImportRejection[];
}

export type McqImportFailure = "empty" | "notArray" | "notJson";

export class McqImportError extends Error {
  public constructor(
    public readonly reason: McqImportFailure,
    message: string
  ) {
    super(message);
    this.name = "McqImportError";
  }
}

/** Bengali, and the danda. A hard boundary: prose never belongs inside `$...$`. */
const BANGLA = /[ঀ-৿।]/;

/**
 * Board tags like `[CB 2023]` and `[MSB 2021]`, which end most questions in a
 * Bangladeshi paper. Bracketed, full of capitals and digits, and not maths --
 * pulled out before anything else looks at the string, the same way `bijoy.ts`
 * protects them from conversion.
 */
const CITATION = /\[[^\]\n]{0,24}\d{4}\]/g;

/**
 * Where a protected run sits while the scanner runs. Private-use codepoints,
 * so they are neither Bengali nor a maths character and therefore end a run
 * the same way a full stop would. A digit-based placeholder would not survive:
 * digits *are* maths characters, so `[CB 2023]` would come back as part of the
 * formula next to it.
 */
const PLACEHOLDER_OPEN = "\uE000";
const PLACEHOLDER_CLOSE = "\uE001";
const PLACEHOLDER = /\uE000(\d+)\uE001/g;

/** Characters allowed to sit inside a formula alongside the LaTeX itself. */
const MATH_CHAR = /[A-Za-z0-9+\-*/=<>^_(){}[\]|&!'~:;,. ]/;

/** What makes a run maths rather than a stretch of Latin prose. */
const LATEX_ANCHOR = /\\[A-Za-z]|\\\\|[\^_][{(A-Za-z0-9]/;

/**
 * A `\begin{…}…\end{…}` block, taken whole.
 *
 * The converter emits matrices with the row separators the author typed, so a
 * `vmatrix` regularly arrives split across two or three lines. A newline
 * otherwise ends a run — which would cut such a matrix into three unbalanced
 * pieces, each one its own broken formula. This is checked before the
 * character rules so an environment survives its own line breaks.
 */
const ENVIRONMENT = /^\\begin\{([A-Za-z*]+)\}[\s\S]*?\\end\{\1\}/;

/** Punctuation that ends a sentence rather than a formula. */
const LEADING_NOISE = /^[\s,.;:]+/;
const TRAILING_NOISE = /[\s,.;:]+$/;

function wrapRun(run: string): string {
  const leading = LEADING_NOISE.exec(run)?.[0] ?? "";
  const withoutLeading = run.slice(leading.length);
  const trailing = TRAILING_NOISE.exec(withoutLeading)?.[0] ?? "";
  const inner = withoutLeading.slice(0, withoutLeading.length - trailing.length);

  if (inner.length === 0 || !LATEX_ANCHOR.test(inner)) {
    return run;
  }

  return `${leading}$${inner}$${trailing}`;
}

/**
 * Put dollars around the parts of a converted string that are really LaTeX.
 *
 * The rule is one sentence: **a run becomes maths only when it contains an
 * unmistakable LaTeX control sequence**, and it stops at the first Bengali
 * character. Everything else stays prose -- a lone `m` in `m = কত?`, the
 * `i ও ii` of a multi-select option, a board tag.
 *
 * That under-wraps on purpose. A missed formula renders as the LaTeX a teacher
 * can see and fix in the editor; an over-wrap renders somebody's Latin prose as
 * italic maths variables, which is the exact failure ADR-0014 gives as its
 * reason for not adopting the other project's whole-field approach, and which
 * nobody notices until a student sits the exam.
 *
 * A string that already carries dollars is returned untouched -- so the day the
 * converter learns to emit them, this becomes a no-op rather than a second
 * opinion.
 */
export function wrapBareLatex(text: string): string {
  if (hasMathDelimiters(text)) {
    return text;
  }

  const protectedRuns: string[] = [];
  const masked = text.replace(CITATION, (match) => {
    protectedRuns.push(match);

    return `${PLACEHOLDER_OPEN}${String(protectedRuns.length - 1)}${PLACEHOLDER_CLOSE}`;
  });

  let output = "";
  let run = "";

  const flush = (): void => {
    if (run.length > 0) {
      output += wrapRun(run);
      run = "";
    }
  };

  for (let cursor = 0; cursor < masked.length; cursor += 1) {
    const environment = masked.startsWith("\\begin{", cursor)
      ? ENVIRONMENT.exec(masked.slice(cursor))?.[0]
      : undefined;

    if (environment !== undefined) {
      run += environment;
      cursor += environment.length - 1;
      continue;
    }

    const character = masked[cursor] ?? "";
    const isBoundary = BANGLA.test(character) || (character !== "\\" && !MATH_CHAR.test(character));

    if (isBoundary) {
      flush();
      output += character;
      continue;
    }

    run += character;
  }

  flush();

  return output.replace(PLACEHOLDER, (match, index: string) => protectedRuns[Number(index)] ?? match);
}

/**
 * Bijoy that never went through the converter.
 *
 * Pasting out of the Word file instead of out of the converter is the
 * neighbouring mistake, and it produces something unreadable rather than
 * something subtly wrong. Digits stay ASCII for the reason they do everywhere
 * else: Bengali numerals inside a formula stop it parsing.
 */
function normalizeEncoding(text: string): string {
  return isBijoyEncoded(text) ? bijoyToUnicode(text, { convertDigits: false }) : text;
}

function prepare(text: string): string {
  return wrapBareLatex(normalizeEncoding(text).trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Parse what the converter's "copy" button puts on the clipboard.
 *
 * Rejects rather than repairs. A real export opens with a letterhead paragraph
 * carrying no options at all, and a question with one option is a detection
 * failure upstream rather than something to pad out to four -- both come back
 * in `rejected` with their position, so the teacher looks at the document
 * instead of at a silently shortened exam.
 */
export function parseMcqImport(raw: string): McqImportResult {
  if (raw.trim().length === 0) {
    throw new McqImportError("empty", "Paste the JSON from the converter first");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new McqImportError("notJson", "That is not valid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new McqImportError("notArray", "The JSON must be an array of questions");
  }

  const questions: ImportedMcqQuestion[] = [];
  const rejected: McqImportRejection[] = [];

  parsed.forEach((item, position) => {
    const index = position + 1;
    const record = isRecord(item) ? item : {};
    const questionText = typeof record.question === "string" ? prepare(record.question) : "";
    const optionTexts = (Array.isArray(record.options) ? record.options : [])
      .filter((option): option is string => typeof option === "string")
      .map(prepare)
      .filter((option) => option.length > 0);

    if (questionText.length === 0) {
      rejected.push({ index, reason: "emptyQuestion" });

      return;
    }

    if (optionTexts.length < 2) {
      rejected.push({ index, reason: "tooFewOptions" });

      return;
    }

    const questionHtml = `<p>${escapeHtmlText(questionText)}</p>`;

    if (
      checkMathBudget(questionHtml) !== null ||
      optionTexts.some((option) => checkMathBudget(option) !== null)
    ) {
      rejected.push({ index, reason: "tooLong" });

      return;
    }

    questions.push({ optionTexts, questionHtml });
  });

  return { questions, rejected };
}
