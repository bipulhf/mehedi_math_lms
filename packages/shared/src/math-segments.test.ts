import { describe, expect, test } from "bun:test";

import {
  decodeHtmlEntities,
  escapeHtmlText,
  hasMathDelimiters,
  segmentMath,
  splitHtmlTextNodes
} from "./math-segments";

/**
 * Where maths starts and stops. Every rule here exists because getting it wrong
 * turns a teacher's sentence into a formula or a formula into a sentence.
 */

describe("segmentMath", () => {
  test("splits prose from an inline formula", () => {
    expect(segmentMath("Solve $x^2$ now")).toEqual([
      { kind: "text", value: "Solve " },
      { kind: "inline", value: "x^2" },
      { kind: "text", value: " now" }
    ]);
  });

  test("reads $$ as display before it reads $", () => {
    expect(segmentMath("$$\\int_0^1 x\\,dx$$")).toEqual([
      { kind: "display", value: "\\int_0^1 x\\,dx" }
    ]);
  });

  test("prices are not formulas", () => {
    // The single most likely false positive in a course description.
    expect(segmentMath("$5 off, $10 off")).toEqual([{ kind: "text", value: "$5 off, $10 off" }]);
  });

  test("an escaped dollar is a dollar", () => {
    expect(segmentMath("costs \\$5")).toEqual([{ kind: "text", value: "costs \\$5" }]);
  });

  test("an unterminated dollar does not swallow the rest of the sentence", () => {
    expect(segmentMath("what is $x for")).toEqual([{ kind: "text", value: "what is $x for" }]);
  });

  test("empty delimiters are text, not an empty formula", () => {
    expect(segmentMath("a $$ b")).toEqual([{ kind: "text", value: "a $$ b" }]);
  });

  test("pairs left to right across several formulas", () => {
    expect(segmentMath("$a$ and $b$")).toEqual([
      { kind: "inline", value: "a" },
      { kind: "text", value: " and " },
      { kind: "inline", value: "b" }
    ]);
  });

  test("display maths may be written with room around it", () => {
    expect(segmentMath("$$ x + y $$")).toEqual([{ kind: "display", value: " x + y " }]);
  });
});

describe("splitHtmlTextNodes", () => {
  test("a dollar inside an attribute is never scanned", () => {
    const chunks = splitHtmlTextNodes('<a href="/p?a=$5">buy</a>');

    expect(chunks.filter((chunk) => !chunk.isTag).map((chunk) => chunk.value)).toEqual(["buy"]);
  });

  test("a formula cannot cross a tag boundary", () => {
    const chunks = splitHtmlTextNodes("<p>$a <br> b$</p>");
    const text = chunks.filter((chunk) => !chunk.isTag).map((chunk) => chunk.value);

    // Each run is segmented on its own, so both dollars stay literal.
    expect(text.flatMap((run) => segmentMath(run)).every((segment) => segment.kind === "text")).toBe(
      true
    );
  });
});

describe("decodeHtmlEntities", () => {
  test("gives a matrix its column separators back", () => {
    // TipTap escapes `&`, so this is what a bmatrix looks like in storage.
    expect(decodeHtmlEntities("\\begin{bmatrix} a &amp; b \\end{bmatrix}")).toBe(
      "\\begin{bmatrix} a & b \\end{bmatrix}"
    );
  });

  test("decodes once, so an author who wrote &lt; keeps it", () => {
    expect(decodeHtmlEntities("&amp;lt;")).toBe("&lt;");
  });

  test("handles the inequality case and numeric references", () => {
    expect(decodeHtmlEntities("x &lt; y &gt; z")).toBe("x < y > z");
    expect(decodeHtmlEntities("&#8804; and &#x3C0;")).toBe("≤ and π");
  });

  test("leaves something that only looks like an entity alone", () => {
    expect(decodeHtmlEntities("a & b; c")).toBe("a & b; c");
  });
});

describe("escapeHtmlText", () => {
  test("round-trips with the decoder", () => {
    expect(decodeHtmlEntities(escapeHtmlText("a & b < c"))).toBe("a & b < c");
  });
});

describe("hasMathDelimiters", () => {
  test("is the cheap gate the no-maths path relies on", () => {
    expect(hasMathDelimiters("<p>Plain question</p>")).toBe(false);
    expect(hasMathDelimiters("<p>$x$</p>")).toBe(true);
  });
});
