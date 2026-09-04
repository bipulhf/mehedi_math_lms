import type { JSX, ReactNode } from "react";
import { createContext, useContext } from "react";
import { StyleSheet, type ViewStyle } from "react-native";

import { elevation } from "@/src/theme/tokens";
import { lightColors, palettes, type ColorScheme, type ThemeColors } from "@/src/theme/palettes";

/**
 * The app is light only.
 *
 * It used to follow the phone and carry two palettes that had to agree on
 * every token. They no longer do: the colour here — a violet primary over a
 * cool grey page, with pastel tints doing the work of labels — is chosen for
 * one background, and a dark transcription of it would be a different design
 * wearing the same names. The provider stays because `makeStyles` caches per
 * scheme and every screen reaches colour through it.
 */

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: false;
  scheme: ColorScheme;
}

const VALUE: ThemeContextValue = { colors: lightColors, isDark: false, scheme: "light" };

const ThemeContext = createContext<ThemeContextValue>(VALUE);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  return <ThemeContext.Provider value={VALUE}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** The palette on its own, which is what most components actually want. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}

/**
 * Depth, as a style. Elevation is not decoration here: a white plate on a
 * near-white page has nothing else separating it from the page.
 *
 * `tone` colours the shadow itself — a violet hero casts violet, not grey,
 * which is the difference between a card that glows and one that looks dirty.
 */
export function shadow(
  colors: ThemeColors,
  level: keyof typeof elevation = "card",
  tone?: string
): ViewStyle {
  const preset = elevation[level];

  return {
    elevation: level === "card" ? 3 : level === "float" ? 12 : 8,
    shadowColor: tone ?? colors.shadow,
    shadowOffset: { height: preset.offsetY, width: 0 },
    shadowOpacity: colors.shadowOpacity * preset.opacity,
    shadowRadius: preset.radius
  };
}

/**
 * A stylesheet that knows the palette.
 *
 * `StyleSheet.create` at module scope runs once, before a provider exists.
 * This builds one sheet per scheme, lazily, and hands back the right one — so
 * the cost is one `StyleSheet.create` call per file for the whole life of the
 * process rather than one per render.
 *
 * ```ts
 * const useStyles = makeStyles((colors) => ({
 *   card: { backgroundColor: colors.card }
 * }));
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
