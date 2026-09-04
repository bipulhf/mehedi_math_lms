/**
 * The parts of the design system that do not change: the shape scale, the
 * spacing rhythm, elevation, the two font families and the type scale.
 *
 * Colour lives in `palettes.ts` and is reached through `useTheme()` /
 * `makeStyles()` in `theme.tsx`.
 *
 * The shapes are the design as much as the colour is. Three of them repeat
 * everywhere and are worth naming out loud:
 *
 * - **The squircle.** Icons live in a rounded square (`radius.tile`), never a
 *   circle. Circles are for people — an avatar, a presence dot.
 * - **The curved header.** Every top-level screen opens with a cobalt block
 *   whose bottom corners are `radius.curve`, and the first card of the screen
 *   overlaps it. That overlap is what makes a phone screen read as layered
 *   rather than as a scrolling document.
 * - **The docked bar.** Bottom navigation and sticky actions are attached to
 *   the bottom edge with `radius.curve` on their top corners.
 */

export {
  lightColors,
  palettes,
  tintCycle,
  tintForKey,
  type ColorScheme,
  type ThemeColors,
  type Tint,
  type TintName
} from "@/src/theme/palettes";

export const radius = {
  /** A chip, a segment, a filter — anything whose height is its shape. */
  pill: 100,
  /** A tag, a small well, an inline mark. */
  sm: 10,
  /** An input, a list row, a compact tile. */
  md: 16,
  /** The icon squircle. */
  tile: 18,
  /** The card. Every plate on a screen is this unless it is a hero. */
  square: 24,
  /** A hero plate, a sheet, a bottom-docked bar, a curved header. */
  curve: 32,
  xl: 28,
  xxl: 36,
  full: 999
} as const;

/** An 8pt rhythm with two half-steps; every gap and padding comes from here. */
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
 * Three elevations and nothing between them. Depth is what separates a white
 * plate from cream paper — but three depths is a hierarchy and six is mush.
 * `colors.shadow` is warm, so a lifted card reads as lit rather than smudged.
 */
export const elevation = {
  /** A resting plate. */
  card: { offsetY: 8, opacity: 1, radius: 20 },
  /** Something that floats over content: the nav bar, a sheet, a sticky bar. */
  float: { offsetY: -6, opacity: 1.4, radius: 24 },
  /** A coloured hero, which needs its own colour under it, not brown. */
  hero: { offsetY: 12, opacity: 2.4, radius: 24 }
} as const;

/**
 * Two families, both of which draw Bangla and Latin.
 *
 * **Baloo Da 2** is the display face: rounded, high-contrast in weight, and
 * built for the Bengali script rather than retrofitted to it. Every heading,
 * button, score and number is set in it — the numerals are what give the app
 * its voice on a dashboard.
 *
 * **Anek Bangla** is the text face: narrow, even, and legible at 15px in both
 * scripts, which is what a lecture body and a message thread need.
 *
 * One family per weight, deliberately: React Native does not synthesise a bold
 * for a custom family on Android, so `fontWeight: "700"` over a family name
 * silently renders regular. Reach for a family here instead of a weight.
 */
export const fonts = {
  body: "AnekBangla_400Regular",
  bodyMedium: "AnekBangla_500Medium",
  bodySemiBold: "AnekBangla_600SemiBold",
  /** The loudest thing on a screen: a screen title, a score. */
  display: "BalooDa2_800ExtraBold",
  displayBold: "BalooDa2_700Bold",
  displayExtraBold: "BalooDa2_800ExtraBold",
  displaySemiBold: "BalooDa2_600SemiBold",
  /** Small all-caps labels. Anek is narrow enough to letter-space cleanly. */
  monoLabel: "AnekBangla_600SemiBold",
  /** Numerals that should read as data: a score, a streak, a price. */
  numeric: "BalooDa2_700Bold"
} as const;

/**
 * The type scale. Baloo has a large x-height, so display sizes sit a step
 * smaller than they would in a Latin grotesque and still read louder.
 */
export const typography = {
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 38 },
  heading: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 30 },
  label: { fontFamily: fonts.monoLabel, fontSize: 11, letterSpacing: 0.9, lineHeight: 16 },
  title: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 24 }
} as const;

/**
 * The measurements the native shell needs that the scales above do not name.
 * The nav bar is docked to the bottom edge and draws over content, so a
 * scrolling tab screen pads its own footer with `tabScrollInset`.
 */
export const layout = {
  /** How far a screen's first card rises into the curved header above it. */
  headerOverlap: 28,
  navBarHeight: 68,
  tabScrollInset: 116
} as const;
