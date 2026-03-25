import type { JSX, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | undefined;
}

export function Select({ className, error, ...props }: SelectProps): JSX.Element {
  return (
    <div className="space-y-2">
      <select
        className={cn(
          "h-12 w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 text-sm text-on-surface",
          "transition-all duration-150 ease-out shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-container/20",
          "focus-visible:shadow-[inset_0_0_0_1px_rgba(118,119,125,0.2),0_0_0_4px_rgba(96,99,238,0.08)]",
          error ? "shadow-[inset_0_0_0_1px_rgba(196,53,59,0.24)]" : undefined,
          className
        )}
        {...props}
      />
      {error ? <p className="text-sm text-[#c4353b]">{error}</p> : null}
    </div>
  );
}
