import { resolveProgressChunks } from "@genex/shared";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

export interface ProgressTrackProps {
  className?: string | undefined;
  /** Units finished — lectures watched, or a percentage when `total` is 100. */
  completed: number;
  /** What the tracker is measuring, read out to a screen reader. */
  label: string;
  /** Units there are to finish. */
  total: number;
}

/**
 * The chunked progress tracker from DESIGN.md: `secondary` for what is done,
 * `surface-container-highest` for what is not, and no thin line anywhere.
 *
 * Chunks are the point. A continuous bar at 62% is a shape a student has to
 * interpret; eight blocks with five filled is something they can count. Where
 * the units are few enough, that is literally the lecture count.
 */
export function ProgressTrack({
  className,
  completed,
  label,
  total
}: ProgressTrackProps): JSX.Element {
  const chunks = resolveProgressChunks(completed, total);

  return (
    <div
      aria-label={label}
      aria-valuemax={total}
      aria-valuemin={0}
      aria-valuenow={completed}
      className={cn("flex w-full items-stretch gap-1", className)}
      role="progressbar"
    >
      {Array.from({ length: chunks.total }, (_, index) => (
        <span
          className={cn(
            "h-2.5 flex-1 rounded-xs transition-colors duration-500 ease-out",
            index < chunks.filled ? "bg-secondary" : "bg-surface-container-highest"
          )}
          key={index}
        />
      ))}
    </div>
  );
}
