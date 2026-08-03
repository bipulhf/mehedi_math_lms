import type { Locale } from "./locales";
import { localeTags } from "./locales";

/**
 * Every number the user sees goes through here, so that Bangla gets Bangla
 * numerals and the lakh/crore grouping the design uses (১,৮৪,০০০, not
 * ১৮৪,০০০) without any screen having to think about it.
 *
 * `Intl` already knows both. The value of this module is that it is the single
 * place that knows, and that web and mobile import the same one.
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

function toNumber(value: number | string): number {
  const parsed = typeof value === "string" ? Number(value) : value;

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: number | string, locale: Locale): string {
  return numberFormatter(locale, { maximumFractionDigits: 0 }).format(toNumber(value));
}

/**
 * The taka sign sits tight against the number in the design — ৳৫,৯০০, no space
 * — which is not what `Intl`'s currency style produces, so it is composed here
 * instead.
 *
 * Paisa are shown only when there are any. Prices are stored as
 * `numeric(10, 2)` and arrive as strings like `"5900.00"`, which should read as
 * ৳৫,৯০০ rather than ৳৫,৯০০.০০.
 */
export function formatCurrency(value: number | string, locale: Locale): string {
  const amount = toNumber(value);
  const hasFraction = !Number.isInteger(amount);
  const formatted = numberFormatter(locale, {
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: hasFraction ? 2 : 0
  }).format(amount);

  return `৳${formatted}`;
}

/** Takes a percentage, not a fraction: `formatPercent(78, "bn")` is `৭৮%`. */
export function formatPercent(value: number, locale: Locale): string {
  return `${formatNumber(Math.round(value), locale)}%`;
}

export interface FormatDateOptions {
  /** Adds the year. Off by default — the design writes "১২ আগস্ট". */
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

  return dateFormatter(locale, {
    day: "numeric",
    month: "long",
    ...(options.withYear === true ? { year: "numeric" } : {})
  }).format(date);
}

export function formatDateTime(value: Date | string | number, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return dateFormatter(locale, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long"
  }).format(date);
}

const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/**
 * Maps the digits inside an already-formatted string, leaving everything else
 * alone. For values that are not numbers and must not be regrouped — phone
 * numbers, transaction ids, "১২৮০ × ৭২০ পিক্সেল".
 *
 * Grouped counts should use `formatNumber` instead; this one would happily
 * turn `184000` into `১৮৪০০০`.
 */
export function toLocaleDigits(value: string, locale: Locale): string {
  if (locale !== "bn") {
    return value;
  }

  return value.replace(/[0-9]/g, (digit) => banglaDigits[Number(digit)] ?? digit);
}

export interface Formatters {
  readonly currency: (value: number | string) => string;
  readonly date: (value: Date | string | number, options?: FormatDateOptions) => string;
  readonly dateTime: (value: Date | string | number) => string;
  readonly digits: (value: string) => string;
  readonly number: (value: number | string) => string;
  readonly percent: (value: number) => string;
}

export function createFormatters(locale: Locale): Formatters {
  return {
    currency: (value) => formatCurrency(value, locale),
    date: (value, options) => formatDate(value, locale, options),
    dateTime: (value) => formatDateTime(value, locale),
    digits: (value) => toLocaleDigits(value, locale),
    number: (value) => formatNumber(value, locale),
    percent: (value) => formatPercent(value, locale)
  };
}
