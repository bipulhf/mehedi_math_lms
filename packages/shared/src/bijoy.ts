import {
  ALL_SYMBOLS,
  CONVERSION_MAP,
  KAARS,
  KAAR_POST_CONVERSION,
  POST_CONVERSION_MAP,
  POST_SYMBOLS_MAP,
  PRE_CONVERSION_MAP,
  PRE_SYMBOLS_MAP,
  REFF
} from "./bijoy-char-map";

/**
 * Bijoy/SutonnyMJ ASCII → Unicode Bengali.
 *
 * Ported from the owner's other project. It is an **authoring aid, not a data
 * rule**: it runs in the browser when a teacher pastes, never on the server and
 * never on save. Conversion is lossy in the sense that it guesses — so it is
 * always undoable, and the stored value is whatever the teacher accepted.
 *
 * Two things it must not damage, both common in this product's questions:
 * LaTeX the teacher typed by hand, and Bangladeshi board tags like `[CB 2023]`.
 * Both are protected by splitting on a capture group, which drops the protected
 * runs on odd indices — no placeholder substitution to get wrong.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createConversionPattern(symbols: Record<string, string>, delimiter = ""): string {
  return Object.keys(symbols)
    .filter((key) => key.length > 0)
    .map((key) => escapeRegExp(key))
    .join(delimiter);
}

const SYMBOLS_CONVERSION_PATTERN = new RegExp(
  "([" + createConversionPattern(ALL_SYMBOLS, "") + "])",
  "g"
);

const MAIN_CONVERSION_PATTERN = new RegExp(
  "([w†‡ˆ‰Š]?)(([" +
    createConversionPattern(PRE_SYMBOLS_MAP) +
    "])*([" +
    createConversionPattern(CONVERSION_MAP, "") +
    "])?([" +
    createConversionPattern(POST_SYMBOLS_MAP) +
    "])*)([" +
    createConversionPattern(REFF) +
    "])?([ævxyz“–~ƒ‚„…]?)([" +
    createConversionPattern(POST_SYMBOLS_MAP) +
    "])*",
  "g"
);

const HASAANT_PATTERN = new RegExp("(" + escapeRegExp("্") + ")+", "g");

const PRE_CONVERSION_PATTERN = new RegExp(
  "(" + createConversionPattern(PRE_CONVERSION_MAP, "|") + ")",
  "g"
);

const POST_CONVERSION_PATTERN = new RegExp(
  "(" + createConversionPattern(POST_CONVERSION_MAP, "|") + ")",
  "g"
);

/** `noUncheckedIndexedAccess` makes every table lookup optional; this is the one place that matters. */
function lookup(table: Record<string, string>, key: string): string {
  return table[key] ?? "";
}

function replaceSymbol(match: string): string {
  return lookup(ALL_SYMBOLS, match);
}

/**
 * One orthographic cluster.
 *
 * The regex captures a *pre-positioned* kaar (`†`, `‡`, `ˆ`…) as group 1, ahead
 * of the consonant it visually precedes, and this puts it back after the
 * cluster — which is the whole reordering problem solved without a
 * character-by-character walker.
 */
function mainConverter(
  match: string,
  preKaar: string,
  unit: string,
  _group3: string,
  _group4: string,
  _group5: string,
  reff: string,
  postKaar: string,
  postPhala: string
): string {
  if (!match) {
    return "";
  }

  let core = unit.replace(SYMBOLS_CONVERSION_PATTERN, replaceSymbol);

  core = core.replace(HASAANT_PATTERN, () => "্");
  core = reff ? "র্" + core : core;
  core = postPhala ? core + lookup(POST_SYMBOLS_MAP, postPhala) : core;

  const kaarString = `${preKaar ? lookup(KAARS, preKaar) : ""}${postKaar ? lookup(KAARS, postKaar) : ""}`;

  return core + (KAAR_POST_CONVERSION[kaarString] ?? kaarString);
}

