/**
 * Recharts writes its colours out as SVG presentation attributes, and those do
 * not resolve CSS custom properties — `stroke="var(--color-…)"` renders as
 * nothing. So the handful of palette entries the charts need are mirrored here
 * as literals, in one place, instead of being retyped per route.
 *
   * Keep these in sync with `src/styles/app.css`.
 */
export const chartTheme = {
  /** `--color-accent` — the primary learning series. */
  accent: "#00cfff",
  /** `--color-brand-orange` — decisive comparison series. */
  bar: "#ffa500",
  /** `--color-card` — dot and marker fills. */
  dotStroke: "#ffffff",
  /** `--color-hairline` — grid lines. Felt, not seen. */
  grid: "rgba(255,255,255,0.14)",
  /** `--color-muted-light` — axis labels and tick text. */
  label: "rgba(255,255,255,0.52)",
  /** `--color-bar-track` — the track a bar or progress arc sits in. */
  track: "rgba(255,255,255,0.1)"
} as const;
