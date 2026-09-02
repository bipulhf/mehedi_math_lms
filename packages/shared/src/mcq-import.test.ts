import { describe, expect, test } from "bun:test";

import { McqImportError, parseMcqImport, wrapBareLatex } from "./mcq-import";
import { segmentMath } from "./math-segments";

/**
 * Every question string below is copied from a real export of the converter
 * (`bijoy_to_latex/output/output.json`), because the whole risk here is what
 * that tool actually emits rather than what a clean example would.
 */

describe("wrapBareLatex", () => {
  test("wraps a matrix and leaves the Bangla sentence after it alone", () => {
    const wrapped = wrapBareLatex(
      "\\begin{bmatrix}4 & 0 & -2 \\\\0 & 5 & m \\\\-2 & 4 & 5\\end{bmatrix} ম্যাট্রিক্সটি প্রতিসম হলে m = কত?"
    );

    expect(wrapped).toBe(
      "$\\begin{bmatrix}4 & 0 & -2 \\\\0 & 5 & m \\\\-2 & 4 & 5\\end{bmatrix}$ ম্যাট্রিক্সটি প্রতিসম হলে m = কত?"
    );
  });

  test("leaves a board tag as prose", () => {
    // The trap: `[CB 2023]` is bracketed digits sitting next to a formula.
    const wrapped = wrapBareLatex("A এর মাত্রা 4 \\times5, ম্যাট্রিক্স [CB 2023]");

    expect(wrapped).toBe("A এর মাত্রা $4 \\times5$, ম্যাট্রিক্স [CB 2023]");
  });

  test("a run with no LaTeX in it stays prose", () => {
    // Latin without a control sequence: a lone variable, roman numerals, a
    // question number. Wrapping any of these renders them as italic maths.
    expect(wrapBareLatex("i ও ii")).toBe("i ও ii");
    expect(wrapBareLatex("নিচের কোনটি সঠিক? i) কর্ণ ম্যাট্রিক্স")).toBe(
      "নিচের কোনটি সঠিক? i) কর্ণ ম্যাট্রিক্স"
    );
    expect(wrapBareLatex("স্কেলার")).toBe("স্কেলার");
  });

  test("wraps an option that is nothing but a formula", () => {
    expect(wrapBareLatex("4\\times4")).toBe("$4\\times4$");
    expect(wrapBareLatex("\\left[ 1 \\right]")).toBe("$\\left[ 1 \\right]$");
  });

  test("keeps the variable that leads into a formula inside it", () => {
    expect(wrapBareLatex("A = \\begin{pmatrix}2 \\\\1+2i\\end{pmatrix} এর অনুবন্ধী")).toBe(
      "$A = \\begin{pmatrix}2 \\\\1+2i\\end{pmatrix}$ এর অনুবন্ধী"
    );
  });

  test("does not swallow the punctuation that ends a sentence", () => {
    const wrapped = wrapBareLatex("মাত্রা 5\\times4 হলে BA এর মাত্রা কত?");

    expect(wrapped).toBe("মাত্রা $5\\times4$ হলে BA এর মাত্রা কত?");
  });

  test("keeps an environment together when the converter split it over lines", () => {
    // Real output: the row separators the author typed survive as newlines, and
    // a newline otherwise ends a run. Cutting here would make three unbalanced
    // formulas out of one matrix -- five of the KaTeX errors in the sample
    // export, before this case was handled.
    const wrapped = wrapBareLatex(
      "\\begin{vmatrix}0 & 1 & \\omega \\\\1 & \\omega & \\omega\n\\\\\\omega & 1 & \\omega\n\\end{vmatrix} এর মান"
    );

    expect(segmentMath(wrapped).filter((segment) => segment.kind !== "text")).toHaveLength(1);
    expect(wrapped.endsWith("$ এর মান")).toBe(true);
  });

  test("leaves a string that already carries dollars untouched", () => {
    // The day the converter learns to emit delimiters, this is the whole of
    // what this function should do.
    const already = "Solve $\\frac{dy}{dx}$ when $x = 2$";

    expect(wrapBareLatex(already)).toBe(already);
  });

  test("what it produces is what the segmenter reads back", () => {
    const wrapped = wrapBareLatex("যদি 2\\times3 হয়");
    const kinds = segmentMath(wrapped).map((segment) => segment.kind);

    expect(kinds).toEqual(["text", "inline", "text"]);
  });
});

describe("parseMcqImport", () => {
  const exported = JSON.stringify([
    { options: [], question: "Mehedi Sir CSE, SUST EX: Notre Dame College" },
    {
      options: ["-2", "0", "4", "5"],
      question: "\\begin{bmatrix}4 & 0\\end{bmatrix} ম্যাট্রিক্সটি প্রতিসম হলে m = কত? [CB 2023]"
    },
    { options: ["4\\times4", "5\\times5"], question: "মাত্রা কত?" }
  ]);

  test("takes the questions and names the rows it refused", () => {
    const result = parseMcqImport(exported);

    expect(result.questions).toHaveLength(2);
    // The letterhead paragraph every export opens with.
    expect(result.rejected).toEqual([{ index: 1, reason: "tooFewOptions" }]);
  });

  test("question text arrives as an escaped paragraph, options as plain text", () => {
    const [first] = parseMcqImport(exported).questions;

    expect(first?.questionHtml).toBe(
      "<p>$\\begin{bmatrix}4 &amp; 0\\end{bmatrix}$ ম্যাট্রিক্সটি প্রতিসম হলে m = কত? [CB 2023]</p>"
    );
    expect(first?.optionTexts).toEqual(["-2", "0", "4", "5"]);
  });

  test("options are wrapped the same way question text is", () => {
    const questions = parseMcqImport(exported).questions;

    expect(questions[1]?.optionTexts).toEqual(["$4\\times4$", "$5\\times5$"]);
  });

  test("a question with nothing in it is refused rather than imported empty", () => {
    const result = parseMcqImport(JSON.stringify([{ options: ["a", "b"], question: "   " }]));

    expect(result.questions).toHaveLength(0);
    expect(result.rejected).toEqual([{ index: 1, reason: "emptyQuestion" }]);
  });

  test("a field past the maths budget is refused, not truncated", () => {
    const tooMany = Array.from({ length: 80 }, () => "\\alpha").join(" ও ");
    const result = parseMcqImport(JSON.stringify([{ options: ["a", "b"], question: tooMany }]));

    expect(result.rejected).toEqual([{ index: 1, reason: "tooLong" }]);
  });

  test("says which way the paste was wrong", () => {
    expect(() => parseMcqImport("  ")).toThrow(McqImportError);
    expect(() => parseMcqImport("not json at all")).toThrow("That is not valid JSON");
    expect(() => parseMcqImport('{"question":"one"}')).toThrow(
      "The JSON must be an array of questions"
    );
  });
});
