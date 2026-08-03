import type { JSX } from "react";

import type { AnalyticsTimeSeriesPoint } from "@/lib/api/analytics";
import { useFormat } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

const MAX_BAR_HEIGHT = 130;

/**
 * The design's monthly bar chart: the peak bar in the accent, every other in
 * `bar-idle`, 130px tall at most.
 *
 * Drawn with divs rather than Recharts because it is eight rectangles and a
 * label — a charting library here would ship a hundred kilobytes to render
 * something CSS already does, and would need its colours mirrored as literals
 * because it writes SVG presentation attributes.
 */
export function RevenueBars({
  points,
  title
}: {
  points: readonly AnalyticsTimeSeriesPoint[];
  title: string;
}): JSX.Element | null {
  const format = useFormat();

  if (points.length === 0) {
    return null;
  }

  const peak = Math.max(...points.map((point) => point.value));

  return (
    <div className="border border-hairline bg-card p-6">
      <p className="label-mono text-xs uppercase text-muted-faint">{title}</p>
      <div className="mt-6 flex items-end gap-3" style={{ height: MAX_BAR_HEIGHT }}>
        {points.map((point) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.period}>
            <div
              className={cn(
                "w-full transition-colors",
                point.value === peak && peak > 0 ? "bg-accent" : "bg-bar-idle"
              )}
              style={{
                height: peak > 0 ? Math.max(2, (point.value / peak) * (MAX_BAR_HEIGHT - 24)) : 2
              }}
              title={format.currency(point.value)}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {points.map((point) => (
          <span
            className="label-mono min-w-0 flex-1 truncate text-center text-[10px] text-muted-faint"
            key={point.period}
          >
            {point.period}
          </span>
        ))}
      </div>
    </div>
  );
}
