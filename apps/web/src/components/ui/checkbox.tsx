import type { InputHTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

/**
 * A 3px square that fills accent when checked — one of the few places the
 * design spends the accent as a fill. DESIGN.md §5.
 *
 * The native input stays in the tree rather than being replaced by a div, so
 * keyboard, form submission and screen readers keep working; it is made
 * invisible and the visible box is drawn from its `peer` state.
 */
export function Checkbox({ className, label, ...props }: CheckboxProps): JSX.Element {
  return (
    <label className={cn("flex min-h-11 items-center gap-3", className)}>
      <span className="relative inline-flex size-[18px] shrink-0 items-center justify-center">
        <input className="peer absolute inset-0 opacity-0" type="checkbox" {...props} />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none size-[18px] rounded-[3px] border border-line-strong bg-card",
            "transition-colors duration-150",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-focus-visible:border-ink"
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute hidden text-[11px] leading-none text-paper peer-checked:block"
        >
          ✓
        </span>
      </span>
      <span className="text-base font-light text-ink-muted">{label}</span>
    </label>
  );
}
