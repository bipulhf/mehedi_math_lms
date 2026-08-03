import type { JSX, LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * A field label, set in words rather than in tiny all-caps. DESIGN.md §4 puts
 * labels at 15–16px in the muted scale — the uppercase micro-label belongs to
 * the Archivo marks (`.label-mono`), not to form fields.
 */
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return <label className={cn("block text-sm text-muted-light", className)} {...props} />;
}
