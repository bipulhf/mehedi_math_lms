import type { Formatters, Locale, Translator } from "@mma/i18n";
import { createFormatters, createTranslator, defaultLocale, isLocale } from "@mma/i18n";
import * as SecureStore from "expo-secure-store";
import type { JSX, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * The same catalogue and the same formatters as the web app, so a price reads
 * ৳5,900 in both and neither has its own idea of how to group a number.
 *
 * There is no SSR here, so unlike the web there is no cookie and no first-paint
 * problem: the app reads the stored locale in an effect and re-renders. The
 * first frame uses the default, which is the language most users want anyway.
 */
const LOCALE_KEY = "mma.locale";

interface LocaleContextValue {
  readonly format: Formatters;
  readonly locale: Locale;
  readonly setLocale: (next: Locale) => void;
  readonly t: Translator;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const stored = await SecureStore.getItemAsync(LOCALE_KEY);

      if (isActive && isLocale(stored)) {
        setLocaleState(stored);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const setLocale = useCallback((next: Locale): void => {
    setLocaleState(next);
    void SecureStore.setItemAsync(LOCALE_KEY, next);
  }, []);

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

export function useT(): Translator {
  return useLocaleContext().t;
}

export function useFormat(): Formatters {
  return useLocaleContext().format;
}
