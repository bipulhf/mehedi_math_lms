import type { ButtonHTMLAttributes, HTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center justify-center rounded-[var(--radius-pill)] px-4 py-2 text-sm transition-colors duration-150";

/**
 * A static pill — course meta, a batch fact, a status. DESIGN.md §6.
 * Transparent with a hairline; the accent variant is for the one fact on the
 * page that is urgent.
 */
export function Pill({
  className,
  isAccent = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { isAccent?: boolean }): JSX.Element {
  return (
    <span
      className={cn(
        pillBase,
        "border border-hairline",
        isAccent ? "text-accent" : "text-muted",
        className
      )}
      {...props}
    />
  );
}

export interface FilterPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected: boolean;
}

/**
 * A pill that filters. Unselected is transparent with a hairline; selected
 * fills `chip-active` with ink text and drops the border — the design never
 * marks selection with the accent on a pill, only on indicator dots.
 */
export function FilterPill({
  className,
  isSelected,
  ...props
}: FilterPillProps): JSX.Element {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        pillBase,
        "min-h-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-strong",
        isSelected
          ? "bg-chip-active text-ink"
          : "border border-hairline text-muted hover:border-line-strong hover:text-ink",
        className
      )}
      type="button"
      {...props}
    />
  );
}
