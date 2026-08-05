import { describe, expect, test } from "bun:test";

import { bijoyToUnicode, isBijoyEncoded } from "./bijoy";

/**
 * Bijoy conversion, with the reference project's suite carried over plus the
 * false positives that made auto-conversion unsafe there.
 */

describe("bijoyToUnicode", () => {
  test("converts consonants and vowel signs", () => {
    expect(bijoyToUnicode("K")).toBe("ক");
    expect(bijoyToUnicode("Kv")).toBe("কা");
  });

  test("moves a pre-positioned e-kaar behind its consonant", () => {
    expect(bijoyToUnicode("†K")).toBe("কে");
  });

  test("handles conjuncts and reph", () => {
    expect(bijoyToUnicode("cÖ")).toBe("প্র");
    expect(bijoyToUnicode("g¨vwUª·")).toBe("ম্যাট্রিক্স");
    expect(bijoyToUnicode("wbYv©qK")).toBe("নির্ণায়ক");
  });

  test("leaves LaTeX exactly as the teacher typed it", () => {
    expect(bijoyToUnicode("$\\frac{a}{b}$")).toBe("$\\frac{a}{b}$");
    expect(bijoyToUnicode("hw` $x^2=4$ nq")).toBe("যদি $x^2=4$ হয়");
  });

  test("converts Bangla around a formula without touching the formula", () => {
    expect(bijoyToUnicode("hw` $\\sin\\theta = \\frac{3}{5}$ nq")).toBe(
      "যদি $\\sin\\theta = \\frac{3}{5}$ হয়"
    );
  });

  test("keeps a board tag intact", () => {
    expect(bijoyToUnicode("g¨vwUª·wU cÖwZmg n‡j [CB 2023]")).toContain("[CB 2023]");
  });

  test("digits stay ASCII unless asked, because a formula needs them that way", () => {
    expect(bijoyToUnicode("12345")).toBe("12345");
    expect(bijoyToUnicode("12345", { convertDigits: true })).toBe("১২৩৪৫");
  });
});

describe("isBijoyEncoded", () => {
  test("recognises Bijoy text", () => {
    expect(isBijoyEncoded("g¨vwUª·")).toBe(true);
    expect(isBijoyEncoded("hw` $x^2=4$ nq")).toBe(true);
  });

  test("says no to text that is already Unicode Bengali", () => {
    expect(isBijoyEncoded("ম্যাট্রিক্স")).toBe(false);
  });

  test("says no to LaTeX and to ordinary English", () => {
    expect(isBijoyEncoded("$\\frac{a}{b}$")).toBe(false);
    expect(isBijoyEncoded("Matrix determinant MCQ")).toBe(false);
  });

  test("does not mistake vowel-less English words for Bijoy", () => {
    // The reference implementation treated a four-consonant run as evidence and
    // would have mangled every one of these on paste.
    expect(isBijoyEncoded("rhythm")).toBe(false);
    expect(isBijoyEncoded("crypt")).toBe(false);
    expect(isBijoyEncoded("lymph")).toBe(false);
    expect(isBijoyEncoded("The syzygy of rhythm")).toBe(false);
  });
});
