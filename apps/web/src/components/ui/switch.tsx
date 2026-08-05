import type { JSX, ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps {
  /** A sentence under the label. Keep it to why somebody would turn this on. */
  description?: ReactNode;
  /** True while a save is in flight: the setting is not the user's to change yet. */
  disabled?: boolean | undefined;
  label: string;
  onChange: (checked: boolean) => void;
  value: boolean;
}

/**
 * On or off, for a setting that takes effect — published, pinned, advertised.
 *
 * A checkbox says "include this in what I am about to submit"; a switch says
 * "this is on". The app had the second meaning written with the first control
 * everywhere, so a published chapter and a selected filter looked the same.
 * Selections stay checkboxes: the catalogue filters, and the correct answers in
 * a question, are lists you tick, not settings you flip.
 *
 * A real `<input type="checkbox">` stays in the tree, invisible, so form
 * submission, keyboard and screen readers keep working; `role="switch"` on it
 * is what changes how it is announced. The visible track is drawn from its
 * `peer` state, the way `Checkbox` already does it.
 *
 * DESIGN.md §6: flat fill, no shadow, no motion beyond a colour transition.
 * The knob slides, because a switch with nothing moving is unreadable, and that
 * is the one exception the control earns.
 */
export function Switch({
  description,
  disabled = false,
  label,
  onChange,
  value
}: SwitchProps): JSX.Element {
  const id = useId();

  return (
    <div className={cn("flex items-start gap-3", disabled ? "opacity-55" : null)}>
      <span className="relative inline-flex shrink-0 pt-0.5">
        <input
          aria-describedby={description === undefined ? undefined : `${id}-description`}
          checked={value}
          className="peer absolute inset-0 z-10 size-full opacity-0 disabled:cursor-not-allowed"
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          role="switch"
          type="checkbox"
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none flex h-6 w-11 items-center rounded-[var(--radius-pill)] border p-0.5",
            "border-line-strong bg-card transition-colors duration-150 ease-out",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-focus-visible:border-ink"
          )}
        >
          {/* Track 44px, 2px of padding each side, 16px knob — so the travel
              is 24px exactly. A knob that stops short reads as a broken switch. */}
          <span
            className={cn(
              "size-4 rounded-[var(--radius-pill)] bg-line-strong",
              "transition-[transform,background-color] duration-150 ease-out",
              value ? "translate-x-6 bg-paper" : "translate-x-0"
            )}
          />
        </span>
      </span>

      <span className="min-w-0">
        <label
          className={cn(
            "block text-sm font-medium text-ink",
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          )}
          htmlFor={id}
        >
          {label}
        </label>
        {description === undefined ? null : (
          <span className="mt-0.5 block text-xs font-light text-muted" id={`${id}-description`}>
            {description}
          </span>
        )}
      </span>
    </div>
  );
}
