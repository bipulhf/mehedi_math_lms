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
 * A centred modal on the ink scrim. Square card, hairline border, no shadow and
 * no motion, matching the top-level design and `ConfirmDialog`. Closes on
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        aria-hidden="true"
        aria-label={title}
        aria-modal="true"
        className={cn("w-full max-w-md border border-hairline bg-card p-6", className)}
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
