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
    "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)]",
    "font-medium transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-strong",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-55",
    // Touch targets stay at least 44px. DESIGN.md §8.
    "min-h-11"
  ],
  {
    variants: {
      size: {
        default: "px-6 py-3 text-base",
        lg: "px-7 py-3.5 text-lg",
        sm: "px-4 py-2 text-sm"
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
          "bg-transparent px-0 text-ink border-b border-line-strong rounded-none hover:text-accent hover:border-accent min-h-0",

        // Names kept only so the screens that have not been rebuilt keep
        // compiling. Each resolves to its Genex equivalent. Remove in Phase 12.
        default: "bg-ink text-paper hover:bg-ink-muted",
        gradient: "bg-ink text-paper hover:bg-ink-muted",
        secondary: "bg-accent text-paper hover:brightness-95"
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
