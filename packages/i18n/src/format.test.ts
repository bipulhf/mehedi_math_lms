import { describe, expect, test } from "bun:test";

import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRating,
  toWesternDigits
} from "./format";

/**
 * Two rules pulling in different directions, and both are asserted here for
 * Bangla: grouping follows the locale, digits never do.
 */

describe("formatNumber", () => {
  test("Bangla keeps lakh/crore grouping, with Western digits", () => {
    // The grouping is the whole reason this module exists: 1,84,000 and not
    // 184,000. The digits stay ASCII — a price is read off a keypad.
    expect(formatNumber(184000, "bn")).toBe("1,84,000");
    expect(formatNumber(1420000, "bn")).toBe("14,20,000");
    expect(formatNumber(61400, "bn")).toBe("61,400");
  });

  test("English keeps thousands grouping", () => {
    expect(formatNumber(184000, "en")).toBe("184,000");
  });

  test("accepts the numeric strings the database returns", () => {
    expect(formatNumber("5900.00", "bn")).toBe("5,900");
  });

  test("a value that is not a number reads as zero rather than NaN", () => {
    expect(formatNumber("", "en")).toBe("0");
    expect(formatNumber("not a price", "en")).toBe("0");
  });
});

describe("formatCurrency", () => {
  test("the taka sign sits tight against the number", () => {
    expect(formatCurrency(5900, "bn")).toBe("৳5,900");
    expect(formatCurrency(5900, "en")).toBe("৳5,900");
  });

  test("paisa show only when there are any", () => {
    expect(formatCurrency("5900.00", "en")).toBe("৳5,900");
    expect(formatCurrency("5900.50", "en")).toBe("৳5,900.50");
    expect(formatCurrency("5900.50", "bn")).toBe("৳5,900.50");
  });
});

describe("formatRating", () => {
  test("keeps one decimal, which formatNumber would round away", () => {
    // 4.8 rounding to 5 would flatter every course on the page.
    expect(formatRating(4.8, "en")).toBe("4.8");
    expect(formatRating(4.8, "bn")).toBe("4.8");
  });

  test("a whole rating still shows its decimal, so a column stays aligned", () => {
    expect(formatRating(5, "en")).toBe("5.0");
  });
});

describe("formatPercent", () => {
  test("takes a percentage, not a fraction", () => {
    expect(formatPercent(78, "bn")).toBe("78%");
    expect(formatPercent(78, "en")).toBe("78%");
  });

  test("rounds rather than showing a completion rate to four places", () => {
    expect(formatPercent(78.4, "en")).toBe("78%");
    expect(formatPercent(78.6, "en")).toBe("79%");
  });
});

describe("formatDate", () => {
  const august = new Date("2026-08-12T00:00:00.000Z");

  test("writes the day before the month in both locales", () => {
    // The month name is translated; the day is not a word, so it is not.
    expect(formatDate(august, "bn")).toBe("12 আগস্ট");
    expect(formatDate(august, "en")).toBe("12 August");
  });

  test("the year is opt-in, and is a number in both languages", () => {
    expect(formatDate(august, "en", { withYear: true })).toBe("12 August 2026");
    // bn-BD puts a comma before the year; that is the locale's business.
    expect(formatDate(august, "bn", { withYear: true })).toBe("12 আগস্ট, 2026");
  });

  test("an unparseable date is empty rather than 'Invalid Date'", () => {
    expect(formatDate("sometime next week", "en")).toBe("");
  });
});

describe("toWesternDigits", () => {
  test("leaves a phone number ungrouped", () => {
    // It must not become 1,34,60,56,468.
    expect(toWesternDigits("01346-056468")).toBe("01346-056468");
    expect(toWesternDigits("1280 × 720")).toBe("1280 × 720");
  });

  test("normalises anything that arrives already written in Bengali digits", () => {
    expect(toWesternDigits("০১৩৪৬-০৫৬৪৬৮")).toBe("01346-056468");
  });
});
