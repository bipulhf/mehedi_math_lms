import type { HTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

const toneClasses = {
  amber: "bg-amber-100 text-amber-900",
  blue: "bg-sky-100 text-sky-900",
  gray: "bg-slate-200 text-slate-800",
  green: "bg-emerald-100 text-emerald-900",
  red: "bg-rose-100 text-rose-900",
  violet: "bg-violet-100 text-violet-900"
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses;
}

export function Badge({ className, tone = "gray", ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.06em]",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
