import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)]",
    "text-sm font-semibold transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-container/30",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "disabled:pointer-events-none disabled:opacity-55",
    "min-h-11"
  ],
  {
    variants: {
      size: {
        default: "px-4 py-2.5",
        lg: "px-5 py-3",
        sm: "px-3.5 py-2"
      },
      variant: {
        primary:
          "bg-linear-to-r from-primary to-on-primary-container text-white shadow-[0_10px_30px_-10px_rgba(19,27,46,0.18)] hover:-translate-y-0.5 hover:brightness-105",
        secondary:
          "bg-secondary-container text-white shadow-[0_10px_30px_-10px_rgba(19,27,46,0.12)] hover:-translate-y-0.5 hover:brightness-105",
        ghost:
          "bg-transparent text-on-surface hover:bg-surface-container-highest/60",
        outline:
          "bg-surface-container-lowest text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.15)] hover:bg-surface-container-highest/50"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "primary"
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
