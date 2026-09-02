import type { Theme } from "@/lib/theme/theme-cookie";
import { useTheme } from "@/lib/theme/theme-context";

/**
 * Charts write their colours out as SVG presentation attributes, and those do
 * not resolve CSS custom properties — `stroke="var(--color-…)"` renders as
 * nothing. So the handful of palette entries the charts need are mirrored here
 * as literals, in one place, instead of being retyped per route.
 *
 * A literal cannot follow `data-theme` on its own, which is why this is a hook
 * rather than a constant: a chart re-renders with the theme like everything
 * else does.
 *
 * Keep these in sync with `src/styles/app.css`.
 */
export interface ChartTheme {
  /** `--color-accent` — the primary learning series. */
  accent: string;
  /** `--color-brand-orange` — decisive comparison series. */
  bar: string;
  /** `--color-card` — dot and marker fills. */
  dotStroke: string;
  /** `--color-hairline` — grid lines. Felt, not seen. */
  grid: string;
  /** `--color-muted` — axis labels and tick text. */
  label: string;
  /** `--color-bar-track` — the track a bar or progress arc sits in. */
  track: string;
}

const themes: Record<Theme, ChartTheme> = {
  dark: {
    accent: "#4d9fff",
    bar: "#f5a723",
    dotStroke: "#172033",
    grid: "#283548",
    label: "#94a3b8",
    track: "#1e293b"
  },
  light: {
    accent: "#0069db",
    bar: "#b3730a",
    dotStroke: "#ffffff",
    grid: "#e2e8f0",
    label: "#64748b",
    track: "#e2e8f0"
  }
};

export function chartThemeFor(theme: Theme): ChartTheme {
  return themes[theme];
}

export function useChartTheme(): ChartTheme {
  return themes[useTheme().theme];
}
