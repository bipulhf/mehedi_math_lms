import type { JSX } from "react";
import { locales, localeNames } from "@mma/i18n";

import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

/**
 * Two pills, both always visible. A single toggle that says only the language
 * you are not in is a puzzle in a product whose readers may not read the label.
 */
export function LanguageSwitcher({ className }: { className?: string }): JSX.Element {
  const { locale, setLocale, t } = useLocale();

  return (
    <div aria-label={t("locale.label")} className={cn("inline-flex items-center gap-1", className)} role="group">
      {locales.map((option) => (
        <button
          key={option}
          aria-pressed={option === locale}
          className={cn(
            "min-h-11 rounded-full px-3 text-sm transition-colors",
            option === locale
              ? "bg-chip-active text-ink"
              : "text-muted hover:bg-chip-active hover:text-ink"
          )}
          onClick={() => setLocale(option)}
          type="button"
        >
          {localeNames[option]}
        </button>
      ))}
    </div>
  );
}
