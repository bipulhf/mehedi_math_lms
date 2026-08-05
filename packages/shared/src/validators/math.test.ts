import { describe, expect, test } from "bun:test";

import { checkMathBudget, mathLimits } from "./math";
import { createQuestionSchema, questionOptionSchema } from "./tests";

/**
 * The ceilings that exist for the renderer rather than for the author. KaTeX
 * runs during the server render of every exam page, so a field is allowed to be
 * long but not to be a thousand formulas.
 */

const validQuestion = {
  marks: 1,
  questionText: "<p>Solve $x^2$</p>"
};

describe("checkMathBudget", () => {
  test("ordinary maths passes", () => {
    expect(checkMathBudget("<p>Find $\\frac{a}{b}$ when $x = 2$</p>")).toBeNull();
  });

  test("counts formulas, not characters", () => {
    const many = "$x$ ".repeat(mathLimits.maxSegments + 1);

    expect(checkMathBudget(many)).toBe("segments");
    expect(checkMathBudget("$x$ ".repeat(mathLimits.maxSegments))).toBeNull();
  });

  test("one absurd formula is refused on its own", () => {
    expect(checkMathBudget(`$${"x".repeat(mathLimits.maxLatexLength + 1)}$`)).toBe("latexLength");
  });

  test("the whole field has a hard byte ceiling", () => {
    expect(checkMathBudget("a".repeat(mathLimits.maxBytes + 1))).toBe("bytes");
  });
});

describe("question schemas carry the budget", () => {
  test("a question with maths in it is accepted", () => {
    expect(createQuestionSchema.safeParse(validQuestion).success).toBe(true);
  });

  test("a question of a thousand formulas is not", () => {
    const result = createQuestionSchema.safeParse({
      ...validQuestion,
      questionText: `<p>${"$x$ ".repeat(mathLimits.maxSegments + 1)}</p>`
    });

    expect(result.success).toBe(false);
  });

  test("an option may carry maths, up to the raised cap", () => {
    expect(questionOptionSchema.safeParse({ optionText: "$\\frac{1}{2}$" }).success).toBe(true);
    expect(questionOptionSchema.safeParse({ optionText: "a".repeat(4001) }).success).toBe(false);
  });
});
