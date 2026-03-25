import type { JSX, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | undefined;
}

export function Textarea({ className, error, ...props }: TextareaProps): JSX.Element {
  return (
    <div className="space-y-2">
      <textarea
        className={cn(
          "min-h-32 w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3 text-sm text-on-surface",
          "placeholder:text-on-surface/45 transition-all duration-150 ease-out",
          "shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]",
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
