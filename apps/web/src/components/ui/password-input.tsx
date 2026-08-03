import { useState, type JSX } from "react";

import { fieldClassName, fieldHeightClassName } from "@/components/ui/field";
import type { InputProps } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, error, ...props }: InputProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const t = useT();
  const toggleLabel = isVisible ? t("field.hidePassword") : t("field.showPassword");

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          {...props}
          type={isVisible ? "text" : "password"}
          className={cn(fieldClassName(error), fieldHeightClassName, "pr-16", className)}
        />
        {/* Words rather than an eye icon: the design uses no icon font, and a
            crossed-out eye is the one glyph people reliably read backwards. */}
        <button
          type="button"
          aria-label={toggleLabel}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-sm text-muted transition-colors hover:text-ink focus-visible:outline-none"
          onClick={() => setIsVisible((current) => !current)}
        >
          {toggleLabel}
        </button>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
