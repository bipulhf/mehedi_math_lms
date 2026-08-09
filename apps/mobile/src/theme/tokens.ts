/**
 * The Mehedi's Math Academy palette, transcribed from `apps/web/src/styles/app.css` into plain
 * values React Native can use. `DESIGN.md` is the authority; this file only
 * restates it in a form Metro can bundle.
 */
export const colors = {
  accent: "#00cfff",
  actionForeground: "#0d0d0d",
  background: "#0d0d0d",
  barIdle: "rgba(255, 255, 255, 0.22)",
  barTrack: "rgba(255, 255, 255, 0.1)",
  brandCyan: "#00cfff",
  brandOrange: "#ffa500",
  brandYellow: "#fff200",
  card: "rgba(255, 255, 255, 0.04)",
  chipActive: "rgba(0, 207, 255, 0.14)",
  correct: "#00cfff",
  dotIdle: "rgba(255, 255, 255, 0.24)",
  error: "#ff6257",
  hairline: "rgba(255, 255, 255, 0.14)",
  hairlineFaint: "rgba(255, 255, 255, 0.09)",
  ink: "#ffffff",
  inkMuted: "rgba(255, 255, 255, 0.72)",
  lineStrong: "rgba(255, 255, 255, 0.2)",
  muted: "rgba(255, 255, 255, 0.64)",
  mutedFaint: "rgba(255, 255, 255, 0.4)",
  mutedLight: "rgba(255, 255, 255, 0.52)",
  online: "#00cfff",
  panelWarm: "#171717",
  paper: "#ffffff",
  placeholder: "rgba(255, 255, 255, 0.38)",
  placeholderFill: "#1e1e1e",
  rowHover: "rgba(0, 207, 255, 0.08)"
} as const;

/**
 * Cards are rounded plates and buttons are soft controls. `pill` is for pills
 * and chips, `full` for dots and avatars.
 */
export const radius = {
  pill: 100,
  sm: 8,
  square: 14,
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
  body: "HindSiliguri_300Light",
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

/**
 * No shadows. DESIGN.md §1 — depth comes from hairlines, and a card is a
 * hairline border on white.
 */
export const shadow = {
  card: {}
} as const;
