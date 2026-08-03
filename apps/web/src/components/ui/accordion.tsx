import type { JSX, PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface AccordionRowProps extends PropsWithChildren {
  className?: string | undefined;
  isOpen: boolean;
  /** Sits to the right of the title — a lesson count, a duration. */
  meta?: ReactNode;
  onToggle: () => void;
  title: ReactNode;
}

/**
 * One accordion row. Rows are independent — opening one never closes another,
 * which is why open state is the caller's and not held here.
 *
 * The marker is a text `+` / `–`, not an icon: the design ships no icon font,
 * and a rotating chevron would be motion. DESIGN.md §6.
 */
export function AccordionRow({
  children,
  className,
  isOpen,
  meta,
  onToggle,
  title
}: AccordionRowProps): JSX.Element {
  return (
    <div className={cn("border-b border-hairline", className)}>
      <button
        aria-expanded={isOpen}
        className="flex min-h-11 w-full cursor-pointer items-center gap-4 py-5 text-left transition-colors duration-150 hover:bg-panel-warm focus-visible:outline-none"
        onClick={onToggle}
        type="button"
      >
        <span className="flex-1 text-lg font-medium text-ink">{title}</span>
        {meta === undefined ? null : <span className="text-sm text-muted-light">{meta}</span>}
        <span aria-hidden="true" className="w-4 text-center text-xl font-light text-muted">
          {isOpen ? "–" : "+"}
        </span>
      </button>
      {isOpen ? <div className="pb-5">{children}</div> : null}
    </div>
  );
}
