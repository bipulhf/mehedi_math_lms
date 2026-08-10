import type { JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ChartFrameProps {
  children: ReactNode;
  className?: string | undefined;
  /** Content height in pixels — every mounted `<Chart>` needs a fixed height. */
  height?: number;
  isEmpty?: boolean;
  subtitle?: string | undefined;
  title: string;
}

/**
 * The card shell every chart sits in: `border-hairline bg-card`, no shadow,
 * no blur (DESIGN.md §5). Replaces the three ad hoc frames (`ChartFrame` in
 * coupon-charts.tsx, `ChartCard` in the teacher analytics route, and inline
 * `Card` usage elsewhere) that drew the same box three different ways.
 */
export function ChartFrame({
  children,
  className,
  height = 256,
  isEmpty = false,
  subtitle,
  title
}: ChartFrameProps): JSX.Element {
  return (
    <div className={cn("border border-hairline bg-card p-4 sm:p-6", className)}>
      <h2 className="text-base font-medium text-ink">{title}</h2>
      {subtitle === undefined ? null : (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-faint">{subtitle}</p>
      )}
      <div
        className={cn("mt-4 w-full", isEmpty ? "" : "overflow-hidden")}
        style={{ height }}
      >
        {children}
      </div>
    </div>
  );
}
