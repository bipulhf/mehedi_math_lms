import type { JSX } from "react";

import { cn } from "@/lib/utils";

const STAR_POLYGON =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

/** A single drawn star. A clip-path rather than a glyph, because the design ships no icon font. */
export function Star({
  className,
  filled
}: {
  className?: string;
  filled: boolean;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn("size-3.5", filled ? "bg-accent" : "bg-muted-faint", className)}
      style={{ clipPath: STAR_POLYGON }}
    />
  );
}

/**
 * Five drawn stars, filled up to the rating.
 */
export function RatingStars({
  className,
  rating
}: {
  className?: string;
  rating: number;
}): JSX.Element {
  const filledCount = Math.round(rating);

  return (
    <span aria-label={`${rating} / 5`} className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star filled={index < filledCount} key={index} />
      ))}
    </span>
  );
}
