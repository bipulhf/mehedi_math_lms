import { Eye, EyeOff } from "lucide-react";
import { useState, type JSX } from "react";

import type { InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, error, ...props }: InputProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          {...props}
          type={isVisible ? "text" : "password"}
          className={cn(
            "h-12 w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 pr-12 text-sm text-on-surface",
            "placeholder:text-on-surface/45 transition-all duration-150 ease-out",
            "shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]",
            "focus-visible:outline-none",
            error ? "shadow-[inset_0_0_0_1px_rgba(196,53,59,0.24)]" : undefined,
            className
          )}
        />
        <button
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-on-surface/55 transition-colors hover:text-on-surface focus-visible:outline-none"
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="text-sm text-[#c4353b]">{error}</p> : null}
    </div>
  );
}
