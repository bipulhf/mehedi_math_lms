/**
 * Mehedi's Math Academy ships in two languages. Bangla is not a translation of the English —
 * it is the language the product was designed and written in, which is why it
 * is the default and why `en` is the fallback rather than the source.
 */
export const locales = ["bn", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "bn";

/**
 * The locale the catalogue falls back to when a key is missing. Deliberately
 * not `defaultLocale`: a missing Bangla string should surface the English one,
 * and a missing English string should surface the key.
 */
export const fallbackLocale: Locale = "en";

/**
 * Where the reader's choice is kept. It lives here rather than in the web app
 * because it is read outside the browser too — the password-reset mail picks
 * its language from this cookie on the request that asked for it.
 */
export const localeCookieName = "mma_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

/**
 * What goes in `<html lang>` and into `Intl` constructors. `bn-BD` rather than
 * bare `bn` because the Bangladeshi form is what gives us Bangla numerals and
 * the lakh/crore digit grouping the design uses throughout.
 */
export const localeTags: Readonly<Record<Locale, string>> = {
  bn: "bn-BD",
  // en-GB rather than en-US: identical digit grouping and separators, but it
  // writes dates as "12 August", which matches the Bangla "12 আগস্ট" instead of
  // inverting it to "August 12".
  en: "en-GB"
};

/** The label a locale is offered under, always written in that locale. */
export const localeNames: Readonly<Record<Locale, string>> = {
  bn: "বাংলা",
  en: "English"
};
