import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JSX, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";

import { palettes, type ColorScheme, type ThemeColors } from "@/src/theme/palettes";

/**
 * What the student chose. `system` is the default and the honest one: a phone
 * already knows whether it is night, and an app that ignores that is an app
 * that glares at somebody in bed.
 */
export type ThemePreference = ColorScheme | "system";

const STORAGE_KEY = "mma.theme-preference";

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  scheme: ColorScheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  // Read in an effect, like the locale: there is no SSR here, so the first
  // frame uses the system scheme and settles onto the stored choice a tick
  // later. That is one frame, and only for somebody who overrode the default.
  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);

        if (isThemePreference(stored)) {
          setPreferenceState(stored);
        }
      } catch {
        // A storage that will not answer leaves the system default in place,
        // which is the right answer anyway.
      }
    })();
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;

    return {
      colors: palettes[scheme],
      isDark: scheme === "dark",
      preference,
      scheme,
      setPreference: (next: ThemePreference) => {
        setPreferenceState(next);
        void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
          // The choice still holds for this launch.
        });
      }
    };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}

/** The palette on its own, which is what most components actually want. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}

/**
 * A stylesheet that knows the palette.
 *
 * `StyleSheet.create` runs once at module load, which is exactly wrong for a
 * theme that can change while the app is open. This builds one sheet per
 * scheme, lazily, and hands back the right one — so the cost is two
 * `StyleSheet.create` calls per file for the whole life of the process rather
 * than one per render.
 *
 * ```ts
 * const useStyles = makeStyles((colors) => ({
 *   card: { backgroundColor: colors.card }
 * }));
 *
 * function Card(): JSX.Element {
 *   const styles = useStyles();
 *   …
 * }
 * ```
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T
): () => T {
  const cache = new Map<ColorScheme, T>();

  return function useStyles(): T {
    const { scheme } = useTheme();
    const cached = cache.get(scheme);

    if (cached) {
      return cached;
    }

    const created = StyleSheet.create(factory(palettes[scheme]));

    cache.set(scheme, created);

    return created;
  };
}

export type { ThemeColors };
