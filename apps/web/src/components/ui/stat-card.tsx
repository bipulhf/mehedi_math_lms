import type { JSX, ReactNode } from "react";

import { spectrumClasses, type SpectrumHue } from "@/lib/spectrum";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  className?: string | undefined;
  /** A movement note — "+12%". Accent only when it is worth acting on. */
  delta?: ReactNode;
  isDeltaAccent?: boolean | undefined;
  /** A coloured left rule, so a row of numbers is scannable. ADR-0011. */
  hue?: SpectrumHue | undefined;
  label: string;
  value: ReactNode;
}

/**
 * The KPI card used across all three dashboards: a muted label over a large
 * number, with an optional movement note.
 *
 * The number is 26–30px at weight 500 (DESIGN.md §4) — large enough to scan,
 * never bold enough to shout.
 */
export function StatCard({
  className,
  delta,
  hue,
  isDeltaAccent = false,
  label,
  value
}: StatCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "border border-hairline bg-card p-4 sm:p-5",
        hue === undefined ? null : `border-l-2 ${spectrumClasses(hue).rule}`,
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-faint">{label}</p>
      <p className="mt-1.5 text-2xl font-medium text-ink">{value}</p>
      {delta === undefined ? null : (
        <p className={cn("mt-1 text-xs", isDeltaAccent ? "text-accent" : "text-muted")}>{delta}</p>
      )}
    </div>
  );
}
