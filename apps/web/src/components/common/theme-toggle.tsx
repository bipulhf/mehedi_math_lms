import type { JSX } from "react";

import { useT } from "@/lib/i18n/locale-context";
import { useTheme } from "@/lib/theme/theme-context";
import { cn } from "@/lib/utils";

/**
 * Drawn, not imported: the header carries no icon set (DESIGN.md), and a sun
 * and a crescent are two paths. The glyph shows the theme the reader is in,
 * and the label says what the button will do — a toggle that shows only its
 * destination is a puzzle, the same objection `LanguageSwitcher` answers.
 */
function SunGlyph(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
    </svg>
  );
}

function MoonGlyph(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      <path d="M20.2 14.4A8.6 8.6 0 0 1 9.6 3.8a8.6 8.6 0 1 0 10.6 10.6Z" />
    </svg>
  );
}

export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const t = useT();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? t("theme.toLight") : t("theme.toDark")}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors",
        "hover:bg-chip-active hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      onClick={toggleTheme}
      title={isDark ? t("theme.toLight") : t("theme.toDark")}
      type="button"
    >
      {isDark ? <MoonGlyph /> : <SunGlyph />}
    </button>
  );
}
