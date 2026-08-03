/**
 * The Genex palette, transcribed from `apps/web/src/styles/app.css` into plain
 * values React Native can use. `DESIGN.md` is the authority; this file only
 * restates it in a form Metro can bundle.
 *
 * The Material token names are kept as aliases at the bottom so screens that
 * have not been rebuilt still resolve. They go when those screens do.
 */
export const colors = {
  accent: "#ee5622",
  barIdle: "#e4ded5",
  barTrack: "#f1eee9",
  card: "#ffffff",
  chipActive: "#efebe4",
  dotIdle: "#ddd8d1",
  error: "#ba1a1a",
  hairline: "#e8e4de",
  hairlineFaint: "#f0ede7",
  ink: "#23211e",
  inkMuted: "#4a453f",
  lineStrong: "#c9c3bb",
  muted: "#6b6763",
  mutedFaint: "#a8a29a",
  mutedLight: "#8a857d",
  panelWarm: "#f7f5f1",
  paper: "#fcfbf9",
  placeholder: "#b4aea6",
  placeholderFill: "#f1eee9",
  rowHover: "#fbf9f6",

  // Compatibility aliases for screens not yet rebuilt. Remove with them.
  background: "#fcfbf9",
  errorContainer: "#ffdad6",
  onBackground: "#23211e",
  onError: "#ffffff",
  onPrimary: "#fcfbf9",
  onPrimaryContainer: "#23211e",
  onSecondaryContainer: "#fcfbf9",
  onSurface: "#23211e",
  onSurfaceVariant: "#6b6763",
  outline: "#c9c3bb",
  outlineVariant: "#e8e4de",
  primary: "#23211e",
  primaryContainer: "#efebe4",
  secondary: "#ee5622",
  secondaryContainer: "#ee5622",
  success: "#6b6763",
  surface: "#fcfbf9",
  surfaceContainer: "#f7f5f1",
  surfaceContainerHigh: "#efebe4",
  surfaceContainerHighest: "#efebe4",
  surfaceContainerLow: "#f7f5f1",
  surfaceContainerLowest: "#ffffff",
  warning: "#ee5622"
} as const;

/**
 * Cards are square and buttons are 4px. `full` survives for dots, avatars and
 * pills — the only round things in the design.
 */
export const radius = {
  full: 999,
  lg: 4,
  md: 4,
  pill: 100,
  sm: 4,
  square: 0,
  xl: 4,
  xxl: 4
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
 * Everything set in words is Hind Siliguri — the design uses one family for
 * that. Archivo is only for Latin numerals, ids and small all-caps labels.
 */
export const fonts = {
  body: "HindSiliguri_300Light",
  bodyMedium: "HindSiliguri_400Regular",
  bodySemiBold: "HindSiliguri_500Medium",
  displayBold: "HindSiliguri_500Medium",
  displayExtraBold: "HindSiliguri_600SemiBold",
  displaySemiBold: "HindSiliguri_500Medium",
  monoLabel: "Archivo_500Medium"
} as const;

export const typography = {
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  display: { fontFamily: fonts.displayExtraBold, fontSize: 30, lineHeight: 38 },
  heading: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 30 },
  label: { fontFamily: fonts.monoLabel, fontSize: 12, letterSpacing: 0.6, lineHeight: 16 },
  title: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 24 }
} as const;

/**
 * No shadows. DESIGN.md §1 — depth comes from hairlines, and a card is a
 * hairline border on white. Kept as an exported empty style so the screens
 * that spread it keep compiling until they are rebuilt.
 */
export const shadow = {
  card: {}
} as const;
