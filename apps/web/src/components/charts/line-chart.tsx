import { Chart } from "@tanstack/charts/react/tooltip";
import { defineChart, dot, lineY } from "@tanstack/charts";
import type { ChartTooltipBodyRenderContext } from "@tanstack/charts/react/tooltip";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { tooltip } from "@tanstack/charts/tooltip";
import type { JSX } from "react";

import { chartTheme } from "@/lib/chart-theme";

export interface ChartSeriesPoint {
  label: string;
  value: number;
}

export interface SeriesLineChartProps {
  ariaLabel: string;
  data: readonly ChartSeriesPoint[];
  height: number;
  renderTooltip?: ((point: ChartSeriesPoint) => string) | undefined;
}

/**
 * A single-series line — enrollment, redemptions, or any other trend over a
 * discrete period. `scalePoint` on x, not `scaleBand`: the line reads point
 * positions, not bar widths.
 */
export function SeriesLineChart({
  ariaLabel,
  data,
  height,
  renderTooltip
}: SeriesLineChartProps): JSX.Element {
  const definition = defineChart({
    marks: [
      lineY(data, { stroke: chartTheme.accent, strokeWidth: 2, x: "label", y: "value" }),
      dot(data, { fill: chartTheme.accent, r: 4, stroke: chartTheme.dotStroke, strokeWidth: 2, x: "label", y: "value" })
    ],
    theme: { foreground: chartTheme.label, grid: chartTheme.grid, muted: chartTheme.label },
    tooltip,
    x: { axis: { line: false, tickLabels: { fontSize: 10, fontWeight: 700 } }, scale: () => scalePoint().padding(0.1) },
    y: { axis: { line: false, tickLabels: { fontSize: 10, fontWeight: 700 } }, grid: true, nice: true, scale: scaleLinear }
  });

  const tooltipBodyProp =
    renderTooltip === undefined
      ? {}
      : {
          renderTooltipBody: ({ points }: ChartTooltipBodyRenderContext<ChartSeriesPoint, string, number>) => {
            const point = points[0];
            return point === undefined ? null : renderTooltip(point.datum);
          }
        };

  return <Chart ariaLabel={ariaLabel} definition={definition} height={height} {...tooltipBodyProp} />;
}