function rawBijoyToUnicode(input: string): string {
  let text = input.replace(PRE_CONVERSION_PATTERN, (match) => PRE_CONVERSION_MAP[match] ?? match);

  text = text.replace(MAIN_CONVERSION_PATTERN, mainConverter);

  return text.replace(POST_CONVERSION_PATTERN, (match) => POST_CONVERSION_MAP[match] ?? match);
}

/** LaTeX the author typed by hand. Never converted, in either direction. */
const LATEX_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/gm;

/**
 * Everything `bijoyToUnicode` leaves alone: LaTeX, board tags, a lone Latin
 * letter in an equation (`x =`, `n +`), and parenthesised ASCII.
 */
const PROTECTED_PATTERN =
  /(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\[(?:CB|DB|JB|RB|SB|BB|CtgB|MB|DinB|SylB|All Board)\s+\d{4}\]|\b[A-Za-z]\s*(?:=|<|>|\+|-|:)|\(\s*[A-Za-z0-9\s-]+\s*\))/gm;

/** Glyphs that no English word and no LaTeX command contains. */
const BIJOY_GLYPH_PATTERN = /[†‡ˆªº«¨©Œš›¤¯®‘’“”ƒ‹™˜Ö¬¦¥¢£æ]/;

/** `` ` `` is দ in Bijoy and is close to unheard-of in ordinary prose. */
const BIJOY_ASCII_HINT = /`/;

const ASCII_WORD_PATTERN = /\b[A-Za-z]{3,}\b/g;

/**
 * Is this text Bijoy rather than English?
 *
 * Deliberately biased towards missing rather than guessing. A missed paste
 * costs one click on the convert button; a wrong guess silently mangles an
 * English sentence a teacher typed, and they may not notice until a student
 * sits the exam.
 *
 * The reference implementation counted a run of four "mapped consonants"
 * (`\b[KLMN…bcdfghjklmnpqrtwxyz]{4,}\b`) as evidence, which matches `rhythm`,
 * `crypt` and `lymph`. Here the evidence is a non-ASCII Bijoy glyph, a
 * backtick, or three vowel-less words — an English sentence essentially never
 * has three.
 */
export function isBijoyEncoded(text: string): boolean {
  // LaTeX comes out first: `\alpha` and `x^{2}` are full of characters a looser
  // detector would read as Bijoy.
  const stripped = text.replace(LATEX_PATTERN, "");

  // Already Unicode Bengali — converting again would destroy it.
  if (/[ঀ-৿]/.test(stripped)) {
    return false;
  }

  if (BIJOY_GLYPH_PATTERN.test(stripped) || BIJOY_ASCII_HINT.test(stripped)) {
    return true;
  }

  const vowellessWords = (stripped.match(ASCII_WORD_PATTERN) ?? []).filter(
    (word) => !/[aeiouAEIOU]/.test(word)
  );

  return vowellessWords.length >= 3;
}

export interface BijoyConversionOptions {
  /**
   * Bengali numerals for ASCII digits. Off by default: digits inside a formula
   * have to stay ASCII or the LaTeX stops parsing.
   */
  convertDigits?: boolean | undefined;
}

export function bijoyToUnicode(input: string, options: BijoyConversionOptions = {}): string {
  const parts = input.split(PROTECTED_PATTERN);
  const converted = parts.map((part, index) => {
    // `String.split` with one capture group leaves the protected runs on the
    // odd indices, so they pass through untouched.
    if (index % 2 === 1) {
      return part;
    }

    const text = rawBijoyToUnicode(part);

    if (options.convertDigits === true) {
      return text;
    }

    const bengaliDigits = "০১২৩৪৫৬৭৮৯";

    return text.replace(/[০-৯]/g, (digit) => String(bengaliDigits.indexOf(digit)));
  });

  // A pasted option sometimes carries its own label; the app numbers options itself.
  const text = converted.join("").replace(/^[কখগঘ][)।]\s*/gm, "");

  // The tables emit precomposed য় and ড়, while a phone keyboard emits the
  // decomposed pair. Normalising here means one spelling reaches storage, so
  // two questions that read identically also compare identically.
  return text.normalize("NFC");
}
