import { describe, expect, test } from "bun:test";

import { isEmptyHtml, sanitizeHtml, stripHtml } from "@/lib/html";

/**
 * The sanitiser sits upstream of maths rendering: a question is sanitised on
 * the way in, and whatever survives is what KaTeX is later asked to typeset.
 *
 * These pin that LaTeX survives it. The allowlist deliberately has no `span`,
 * no `class` and no `data-*` — which is only safe because the maths is plain
 * text at this point (ADR-0014) — so a future edit that starts stripping
 * backslashes or braces would silently break every formula in the product, and
 * would do it quietly, at read time, long after the edit.
 */

describe("sanitizeHtml keeps maths intact", () => {
  test("dollars, backslashes and braces pass through", () => {
    expect(sanitizeHtml("<p>Solve $\\frac{a}{b}$</p>")).toBe("<p>Solve $\\frac{a}{b}$</p>");
  });

  test("a display formula is left alone", () => {
    expect(sanitizeHtml("<p>$$\\int_{0}^{1} x\\,dx$$</p>")).toBe(
      "<p>$$\\int_{0}^{1} x\\,dx$$</p>"
    );
  });

  test("a matrix keeps its escaped column separators", () => {
    // `&` arrives escaped from the editor and must stay escaped through here;
    // the renderer decodes it immediately before KaTeX sees it.
    expect(sanitizeHtml("<p>$\\begin{bmatrix} a &amp; b \\end{bmatrix}$</p>")).toContain("&amp;");
  });

  test("an inequality survives as an entity rather than becoming a tag", () => {
    const sanitized = sanitizeHtml("<p>$x &lt; y$</p>");

    expect(sanitized).toContain("&lt;");
    expect(sanitized).not.toContain("<y");
  });

  test("markup rules are unchanged by any of this", () => {
    expect(sanitizeHtml('<p onclick="alert(1)">$x$</p>')).toBe("<p>$x$</p>");
    expect(sanitizeHtml("<script>alert(1)</script><p>$x$</p>")).toBe("<p>$x$</p>");
  });
});

describe("stripHtml and isEmptyHtml", () => {
  test("stripping leaves the formula source, which is why labels use richTextToPlainText", () => {
    expect(stripHtml("<p>Find $\\frac{a}{b}$</p>")).toBe("Find $\\frac{a}{b}$");
  });

  test("a field holding only a formula is not empty", () => {
    expect(isEmptyHtml("<p>$x^2$</p>")).toBe(false);
    expect(isEmptyHtml("<p></p>")).toBe(true);
  });
});
