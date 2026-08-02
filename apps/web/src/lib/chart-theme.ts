/**
 * Recharts writes its colours out as SVG presentation attributes, and those do
 * not resolve CSS custom properties — `stroke="var(--color-…)"` renders as
 * nothing. So the handful of palette entries the charts need are mirrored here
 * as literals, in one place, instead of being retyped per route.
 *
 * Keep these in sync with `src/styles/app.css`.
 */
export const chartTheme = {
  /** `--color-secondary-container` — the series colour. */
  accent: "#6063ee",
  /** `--color-surface-container-lowest` — dot and marker fills. */
  dotStroke: "#ffffff",
  /** `--color-outline-variant` — grid lines, kept faint by the No-Line Rule. */
  grid: "#c6c6cd"
} as const;
