import type { JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DotRowProps {
  className?: string | undefined;
  /** A count on the right — how many courses sit under this level. */
  count?: ReactNode;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}

/**
 * A selectable row with a 7px indicator dot — the level selector on the
 * homepage and in the courses filter rail.
 *
 * The dot is the one place selection is marked in accent (pills use
 * `chip-active` instead). DESIGN.md §6.
 */
export function DotRow({
  className,
  count,
  isSelected,
  label,
  onSelect
}: DotRowProps): JSX.Element {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center gap-3 py-3 text-left",
        "transition-colors duration-150 hover:bg-panel-warm focus-visible:outline-none",
        className
      )}
      onClick={onSelect}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-[7px] shrink-0 rounded-full transition-colors duration-150",
          isSelected ? "bg-accent" : "bg-dot-idle"
        )}
      />
      <span className={cn("flex-1 text-base", isSelected ? "text-ink" : "text-muted")}>{label}</span>
      {count === undefined ? null : (
        <span className="label-mono text-xs text-muted-faint">{count}</span>
      )}
    </button>
  );
}
