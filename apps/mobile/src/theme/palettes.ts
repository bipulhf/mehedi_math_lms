/**
 * The two palettes, transcribed value for value from the light and dark blocks
 * of `apps/web/src/styles/app.css`. `DESIGN.md` is the authority; this file
 * only restates it in a form Metro can bundle.
 *
 * Keeping the *names* identical across both palettes is what lets a component
 * be written once: it asks for `colors.card` and gets white on light, navy on
 * dark. Keeping them identical to the web tokens is what lets a screen ported
 * from web land on the right colour without a lookup.
 */

/** Every colour a screen may ask for. Both palettes fill all of it. */
export interface ThemeColors {
  accent: string;
  accentStrong: string;
  actionForeground: string;
  background: string;
  barIdle: string;
  barTrack: string;
  barTranslucent: string;
  brandBlue: string;
  brandGold: string;
  brandOrange: string;
  brandOrangeStrong: string;
  card: string;
  chipActive: string;
  correct: string;
  dotIdle: string;
  error: string;
  hairline: string;
  hairlineFaint: string;
  ink: string;
  inkMuted: string;
  input: string;
  lineStrong: string;
  muted: string;
  mutedFaint: string;
  mutedLight: string;
  onAccent: string;
  onError: string;
  online: string;
  panelWarm: string;
  paper: string;
  placeholder: string;
  placeholderFill: string;
  popover: string;
  rowHover: string;
  separator: string;
  shadow: string;
  shadowOpacity: number;
  success: string;
  warning: string;
}

export const darkColors: ThemeColors = {
  /** Interactive blue. Lighter than the logo's #007bff, which is 4.1:1 on this
   * navy — readable as a rule, not as the word a student is meant to tap. */
  accent: "#4d9fff",
  accentStrong: "#7ab6ff",
  /** Dark text on a bright constant fill: a gold badge, a white chip. */
  actionForeground: "#172033",
  background: "#0b1220",
  barIdle: "#334155",
  /** Translucent navigation / tab bar fill — card over background. */
  barTranslucent: "rgba(23, 32, 51, 0.92)",
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
  /** The 0.5pt hairline drawn between grouped rows. */
  separator: "rgba(40, 53, 72, 0.8)",
  /** What lifts a card off the page. Elevation on light, nothing on dark:
   * DESIGN.md §2 forbids shadows on the dark theme, where contrast does the
   * work a shadow would. */
  shadow: "transparent",
  shadowOpacity: 0,
  success: "#4ade80",
  warning: "#fbbf24"
};

export const lightColors: ThemeColors = {
  accent: "#0069db",
  accentStrong: "#0056b8",
  actionForeground: "#172033",
  background: "#f7f9fc",
  barIdle: "#cbd5e1",
  barTranslucent: "rgba(255, 255, 255, 0.94)",
  barTrack: "#e2e8f0",
  brandBlue: "#007bff",
  brandGold: "#9a6300",
  brandOrange: "#f5a723",
  brandOrangeStrong: "#dc9109",
  card: "#ffffff",
  chipActive: "rgba(0, 123, 255, 0.11)",
  correct: "#15803d",
  dotIdle: "#cbd5e1",
  error: "#dc2626",
  hairline: "#e2e8f0",
  hairlineFaint: "#eaeff5",
  ink: "#172033",
  inkMuted: "#334155",
  input: "#ffffff",
  lineStrong: "#cbd5e1",
  muted: "#5b6779",
  mutedFaint: "#667085",
  mutedLight: "#616d80",
  onAccent: "#ffffff",
  onError: "#ffffff",
  online: "#15803d",
  panelWarm: "#f1f5f9",
  paper: "#ffffff",
  placeholder: "#616d80",
  placeholderFill: "#e2e8f0",
  popover: "#ffffff",
  rowHover: "rgba(0, 123, 255, 0.07)",
  separator: "rgba(226, 232, 240, 0.9)",
  // A white card on a near-white page needs the shadow the dark theme does
  // not: there is no contrast left to separate them.
  shadow: "#0f172a",
  shadowOpacity: 0.07,
  success: "#15803d",
  warning: "#b45309"
};

export type ColorScheme = "dark" | "light";

export const palettes: Record<ColorScheme, ThemeColors> = {
  dark: darkColors,
  light: lightColors
};
