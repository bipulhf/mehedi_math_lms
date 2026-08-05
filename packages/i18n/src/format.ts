import type { Locale } from "./locales";
import { localeTags } from "./locales";

/**
 * Every number the user sees goes through here.
 *
 * Two rules, and they pull in different directions. Grouping follows the
 * locale, so Bangla gets the lakh/crore shape the design uses — 1,84,000, not
 * 184,000. **Digits are always Western**, in both languages: a Bangla page
 * reads ৳5,900 and 12 August, never ৳৫,৯০০ or ১২ আগস্ট.
 *
 * That is a product decision, not an oversight. Prices, marks, phone numbers,
 * transaction ids and exam scores are read, compared and typed back by people
 * who use ASCII digits everywhere else — a keypad, a bank SMS, a calculator —
 * and mixing the two sets makes a mark of 18 out of 20 harder to check, not
 * more Bangla. `Intl` will happily produce native numerals, so every formatter
 * here passes its output through `toWesternDigits`.
 *
 * The value of this module is that it is the single place that knows, and that
 * web and mobile import the same one.
 */

// Constructing an Intl formatter is expensive enough that a list of a hundred
// prices would notice. Keyed by locale plus options.
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;
  const cached = numberFormatters.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(localeTags[locale], options);

  numberFormatters.set(cacheKey, formatter);

  return formatter;
}

function dateFormatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const cacheKey = `${locale}:${JSON.stringify(options)}`;
  const cached = dateFormatters.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(localeTags[locale], options);

  dateFormatters.set(cacheKey, formatter);

  return formatter;
}

const banglaDigits = "০১২৩৪৫৬৭৮৯";

/**
 * Bengali numerals to ASCII, leaving everything else — month names, the taka
 * sign, separators — exactly as the locale formatted it.
 *
 * Also the public path for a string that is not a number and must not be
 * regrouped: a phone number, a transaction id, "1280 × 720", a chapter's "04".
 * It takes no locale, because the answer is the same in both.
 */
export function toWesternDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String(banglaDigits.indexOf(digit)));
}

function toNumber(value: number | string): number {
  const parsed = typeof value === "string" ? Number(value) : value;

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: number | string, locale: Locale): string {
  return toWesternDigits(numberFormatter(locale, { maximumFractionDigits: 0 }).format(toNumber(value)));
}

/**
 * The taka sign sits tight against the number in the design — ৳5,900, no space
 * — which is not what `Intl`'s currency style produces, so it is composed here
 * instead.
 *
 * Paisa are shown only when there are any. Prices are stored as
 * `numeric(10, 2)` and arrive as strings like `"5900.00"`, which should read as
 * ৳5,900 rather than ৳5,900.00.
 */
export function formatCurrency(value: number | string, locale: Locale): string {
  const amount = toNumber(value);
  const hasFraction = !Number.isInteger(amount);
  const formatted = toWesternDigits(
    numberFormatter(locale, {
      maximumFractionDigits: hasFraction ? 2 : 0,
      minimumFractionDigits: hasFraction ? 2 : 0
    }).format(amount)
  );

  return `৳${formatted}`;
}

/**
 * A review average, to one decimal. `formatNumber` would round 4.8 to 5 and
 * quietly flatter every course on the page.
 */
export function formatRating(value: number, locale: Locale): string {
  return toWesternDigits(
    numberFormatter(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    }).format(value)
  );
}

/** Takes a percentage, not a fraction: `formatPercent(78, "bn")` is `78%`. */
export function formatPercent(value: number, locale: Locale): string {
  return `${formatNumber(Math.round(value), locale)}%`;
}

export interface FormatDateOptions {
  /** Adds the year. Off by default — the design writes "12 আগস্ট". */
  readonly withYear?: boolean;
}

export function formatDate(
  value: Date | string | number,
  locale: Locale,
  options: FormatDateOptions = {}
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  // Bangla month names, Western day and year: "12 আগস্ট 2026".
  return toWesternDigits(
    dateFormatter(locale, {
      day: "numeric",
      month: "long",
      ...(options.withYear === true ? { year: "numeric" } : {})
    }).format(date)
  );
}

export function formatDateTime(value: Date | string | number, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toWesternDigits(
    dateFormatter(locale, {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "long"
    }).format(date)
  );
}

export interface Formatters {
  readonly currency: (value: number | string) => string;
  readonly date: (value: Date | string | number, options?: FormatDateOptions) => string;
  readonly dateTime: (value: Date | string | number) => string;
  readonly digits: (value: string) => string;
  readonly number: (value: number | string) => string;
  readonly percent: (value: number) => string;
  readonly rating: (value: number) => string;
}

export function createFormatters(locale: Locale): Formatters {
  return {
    currency: (value) => formatCurrency(value, locale),
    date: (value, options) => formatDate(value, locale, options),
    dateTime: (value) => formatDateTime(value, locale),
    digits: (value) => toWesternDigits(value),
    number: (value) => formatNumber(value, locale),
    percent: (value) => formatPercent(value, locale),
    rating: (value) => formatRating(value, locale)
  };
}
