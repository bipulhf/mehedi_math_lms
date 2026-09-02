import type { JSX, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { Theme } from "./theme-cookie";
import { isTheme, writeThemeCookie } from "./theme-cookie";

interface ThemeContextValue {
  readonly setTheme: (next: Theme) => void;
  readonly theme: Theme;
  readonly toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Matches `--color-background` in `app.css` — the browser chrome's tint. */
const themeColors: Record<Theme, string> = { dark: "#0b1220", light: "#f7f9fc" };

interface ThemeProviderProps extends PropsWithChildren {
  /**
   * Read from the cookie during SSR. `null` on a first visit, where the
   * operating system's answer is only knowable in the browser — the bootstrap
   * script has already written the attribute by the time this mounts, so the
   * effect below adopts it rather than fighting it.
   */
  readonly initialTheme: Theme | null;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? "light");

  // Adopt whatever is on the document. On a first visit that is the operating
  // system's preference, resolved before paint; on every later visit it is the
  // cookie value already in state and this changes nothing.
  useEffect(() => {
    const applied = document.documentElement.dataset.theme;

    if (isTheme(applied)) {
      setThemeState(applied);
    }
  }, []);

  const setTheme = useCallback((next: Theme): void => {
    writeThemeCookie(next);
    setThemeState(next);
  }, []);

  // `<html data-theme>` is rendered from the same value on the server; this
  // keeps it in step when the toggle changes the theme without a reload, and
  // moves the browser chrome with it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const meta = document.querySelector('meta[name="theme-color"]');

    meta?.setAttribute("content", themeColors[theme]);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      setTheme,
      theme,
      toggleTheme: () => {
        setTheme(theme === "dark" ? "light" : "dark");
      }
    }),
    [setTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }

  return value;
}
