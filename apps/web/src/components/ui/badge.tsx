import type { HTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

/**
 * Status marks, drawn in the muted scale rather than a red/green/amber
 * palette. DESIGN.md §2: the accent is reserved for the one status that
 * genuinely needs attention, and everything else stays quiet.
 *
 * A payment that is stuck and a licence about to expire earn `attention`. A
 * successful payment does not — nothing is wrong, so nothing should shout.
 *
 * The three spectrum tones are not statuses at all: they mark what kind of
 * thing this is, which is the one place ADR-0011 lets colour in.
 */
const toneClasses = {
  /** Needs someone to act. The only accent-coloured status. */
  attention: "bg-card text-accent border border-hairline",
  /** Withdrawn, refunded, archived — present but no longer live. */
  faded: "bg-card text-muted-faint border border-hairline",
  /** A kind or a category — colour that tells things apart, not a status. */
  indigo: "bg-spectrum-indigo/10 text-spectrum-indigo border border-spectrum-indigo/25",
  /** The default. Published, settled, active, everything ordinary. */
  neutral: "bg-chip-active text-ink",
  /** Draft, pending, not yet real. */
  quiet: "bg-card text-muted border border-hairline",
  teal: "bg-spectrum-teal/10 text-spectrum-teal border border-spectrum-teal/25",
  violet: "bg-spectrum-violet/10 text-spectrum-violet border border-spectrum-violet/25"
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] px-3 py-1 text-sm font-normal",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
