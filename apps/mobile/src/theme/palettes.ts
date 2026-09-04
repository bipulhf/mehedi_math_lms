/**
 * The app's one palette: **cream and cobalt**.
 *
 * The page is a warm off-white rather than a cool grey, which is the single
 * decision the rest of the design hangs off — paper, not glass. On it sit white
 * plates, one saturated cobalt that every action is drawn in, and a gold that
 * marks the thing worth noticing. The five other families are supporting
 * colour: a subject, a status, a category, never decoration.
 *
 * Cobalt is the brand blue taken to full strength (`#007bff` is the logo's, and
 * it is too pale to carry a button on cream), and the gold is the brand's own.
 *
 * The app is light only. A dark transcription of this would be a different
 * design wearing the same names.
 */

/** A supporting family: a wash to fill with, ink that reads on it, a solid. */
export interface Tint {
  /** The pale fill — a plate, an icon well, a chip. */
  bg: string;
  /** The readable ink on `bg`, and the colour of the icon inside it. */
  fg: string;
  /** The saturated version, for a filled bar, a dot, a mark. */
  solid: string;
}

/** Every colour a screen may ask for. */
export interface ThemeColors {
  accent: string;
  /** The two stops every hero block and primary fill is drawn with. */
  accentGradient: readonly [string, string];
  accentSoft: string;
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
  errorSoft: string;
  /** The warm rule between grouped rows. There are very few of these. */
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
  /** The second surface: a well inside a card, a trough, a quiet row. */
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
  successSoft: string;
  /** The six families. A seventh is a colour nobody can name. */
  tint: {
    brand: Tint;
    coral: Tint;
    gold: Tint;
    lilac: Tint;
    mint: Tint;
    sky: Tint;
  };
  warning: string;
  warningSoft: string;
}

export const lightColors: ThemeColors = {
  /** Cobalt. Everything a student taps to move forward is this. */
  accent: "#2B4FF6",
  accentGradient: ["#3A63FF", "#1B34C7"],
  accentSoft: "#E7ECFF",
  accentStrong: "#1B34C7",
  actionForeground: "#ffffff",
  /** Cream. The whole design starts here. */
  background: "#FBF7F1",
  barIdle: "#D9D2C6",
  barTrack: "#EDE6DA",
  barTranslucent: "#ffffff",
  brandBlue: "#007bff",
  brandGold: "#F5A524",
  brandOrange: "#FF6B4A",
  brandOrangeStrong: "#E04B2A",
  card: "#ffffff",
  chipActive: "#E7ECFF",
  correct: "#0E9F6E",
  dotIdle: "#CFC7BA",
  error: "#E5484D",
  errorSoft: "#FDECEC",
  hairline: "#EBE3D7",
  hairlineFaint: "#F2ECE2",
  /** Warm near-black. Pure black on cream reads as a hole. */
  ink: "#161A23",
  inkMuted: "#39404F",
  input: "#F6F2EB",
  lineStrong: "#D9D2C6",
  muted: "#6A7285",
  mutedFaint: "#9AA0AE",
  mutedLight: "#7C8394",
  onAccent: "#ffffff",
  onError: "#ffffff",
  online: "#0E9F6E",
  panelWarm: "#F6F2EB",
  paper: "#ffffff",
  placeholder: "#A7AAB6",
  placeholderFill: "#EFE9DF",
  popover: "#ffffff",
  rowHover: "#F3F1FF",
  separator: "#F2ECE2",
  /** Warm shadow, so a white plate on cream looks lit rather than dirty. */
  shadow: "#4A3B26",
  shadowOpacity: 0.1,
  success: "#0E9F6E",
  successSoft: "#E3F7EF",
  tint: {
    brand: { bg: "#E7ECFF", fg: "#1B34C7", solid: "#2B4FF6" },
    coral: { bg: "#FFEBE6", fg: "#C13A1E", solid: "#FF6B4A" },
    gold: { bg: "#FFF3DC", fg: "#96610A", solid: "#F5A524" },
    lilac: { bg: "#F1EBFF", fg: "#5B34C4", solid: "#8B5CF6" },
    mint: { bg: "#E3F7EF", fg: "#08674A", solid: "#12B886" },
    sky: { bg: "#E2F3FE", fg: "#0B6390", solid: "#2BA7E8" }
  },
  warning: "#B45309",
  warningSoft: "#FFF3DC"
};

/** The families in a fixed order, for anything that colours a list by position. */
export const tintCycle = ["brand", "gold", "mint", "lilac", "coral", "sky"] as const;

export type TintName = (typeof tintCycle)[number];

/** A stable family for a string id — the same course keeps the same colour. */
export function tintForKey(key: string): TintName {
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100_000;
  }

  return tintCycle[hash % tintCycle.length] ?? "brand";
}

/**
 * One scheme. The type stays so `makeStyles` keeps its per-scheme cache and a
 * second palette could return without touching every call site.
 */
export type ColorScheme = "light";

export const palettes: Record<ColorScheme, ThemeColors> = {
  light: lightColors
};
