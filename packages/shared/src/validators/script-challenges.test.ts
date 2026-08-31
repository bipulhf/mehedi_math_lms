import { describe, expect, test } from "bun:test";

import { raiseScriptChallengeSchema } from "./script-challenges";

describe("script challenge", () => {
  test("a reason that explains itself is accepted", () => {
    const result = raiseScriptChallengeSchema.safeParse({
      reason: "Question 3 was marked wrong but my working matches the guide."
    });

    expect(result.success).toBe(true);
  });

  test("one word is refused — the teacher would not know where to look", () => {
    const result = raiseScriptChallengeSchema.safeParse({ reason: "wrong" });

    expect(result.success).toBe(false);
  });

  test("whitespace does not pad a reason up to the floor", () => {
    const result = raiseScriptChallengeSchema.safeParse({ reason: `wrong${" ".repeat(40)}` });

    expect(result.success).toBe(false);
  });

  test("a reason longer than the ceiling is refused", () => {
    const result = raiseScriptChallengeSchema.safeParse({ reason: "a".repeat(2001) });

    expect(result.success).toBe(false);
  });
});
