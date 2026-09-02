import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Brand buttons: blue primary, gold decisive action, surface-aware outlines,
 * and a 44px minimum touch target.
 *
 * `aria-busy` is the loading state rather than a prop, so a caller can mark a
 * button pending without this component learning about its mutation: the
 * control dims, stops taking clicks, and still announces itself as busy.
 */
const buttonVariants = cva(
  [
    "inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius)]",
    "font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:translate-y-0",
    "aria-busy:pointer-events-none aria-busy:opacity-70",
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
        ink: "bg-accent text-on-accent hover:bg-accent-strong hover:-translate-y-0.5",
        accent:
          "bg-brand-orange text-action-foreground hover:bg-brand-orange-strong hover:-translate-y-0.5",
        // Red stays red. A destructive action is the one place the brand does
        // not get a say in the colour.
        danger: "bg-error text-on-error hover:opacity-90 hover:-translate-y-0.5",
        outline:
          "border border-line-strong bg-transparent text-ink hover:border-accent hover:bg-accent/10 hover:text-accent",
        ghost: "bg-transparent text-muted hover:bg-panel-warm hover:text-ink",
        accentLink: "min-h-0 bg-transparent px-0 text-accent hover:text-accent-strong",
        underline:
          "min-h-0 rounded-none border-b border-line-strong bg-transparent px-0 text-ink hover:border-accent hover:text-accent"
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
