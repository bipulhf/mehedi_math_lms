import { describe, expect, test } from "bun:test";

import { latexToPlainText, richTextToPlainText, textWithMathToPlainText } from "./math-plain-text";

/**
 * The characters-only fallback. It is used for truncated list rows and labels,
 * never where a reader has to actually do the maths — so "readable" is the bar,
 * not "correct typesetting".
 */

describe("latexToPlainText", () => {
  test("fractions read as a division", () => {
    expect(latexToPlainText("\\frac{a}{b}")).toBe("a/b");
    expect(latexToPlainText("\\frac{dy}{dx}")).toBe("dy/dx");
  });

  test("nested fractions resolve from the inside out", () => {
    expect(latexToPlainText("\\frac{\\frac{a}{b}}{c}")).toBe("a/b/c");
  });

  test("powers and indices become real characters where they exist", () => {
    expect(latexToPlainText("x^{2}")).toBe("x²");
    expect(latexToPlainText("a_{n}")).toBe("aₙ");
    expect(latexToPlainText("x^2")).toBe("x²");
  });

  test("a power with no character for it keeps its notation", () => {
    expect(latexToPlainText("x^{k+1}")).toBe("x^(k+1)");
  });

  test("roots and Greek come from the palette table", () => {
    expect(latexToPlainText("\\sqrt{x}")).toBe("√(x)");
    expect(latexToPlainText("\\sqrt[3]{x}")).toBe("3√(x)");
    expect(latexToPlainText("\\alpha + \\beta")).toBe("α + β");
  });

  test("an unknown command degrades to its own name rather than vanishing", () => {
    expect(latexToPlainText("\\operatorname{sgn} x")).toBe("operatorname sgn x");
  });

  test("a matrix reads as rows", () => {
    expect(latexToPlainText("\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}")).toBe("a b ; c d");
  });
});

describe("textWithMathToPlainText", () => {
  test("leaves prose alone and flattens only the formulas", () => {
    expect(textWithMathToPlainText("Solve $\\frac{a}{b}$ now")).toBe("Solve a/b now");
  });

  test("does not decode entities in a plain field", () => {
    // An MCQ option is stored unescaped, so `&lt;` there is four characters a
    // student typed, not markup.
    expect(textWithMathToPlainText("a &lt; b")).toBe("a &lt; b");
  });
});

describe("richTextToPlainText", () => {
  test("strips markup, decodes entities and flattens maths", () => {
    expect(richTextToPlainText("<p>Find <strong>$\\frac{a}{b}$</strong> when $x &lt; 2$</p>")).toBe(
      "Find a/b when x < 2"
    );
  });

  test("gives a truncated row something readable instead of raw source", () => {
    expect(richTextToPlainText("<p>$\\int_{0}^{1} x\\,dx$ কত?</p>")).toBe("∫₀¹ x dx কত?");
  });
});
