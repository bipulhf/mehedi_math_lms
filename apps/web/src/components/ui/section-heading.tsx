import type { JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  /** Sits opposite the title — a "see all" link, a filter. */
  action?: ReactNode;
  className?: string | undefined;
  description?: ReactNode;
  /** An Archivo micro-label above the title. */
  eyebrow?: string;
  title: ReactNode;
}

/**
 * The heading block that opens a section: optional Archivo eyebrow, a
 * weight-500 title, an optional light description, and an action opposite.
 *
 * Titles are 500 and never heavier — DESIGN.md §4 makes the point that the
 * calm register depends on it.
 */
export function SectionHeading({
  action,
  className,
  description,
  eyebrow,
  title
}: SectionHeadingProps): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-3">
        {eyebrow === undefined ? null : (
          <p className="label-mono text-xs uppercase text-muted-faint">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-medium leading-tight text-ink sm:text-3xl">{title}</h2>
        {description === undefined ? null : (
          <p className="max-w-[60ch] text-base font-light leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
