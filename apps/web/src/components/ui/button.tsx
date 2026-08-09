import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Reference theme buttons: cyan primary, orange decisive action, surface-aware
 * outlines, and a 44px minimum touch target.
 */
const buttonVariants = cva(
  [
    "inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius)]",
    "font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-55"
  ],
  {
    variants: {
      size: {
        default: "px-4 text-sm sm:text-base",
        lg: "px-5 text-base",
        sm: "min-h-10 px-3 text-sm",
        xs: "min-h-9 px-2.5 text-xs",
        icon: "size-11 shrink-0 p-0"
      },
      variant: {
        ink: "bg-brand-cyan text-action-foreground hover:bg-brand-cyan/90 hover:-translate-y-0.5",
        accent: "bg-brand-orange text-action-foreground hover:bg-brand-orange/90 hover:-translate-y-0.5",
        outline: "border border-line-strong bg-transparent text-ink hover:border-brand-cyan hover:bg-brand-cyan/10",
        ghost: "bg-transparent text-muted hover:bg-panel-warm hover:text-ink",
        accentLink: "min-h-0 bg-transparent px-0 text-brand-cyan hover:text-brand-orange",
        underline:
          "min-h-0 rounded-none border-b border-line-strong bg-transparent px-0 text-ink hover:border-brand-orange hover:text-brand-orange"
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
