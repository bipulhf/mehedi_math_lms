import type { JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ModalProps {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  open: boolean;
  title?: string;
}

/**
 * A centered modal on the ink scrim. Rounded ink plate with cyan focus language.
 * Closes on
 * Escape or a click on the scrim — never on a click inside the panel.
 */
export function Modal({
  children,
  className,
  onClose,
  open,
  title
}: ModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div
      // Top-aligned on a phone and centred from `sm` up: a modal taller than a
      // short viewport has to scroll from its own first line, and centring it
      // puts the title above the top edge where it cannot be reached.
       className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center sm:p-6"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        aria-label={title}
        aria-modal="true"
         className={cn("w-full max-w-md rounded-[var(--radius-md)] border border-hairline bg-background p-5 shadow-[0_24px_80px_-40px_rgba(0,207,255,0.6)] sm:p-6", className)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {title === undefined ? null : (
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="text-xl font-medium text-ink">{title}</h3>
            <button
              aria-label="Close"
              className="grid size-8 place-items-center text-xl leading-none text-muted transition-colors hover:text-ink"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
