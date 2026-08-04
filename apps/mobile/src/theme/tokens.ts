/**
 * The Genex palette, transcribed from `apps/web/src/styles/app.css` into plain
 * values React Native can use. `DESIGN.md` is the authority; this file only
 * restates it in a form Metro can bundle.
 */
export const colors = {
  accent: "#ee5622",
  barIdle: "#e4ded5",
  barTrack: "#f1eee9",
  card: "#ffffff",
  chipActive: "#efebe4",
  /** MCQ correctness on exam results screens, and nothing else — see app.css. */
  correct: "#1f6f5c",
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
  online: "#22c55e",
  panelWarm: "#f7f5f1",
  paper: "#fcfbf9",
  placeholder: "#b4aea6",
  placeholderFill: "#f1eee9",
  rowHover: "#fbf9f6"
} as const;

/**
 * Cards are square and buttons are 4px. `pill` is for pills and chips, `full`
 * for dots and avatars — the only round things in the design.
 */
export const radius = {
  pill: 100,
  sm: 4,
  square: 0,
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
