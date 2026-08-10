import { Chart } from "@tanstack/charts/react/tooltip";
import { barY, defineChart } from "@tanstack/charts";
import type { ChartTooltipBodyRenderContext } from "@tanstack/charts/react/tooltip";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { JSX } from "react";

import { chartTheme } from "@/lib/chart-theme";
import type { ChartSeriesPoint } from "@/components/charts/line-chart";

export interface SeriesBarChartProps {
  ariaLabel: string;
  data: readonly ChartSeriesPoint[];
  height: number;
  renderTooltip?: ((point: ChartSeriesPoint) => string) | undefined;
}

/** A single-series vertical bar — one category per bar, read top to bottom. */
export function SeriesBarChart({ ariaLabel, data, height, renderTooltip }: SeriesBarChartProps): JSX.Element {
  const definition = defineChart({
    marks: [barY(data, { fill: chartTheme.accent, maxThickness: 40, radius: 4, x: "label", y: "value" })],
    theme: { foreground: chartTheme.label, grid: chartTheme.grid, muted: chartTheme.label },
    tooltip,
    x: { axis: { line: false, tickLabels: { fontSize: 10, fontWeight: 700 } }, scale: () => scaleBand().padding(0.25) },
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
