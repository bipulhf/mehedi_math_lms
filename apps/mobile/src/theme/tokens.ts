/**
 * The Mehedi's Math Academy palette, transcribed from the dark theme in
 * `apps/web/src/styles/app.css` into plain values React Native can use.
 * `DESIGN.md` is the authority; this file only restates it in a form Metro can
 * bundle.
 *
 * The app ships the dark theme only — there is no toggle here, and a light
 * value would have nothing to switch it. Keeping the names identical to the
 * web tokens is what makes a screen ported from web land on the right colour
 * without a lookup.
 */
export const colors = {
  /** Interactive blue. Lighter than the logo's #007bff, which is 4.1:1 on this
   * navy — readable as a rule, not as the word a student is meant to tap. */
  accent: "#4d9fff",
  accentStrong: "#7ab6ff",
  /** Dark text on a bright constant fill: a gold badge, a white chip. */
  actionForeground: "#172033",
  background: "#0b1220",
  barIdle: "#334155",
  barTrack: "#1e293b",
  brandBlue: "#007bff",
  brandGold: "#f5c066",
  brandOrange: "#f5a723",
  brandOrangeStrong: "#ffbf4d",
  card: "#172033",
  chipActive: "rgba(77, 159, 255, 0.16)",
  correct: "#4ade80",
  dotIdle: "#3a4a63",
  error: "#f87171",
  hairline: "#283548",
  hairlineFaint: "#1f2b3d",
  ink: "#f8fafc",
  inkMuted: "#cbd5e1",
  /** A field's own fill, one step below the card it sits on. */
  input: "#111827",
  lineStrong: "#3a4a63",
  muted: "#94a3b8",
  mutedFaint: "#8496ae",
  mutedLight: "#8a9ab0",
  /** What text on top of `accent` is — the page's navy, not white, which is
   * 2.6:1 on this blue. */
  onAccent: "#0b1220",
  onError: "#0b1220",
  online: "#4ade80",
  panelWarm: "#111827",
  /** Literal white, for anything sitting on a photograph or a video. */
  paper: "#ffffff",
  placeholder: "#8496ae",
  placeholderFill: "#1e293b",
  /** Anything that floats over the page needs a fill you cannot see through. */
  popover: "#1e293b",
  rowHover: "rgba(77, 159, 255, 0.1)",
  success: "#4ade80",
  warning: "#fbbf24"
} as const;

/**
 * Cards are rounded plates and buttons are soft controls. `pill` is for pills
 * and chips, `full` for dots and avatars.
 *
 * `square` (16) is the default card radius — slightly larger than DESIGN.md's
 * 14 to read as a native iOS grouped card. `xl` is for hero / cover plates
 * that deserve extra presence.
 */
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
 * Native surface tokens — not a second theme, just the pieces a native shell
 * needs that the web theme doesn't name: translucent bar fills, the grouped
 * list background, and the subtle elevation a dark card needs to lift off
 * navy without a shadow (DESIGN.md §2 forbids shadows).
 */
export const native = {
  /** Translucent navigation / tab bar fill — card at 92% over background. */
  barTranslucent: "rgba(23, 32, 51, 0.92)",
  groupedBackground: "#0b1220",
  groupedCard: "#172033",
  /** The 0.5pt hairline iOS draws between grouped rows. */
  separator: "rgba(40, 53, 72, 0.8)",
  tabBarHeight: 49
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
