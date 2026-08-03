/**
 * Recharts writes its colours out as SVG presentation attributes, and those do
 * not resolve CSS custom properties — `stroke="var(--color-…)"` renders as
 * nothing. So the handful of palette entries the charts need are mirrored here
 * as literals, in one place, instead of being retyped per route.
 *
 * Keep these in sync with `src/styles/app.css`.
 */
export const chartTheme = {
  /** `--color-accent` — the peak bar, and the one series that matters. */
  accent: "#ee5622",
  /** `--color-bar-idle` — every other bar. The design keeps them quiet. */
  bar: "#e4ded5",
  /** `--color-card` — dot and marker fills. */
  dotStroke: "#ffffff",
  /** `--color-hairline` — grid lines. Felt, not seen. */
  grid: "#e8e4de",
  /** `--color-muted-light` — axis labels and tick text. */
  label: "#8a857d",
  /** `--color-bar-track` — the track a bar or progress arc sits in. */
  track: "#f1eee9"
} as const;
