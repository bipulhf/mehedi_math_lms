import type { JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** An optional way out — "clear the filters", "add the first one". */
  action?: ReactNode;
  className?: string | undefined;
  message: string;
}

/**
 * A dashed box with one muted sentence. DESIGN.md §6 asks for one wherever a
 * list can come back empty — an empty white card reads as a page that failed
 * to load rather than as a search with no matches.
 */
export function EmptyState({ action, className, message }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 border border-dashed border-dot-idle px-6 py-12 text-center",
        className
      )}
    >
      <p className="text-base font-light text-muted">{message}</p>
      {action}
    </div>
  );
}
