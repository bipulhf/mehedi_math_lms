import type { JSX, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  cancelLabel?: string;
  /** Use when the confirmed action is destructive — tints the confirm button. */
  dangerous?: boolean;
  description: ReactNode;
  confirmLabel?: string;
  open: boolean;
  /** True while the confirmed action is running; disables both buttons. */
  pending?: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * A modal replacement for `window.confirm`, rendered as a rounded ink plate on
 * a black scrim.
 *
 * A `dangerous` confirm is rendered as an ink button with the tinted `error`
 * outline rather than a hard red fill; the design keeps one saturated colour
 * (`accent`) on this surface and reserves `text-error` for signals.
 */
export function ConfirmDialog({
  cancelLabel = "Cancel",
  dangerous = false,
  description,
  confirmLabel,
  open = false,
  pending = false,
  title,
  onCancel,
  onConfirm
}: ConfirmDialogProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center sm:p-6">
      <div
        className="w-full max-w-md rounded-[var(--radius-md)] border border-hairline bg-popover p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <h3
          className={cn(
            "font-body text-xl font-medium text-ink",
            dangerous ? "text-error" : "text-ink"
          )}
          id="confirm-dialog-title"
        >
          {title}
        </h3>
        <div id="confirm-dialog-description" className="mt-2 text-sm font-light leading-relaxed text-muted">
          {description}
        </div>

        {/* Column-reverse on a phone so the confirm sits under the thumb and
            the cancel below it, rather than two half-width buttons wrapping. */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={pending}
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            disabled={pending}
            type="button"
            variant={dangerous ? "ghost" : "ink"}
            onClick={onConfirm}
            className={cn(
              "w-full sm:w-auto",
              dangerous ? "text-error hover:bg-error/10" : undefined
            )}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
