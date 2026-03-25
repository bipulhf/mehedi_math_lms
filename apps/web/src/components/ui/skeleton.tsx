import type { HTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-white/65 before:to-transparent",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}
