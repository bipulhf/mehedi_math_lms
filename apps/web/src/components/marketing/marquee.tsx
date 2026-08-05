import type { JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A drifting row of words. Public marketing pages only — ADR-0012.
 *
 * The row is rendered twice and the track moves exactly one copy's width, so
 * the loop has no seam. The duplicate is hidden from screen readers, which
 * would otherwise read every subject on the page twice.
 *
 * It pauses on hover, and stands still under prefers-reduced-motion, where it
 * is simply a row of words.
 */
export function Marquee({
  className,
  durationSeconds = 38,
  items
}: {
  className?: string | undefined;
  durationSeconds?: number;
  items: readonly ReactNode[];
}): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  const row = (isDuplicate: boolean): JSX.Element => (
    <div
      aria-hidden={isDuplicate ? "true" : undefined}
      className="flex shrink-0 items-center gap-10 pr-10"
    >
      {items.map((item, index) => (
        <span className="flex items-center gap-10" key={index}>
          {item}
          <span aria-hidden="true" className="text-spectrum-ember">
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn("marquee overflow-hidden", className)}>
      <div
        className="marquee-track flex w-max"
        style={{ "--marquee-duration": `${durationSeconds}s` } as React.CSSProperties}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
