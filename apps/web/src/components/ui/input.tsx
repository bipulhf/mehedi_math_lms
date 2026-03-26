import type { InputHTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | undefined;
}

export function Input({ className, error, ...props }: InputProps): JSX.Element {
  return (
    <div className="space-y-2">
      <input
        className={cn(
          "h-12 w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 text-sm text-on-surface",
          "placeholder:text-on-surface/45 transition-all duration-150 ease-out",
          "shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]",
          "focus-visible:outline-none",
          error ? "shadow-[inset_0_0_0_1px_rgba(196,53,59,0.24)]" : undefined,
          className
        )}
        {...props}
      />
      {error ? <p className="text-sm text-[color:#c4353b]">{error}</p> : null}
    </div>
  );
}
