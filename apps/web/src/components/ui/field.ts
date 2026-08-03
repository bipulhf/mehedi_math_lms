import { cn } from "@/lib/utils";

/**
 * One field surface, shared by input, textarea, select and password-input —
 * they were four copies of the same class string, which is how three of them
 * ended up with a focus glow the fourth did not have.
 *
 * DESIGN.md §6: 4px radius, white fill, one hairline, `placeholder` grey.
 * Focus darkens the border to `line-strong`. No glow, no ring, no shadow.
 */
export function fieldClassName(error: string | undefined, className?: string): string {
  return cn(
    "w-full rounded-[var(--radius)] border bg-card px-3.5 text-sm text-ink",
    "transition-colors duration-150 ease-out",
    "placeholder:text-placeholder",
    "focus-visible:outline-none focus-visible:border-line-strong",
    "disabled:cursor-not-allowed disabled:bg-panel-warm disabled:text-muted-faint",
    error ? "border-error" : "border-hairline",
    className
  );
}

/** Fields are compact 40px (h-10) tall for high-density UI. */
export const fieldHeightClassName = "h-10";
