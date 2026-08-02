/**
 * The Digital Atelier palette, transcribed from `apps/web/src/styles/app.css`
 * into plain values React Native can use. Tailwind's token names are kept so a
 * screen can be read against its web counterpart without a translation step.
 */
export const colors = {
  background: "#faf8ff",
  error: "#c4353b",
  errorContainer: "#ffdad8",
  onBackground: "#1a1b21",
  onError: "#ffffff",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#141a63",
  onSecondaryContainer: "#131b3f",
  onSurface: "#1a1b21",
  onSurfaceVariant: "#45464f",
  outline: "#76777d",
  outlineVariant: "#c6c6d0",
  primary: "#6061ee",
  primaryContainer: "#e0e0ff",
  secondary: "#5a5c92",
  secondaryContainer: "#e0e0ff",
  success: "#2f6b4f",
  surface: "#faf8ff",
  surfaceContainer: "#eeedf6",
  surfaceContainerHigh: "#e8e7f1",
  surfaceContainerHighest: "#dae2fd",
  surfaceContainerLow: "#f2f3ff",
  surfaceContainerLowest: "#ffffff",
  warning: "#8a5a00"
} as const;

/** Matches the web `--radius-*` scale. */
export const radius = {
  full: 999,
  lg: 16,
  md: 12,
  sm: 8,
  xl: 24,
  xxl: 32
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

export const typography = {
  body: { fontFamily: "Inter", fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: "Inter", fontSize: 12, lineHeight: 16 },
  display: { fontFamily: "Manrope", fontSize: 30, lineHeight: 36 },
  heading: { fontFamily: "Manrope", fontSize: 22, lineHeight: 28 },
  label: { fontFamily: "Manrope", fontSize: 13, lineHeight: 18 },
  title: { fontFamily: "Manrope", fontSize: 17, lineHeight: 24 }
} as const;

export const shadow = {
  card: {
    elevation: 2,
    shadowColor: "#131b2e",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16
  }
} as const;
