import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * DESIGN.md §6. Flat fills, 4px radius, no gradients, no shadows, and nothing
 * that moves on hover — the design's whole motion budget is a colour or border
 * transition.
 *
 * `accent` is rationed: one per app shell, never on a marketing page. Dark
 * actions are `ink`.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius)]",
    "font-medium transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-strong",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-55"
  ],
  {
    variants: {
      size: {
        default: "h-9 px-4 text-xs font-semibold sm:text-sm",
        lg: "h-10 px-5 text-sm font-semibold",
        sm: "h-8 px-3 text-xs",
        xs: "h-7 px-2.5 text-[0.7rem]",
        icon: "size-8 p-0 shrink-0"
      },
      variant: {
        ink: "bg-ink text-paper hover:bg-ink-muted",
        accent: "bg-accent text-paper hover:brightness-95",
        outline: "bg-transparent text-ink border border-line-strong hover:bg-panel-warm",
        ghost: "bg-transparent text-muted hover:bg-panel-warm hover:text-ink",
        /** Accent text with no fill — the "ভর্তি হও →" affordance. */
        accentLink: "bg-transparent px-0 text-accent hover:brightness-90 min-h-0",
        /** An underlined text link. `#C9C3BB` rule, ink text. */
        underline:
          "bg-transparent px-0 text-ink border-b border-line-strong rounded-none hover:text-accent hover:border-accent min-h-0"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "ink"
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  asChild = false,
  children,
  className,
  size,
  variant,
  ...props
}: ButtonProps): JSX.Element {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp className={cn(buttonVariants({ size, variant }), className)} {...props}>
      {children}
    </Comp>
  );
}
