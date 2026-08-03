import type { Locale } from "./locales";
import { fallbackLocale } from "./locales";
import type { MessageKey } from "./messages/bn";
import { bn } from "./messages/bn";
import { en } from "./messages/en";

export type { MessageKey };

export const dictionaries: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = {
  bn,
  en
};

export type TranslateParams = Readonly<Record<string, string | number>>;

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, params: TranslateParams | undefined): string {
  if (!params) {
    return template;
  }

  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = params[name];

    // An unfilled placeholder stays visible rather than collapsing to an empty
    // string — a missing count is a bug worth seeing, not worth hiding.
    return value === undefined ? match : String(value);
  });
}

export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const template = dictionaries[locale][key] || dictionaries[fallbackLocale][key] || key;

  return interpolate(template, params);
}

export type Translator = (key: MessageKey, params?: TranslateParams) => string;

export function createTranslator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}
