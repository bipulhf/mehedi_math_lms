import type { JSX, TextareaHTMLAttributes } from "react";

import { fieldClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | undefined;
}

export function Textarea({ className, error, ...props }: TextareaProps): JSX.Element {
  return (
    <div className="space-y-2">
      <textarea
        className={cn(fieldClassName(error), "min-h-32 py-3 leading-relaxed", className)}
        {...props}
      />
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
