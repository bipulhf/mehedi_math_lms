import type { HTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

/**
 * A still block, not a shimmer. DESIGN.md §1 forbids animation outright, so
 * there is nothing to sweep across it — the fill is the same placeholder grey
 * the design uses for images and avatars that have not loaded.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("bg-placeholder-fill", className)} aria-hidden="true" {...props} />;
}
