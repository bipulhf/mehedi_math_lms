import type { JSX, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Formatters, Locale, Translator } from "@mma/i18n";
import { createFormatters, createTranslator, localeTags } from "@mma/i18n";

import { writeLocaleCookie } from "./locale-cookie";

interface LocaleContextValue {
  readonly format: Formatters;
  readonly locale: Locale;
  readonly setLocale: (next: Locale) => void;
  readonly t: Translator;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps extends PropsWithChildren {
  /** Read from the cookie during SSR, so the first render is already correct. */
  readonly initialLocale: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale): void => {
    writeLocaleCookie(next);
    setLocaleState(next);
  }, []);

  // `<html lang>` is rendered from the same value on the server; this keeps it
  // in step when the switcher changes the locale without a reload.
  useEffect(() => {
    document.documentElement.lang = localeTags[locale];
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      format: createFormatters(locale),
      locale,
      setLocale,
      t: createTranslator(locale)
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error("useLocale must be used inside a LocaleProvider");
  }

  return value;
}

export function useLocale(): LocaleContextValue {
  return useLocaleContext();
}

/** The common case: `const t = useT()` then `t("nav.courses")`. */
export function useT(): Translator {
  return useLocaleContext().t;
}

/** Locale-aware number, currency, percent and date formatting. */
export function useFormat(): Formatters {
  return useLocaleContext().format;
}
