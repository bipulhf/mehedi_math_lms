/**
 * The parts of the design system that do not change with the theme: the radius
 * scale, the 4pt spacing scale, the font families and the type scale.
 *
 * Colour lives in `palettes.ts` and is reached through `useTheme()` /
 * `makeStyles()` in `theme.tsx`, because it depends on which theme is on.
 * `DESIGN.md` is the authority for all of it; these files only restate it in a
 * form Metro can bundle.
 */

export { darkColors, lightColors, palettes, type ColorScheme, type ThemeColors } from "@/src/theme/palettes";

export const radius = {
  pill: 100,
  sm: 10,
  square: 16,
  xl: 20,
  full: 999
} as const;

/** A 4pt scale; every gap and padding in the app comes from here. */
export const spacing = {
  lg: 16,
  md: 12,
  sm: 8,
  xl: 24,
  xs: 4,
  xxl: 32,
  xxxl: 48
} as const;

/**
 * The exact family names registered by `useFonts` in `app/_layout.tsx`.
 *
 * One family per weight, deliberately: React Native does not synthesise a bold
 * for a custom family on Android, so `fontWeight: "700"` over a family name
 * silently renders regular. Reach for a family here instead of a weight.
 *
 * Bangla display uses Hind Siliguri. Latin numerals, ids and small all-caps
 * labels use Archivo until Geist is bundled for native surfaces.
 */
export const fonts = {
  // DESIGN.md §4: "Body copy stays 400" — Light read noticeably thinner than
  // spec against the ink-first dark background, so `body` and `bodyMedium`
  // now share the one weight the spec actually calls for.
  body: "HindSiliguri_400Regular",
  bodyMedium: "HindSiliguri_400Regular",
  bodySemiBold: "HindSiliguri_500Medium",
  displayBold: "HindSiliguri_500Medium",
  displayExtraBold: "HindSiliguri_600SemiBold",
  displaySemiBold: "HindSiliguri_500Medium",
  monoLabel: "Archivo_500Medium"
} as const;

/**
 * The small-screen type scale from DESIGN.md §4/§8: a 26px weight-500 h1, 20px
 * section titles, 17px body at a generous line height for Bangla, and 15px
 * labels. Bangla runs ~20% longer than English, so nothing here is
 * width-constrained.
 */
export const typography = {
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 31 },
  caption: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  display: { fontFamily: fonts.displaySemiBold, fontSize: 26, lineHeight: 36 },
  heading: { fontFamily: fonts.displaySemiBold, fontSize: 22, lineHeight: 30 },
  label: { fontFamily: fonts.monoLabel, fontSize: 12, letterSpacing: 0.72, lineHeight: 16 },
  title: { fontFamily: fonts.displaySemiBold, fontSize: 20, lineHeight: 27 }
} as const;

/** The one measurement the native shell needs that the scales above do not name. */
export const layout = {
  tabBarHeight: 49
} as const;
