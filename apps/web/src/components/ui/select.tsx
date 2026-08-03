import type { JSX, SelectHTMLAttributes } from "react";

import { fieldClassName, fieldHeightClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | undefined;
}

export function Select({ className, error, ...props }: SelectProps): JSX.Element {
  return (
    <div className="space-y-2">
      <select className={cn(fieldClassName(error), fieldHeightClassName, className)} {...props} />
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
