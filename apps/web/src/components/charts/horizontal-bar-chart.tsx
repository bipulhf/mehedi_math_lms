import { Chart } from "@tanstack/charts/react/tooltip";
import { barX, defineChart } from "@tanstack/charts";
import type { ChartTooltipBodyRenderContext } from "@tanstack/charts/react/tooltip";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { JSX } from "react";

import { useChartTheme } from "@/lib/chart-theme";
import type { ChartSeriesPoint } from "@/components/charts/line-chart";

export interface SeriesHorizontalBarChartProps {
  ariaLabel: string;
  data: readonly ChartSeriesPoint[];
  height: number;
  renderTooltip?: ((point: ChartSeriesPoint) => string) | undefined;
}

/**
 * A single-series horizontal bar — ranked categories (revenue by course,
 * demographics by grade) where the label needs the full row width to read.
 */
export function SeriesHorizontalBarChart({
  ariaLabel,
  data,
  height,
  renderTooltip
}: SeriesHorizontalBarChartProps): JSX.Element {
  const chartTheme = useChartTheme();

  const definition = defineChart({
    marks: [barX(data, { fill: chartTheme.accent, maxThickness: 28, radius: 4, x: "value", y: "label" })],
    theme: { foreground: chartTheme.label, grid: chartTheme.grid, muted: chartTheme.label },
    tooltip,
    x: { axis: { line: false, tickLabels: { fontSize: 10, fontWeight: 700 } }, grid: true, nice: true, scale: scaleLinear },
    y: { axis: { line: false, tickLabels: { fontSize: 10, fontWeight: 700 } }, scale: () => scaleBand().padding(0.25) }
  });

  const tooltipBodyProp =
    renderTooltip === undefined
      ? {}
      : {
          renderTooltipBody: ({ points }: ChartTooltipBodyRenderContext<ChartSeriesPoint, number, string>) => {
            const point = points[0];
            return point === undefined ? null : renderTooltip(point.datum);
          }
        };

  return <Chart ariaLabel={ariaLabel} definition={definition} height={height} {...tooltipBodyProp} />;
}
