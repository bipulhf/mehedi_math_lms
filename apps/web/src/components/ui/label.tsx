import type { JSX, LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return (
    <label
      className={cn(
        "text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-on-surface/58",
        className
      )}
      {...props}
    />
  );
}
