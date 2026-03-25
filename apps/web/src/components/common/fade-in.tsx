import type { JSX, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface FadeInProps extends PropsWithChildren {
  className?: string | undefined;
  delayClassName?: string | undefined;
}

export function FadeIn({ children, className, delayClassName }: FadeInProps): JSX.Element {
  return (
    <div
      className={cn(
        "animate-fade-in-up motion-reduce:animate-none",
        "transition-[opacity,transform] duration-150 ease-out",
        delayClassName,
        className
      )}
    >
      {children}
    </div>
  );
}
