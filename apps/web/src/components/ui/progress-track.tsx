import { resolveProgressChunks } from "@genex/shared";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

export interface ProgressTrackProps {
  className?: string | undefined;
  /** Units finished — lectures watched, or a percentage when `total` is 100. */
  completed: number;
  /** True once there is nothing left, which mutes the fill. */
  isComplete?: boolean | undefined;
  /** What the tracker is measuring, read out to a screen reader. */
  label: string;
  /** Units there are to finish. */
  total: number;
}

/**
 * The chunked progress tracker: accent for what is done, `bar-track` for what
 * is not, square chunks, no thin line.
 *
 * Chunks are the point. A continuous bar at 62% is a shape a student has to
 * interpret; eight blocks with five filled is something they can count. Where
 * the units are few enough, that is literally the lecture count.
 *
 * A finished course fills in `line-strong` rather than accent — the design
 * spends accent on what still needs doing, and a completed course does not.
 */
export function ProgressTrack({
  className,
  completed,
  isComplete = false,
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
      className={cn("flex w-full items-stretch gap-[3px]", className)}
      role="progressbar"
    >
      {Array.from({ length: chunks.total }, (_, index) => (
        <span
          className={cn(
            "h-[5px] flex-1 transition-colors duration-150",
            index < chunks.filled
              ? isComplete
                ? "bg-line-strong"
                : "bg-accent"
              : "bg-bar-track"
          )}
          key={index}
        />
      ))}
    </div>
  );
}
