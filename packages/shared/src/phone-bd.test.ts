import { describe, expect, test } from "bun:test";

import { normalizeBdPhoneE164 } from "./phone-bd";

describe("normalizeBdPhoneE164", () => {
  test("keeps a number already in provider shape", () => {
    expect(normalizeBdPhoneE164("8801712345678")).toBe("8801712345678");
  });

  test("expands the local 01 form", () => {
    expect(normalizeBdPhoneE164("01712345678")).toBe("8801712345678");
  });

  test("expands the bare subscriber form", () => {
    expect(normalizeBdPhoneE164("1712345678")).toBe("8801712345678");
  });

  test("strips punctuation and a leading plus", () => {
    expect(normalizeBdPhoneE164("+880 171-234 5678")).toBe("8801712345678");
  });

  test("keeps the first thirteen digits when extra ones are typed", () => {
    // Lenient about a trailing slip, not clever about a leading one: this
    // takes the front of the string, so a doubled country code is not undone.
    expect(normalizeBdPhoneE164("88017123456789")).toBe("8801712345678");
    expect(normalizeBdPhoneE164("8808801712345678")).toBe("8808801712345");
  });

  test("refuses anything it cannot place", () => {
    // Every one of these would otherwise become a code sent to a stranger.
    expect(normalizeBdPhoneE164("")).toBeNull();
    expect(normalizeBdPhoneE164("not a phone")).toBeNull();
    expect(normalizeBdPhoneE164("0171234567")).toBeNull();
    expect(normalizeBdPhoneE164("017123456789")).toBeNull();
    expect(normalizeBdPhoneE164("+1 415 555 0123")).toBeNull();
  });

  test("normalizes the two ways one person writes their own number to one value", () => {
    // The account is keyed on this string. If these disagreed, the same person
    // signing in twice would end up with two accounts.
    expect(normalizeBdPhoneE164("01712345678")).toBe(normalizeBdPhoneE164("+8801712345678"));
  });
});
