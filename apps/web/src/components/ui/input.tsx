import type { InputHTMLAttributes, JSX } from "react";

import { fieldClassName, fieldHeightClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | undefined;
}

export function Input({ className, error, ...props }: InputProps): JSX.Element {
  return (
    <div className="space-y-2">
      <input className={cn(fieldClassName(error), fieldHeightClassName, className)} {...props} />
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
