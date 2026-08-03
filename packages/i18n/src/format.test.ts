import { describe, expect, test } from "bun:test";

import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  toLocaleDigits
} from "./format";

describe("formatNumber", () => {
  test("Bangla gets Bangla numerals and lakh/crore grouping", () => {
    // The whole reason this module exists: ১,৮৪,০০০ and not ১৮৪,০০০.
    expect(formatNumber(184000, "bn")).toBe("১,৮৪,০০০");
    expect(formatNumber(1420000, "bn")).toBe("১৪,২০,০০০");
    expect(formatNumber(61400, "bn")).toBe("৬১,৪০০");
  });

  test("English keeps thousands grouping and Latin digits", () => {
    expect(formatNumber(184000, "en")).toBe("184,000");
  });

  test("accepts the numeric strings the database returns", () => {
    expect(formatNumber("5900.00", "bn")).toBe("৫,৯০০");
  });

  test("a value that is not a number reads as zero rather than NaN", () => {
    expect(formatNumber("", "en")).toBe("0");
    expect(formatNumber("not a price", "en")).toBe("0");
  });
});

describe("formatCurrency", () => {
  test("the taka sign sits tight against the number", () => {
    expect(formatCurrency(5900, "bn")).toBe("৳৫,৯০০");
    expect(formatCurrency(5900, "en")).toBe("৳5,900");
  });

  test("paisa show only when there are any", () => {
    expect(formatCurrency("5900.00", "en")).toBe("৳5,900");
    expect(formatCurrency("5900.50", "en")).toBe("৳5,900.50");
  });
});

describe("formatPercent", () => {
  test("takes a percentage, not a fraction", () => {
    expect(formatPercent(78, "bn")).toBe("৭৮%");
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
    expect(formatDate(august, "bn")).toBe("১২ আগস্ট");
    expect(formatDate(august, "en")).toBe("12 August");
  });

  test("the year is opt-in", () => {
    expect(formatDate(august, "en", { withYear: true })).toBe("12 August 2026");
  });

  test("an unparseable date is empty rather than 'Invalid Date'", () => {
    expect(formatDate("sometime next week", "en")).toBe("");
  });
});

describe("toLocaleDigits", () => {
  test("maps digits in place without regrouping them", () => {
    // A phone number must not become ১,৩৪,৬০,৫৬,৪৬৮.
    expect(toLocaleDigits("01346-056468", "bn")).toBe("০১৩৪৬-০৫৬৪৬৮");
    expect(toLocaleDigits("1280 × 720", "bn")).toBe("১২৮০ × ৭২০");
  });

  test("English is left alone", () => {
    expect(toLocaleDigits("01346-056468", "en")).toBe("01346-056468");
  });
});
