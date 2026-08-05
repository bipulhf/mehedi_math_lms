import { describe, expect, test } from "bun:test";

import { renderMathInHtml } from "./math-html";

/**
 * The render pass. A stub renderer stands in for KaTeX so these assert the
 * splitting and the decoding rather than anybody's typesetting.
 */

const stub = (latex: string, isDisplay: boolean): string =>
  `<math data-display="${String(isDisplay)}">${latex}</math>`;

describe("renderMathInHtml", () => {
  test("html without a dollar comes back byte-identical", () => {
    const html = "<p>An ordinary question about <strong>gravity</strong>.</p>";

    expect(renderMathInHtml(html, stub)).toBe(html);
  });

  test("renders inline maths and leaves the markup around it alone", () => {
    expect(renderMathInHtml("<p>Solve <strong>$x^2$</strong></p>", stub)).toBe(
      '<p>Solve <strong><math data-display="false">x^2</math></strong></p>'
    );
  });

  test("marks $$ as display", () => {
    expect(renderMathInHtml("<p>$$x^2$$</p>", stub)).toBe(
      '<p><math data-display="true">x^2</math></p>'
    );
  });

  test("hands the renderer the LaTeX the teacher typed, not the escaped form", () => {
    const html = "<p>$\\begin{bmatrix} a &amp; b \\end{bmatrix}$</p>";

    expect(renderMathInHtml(html, stub)).toContain("a & b");
  });

  test("never scans an attribute", () => {
    const html = '<p><a href="/pay?amount=$5">$x$</a></p>';

    expect(renderMathInHtml(html, stub)).toBe(
      '<p><a href="/pay?amount=$5"><math data-display="false">x</math></a></p>'
    );
  });

  test("a price in prose survives untouched", () => {
    const html = "<p>Was $500, now $400.</p>";

    expect(renderMathInHtml(html, stub)).toBe(html);
  });
});
