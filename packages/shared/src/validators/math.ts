import { z } from "zod";

import { segmentMath } from "../math-segments";

/**
 * What a field is allowed to ask a maths renderer to do.
 *
 * `richTextSchema` counts *visible* characters, which is the right limit to
 * explain to an author but says nothing about renderer cost: `\frac{1}{2}`
 * repeated a thousand times is short text and a thousand KaTeX calls, on the
 * server, on every page view. These three ceilings are about the machine, not
 * the author, and are set far above any real question — a hard paper runs to a
 * few dozen formulas.
 */
export const mathLimits = {
  /** Whole field, before rendering. */
  maxBytes: 20_000,
  /** A single formula. Longer than this is a paste accident. */
  maxLatexLength: 1000,
  maxSegments: 64
} as const;

export type MathBudgetIssue = "bytes" | "latexLength" | "segments" | null;

export function checkMathBudget(value: string): MathBudgetIssue {
  if (value.length > mathLimits.maxBytes) {
    return "bytes";
  }

  const mathSegments = segmentMath(value).filter((segment) => segment.kind !== "text");

  if (mathSegments.length > mathLimits.maxSegments) {
    return "segments";
  }

  return mathSegments.some((segment) => segment.value.length > mathLimits.maxLatexLength)
    ? "latexLength"
    : null;
}

const messages: Readonly<Record<Exclude<MathBudgetIssue, null>, string>> = {
  bytes: `Must be at most ${mathLimits.maxBytes} characters including formatting`,
  latexLength: `A single formula must be at most ${mathLimits.maxLatexLength} characters`,
  segments: `Must contain at most ${mathLimits.maxSegments} formulas`
};

/**
 * Attached with `.superRefine` so the failure says which ceiling was hit.
 *
 * Takes an optional value because the fields it guards include optional ones —
 * a question with no marking guide runs this with `undefined`, and there is
 * nothing to measure.
 */
export function refineMathBudget(value: string | null | undefined, context: z.RefinementCtx): void {
  if (typeof value !== "string") {
    return;
  }

  const issue = checkMathBudget(value);

  if (issue !== null) {
    context.addIssue({ code: "custom", message: messages[issue] });
  }
}

/** A string that may carry maths, bounded by the ceilings above. */
export const mathBudgetSchema = z.string().superRefine(refineMathBudget);
