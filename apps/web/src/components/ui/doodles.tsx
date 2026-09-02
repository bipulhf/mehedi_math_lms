import type { JSX, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

/**
 * The decorative set from DESIGN.md §7. All CSS, no illustration files, and
 * all `pointer-events-none` — none of them is interactive and none should ever
 * intercept a click.
 *
 * Any section that places one must be `relative overflow-hidden`, or the
 * absolutely positioned ones will spill.
 */

/**
 * A hand-drawn ring around one word in a heading. Wraps the word rather than
 * being positioned by hand, so it survives the word changing length between
 * Bangla and English.
 */
export function RingedWord({ children }: PropsWithChildren): JSX.Element {
  return (
    <span className="relative inline-block">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-3 -right-3 -top-0.5 bottom-0.5 rounded-full border-2 border-accent opacity-40 animate-doodle-pulse"
        style={{ transform: "rotate(-3deg)" }}
      />
    </span>
  );
}

/** A square of dots for a section corner. */
export function DotPatch({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute size-28", className)}
      style={{
         backgroundImage: "radial-gradient(color-mix(in oklab, var(--color-brand-blue) 45%, transparent) 1.5px, transparent 1.5px)",
        backgroundSize: "15px 15px"
      }}
    />
  );
}

/** A quarter arc — a circle with two borders knocked out, rotated. */
export function QuarterArc({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
         "pointer-events-none absolute size-16 rounded-full border-[1.5px] border-ink/20",
        "border-r-transparent border-t-transparent",
        className
      )}
      style={{ transform: "rotate(-24deg)" }}
    />
  );
}

/** Three small diamonds in decreasing tint. */
export function DiamondTrio({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute flex items-center gap-1.5", className)}
    >
      {["#007BFF", "#F5A723", "#DC9109"].map((tint) => (
        <span
        className="size-[7px]"
          key={tint}
          style={{ backgroundColor: tint, transform: "rotate(45deg)" }}
        />
      ))}
    </span>
  );
}

/** The hatched rule that sits above a closing band or the footer. */
export function HatchedRule({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none block h-1.5 w-full", className)}
      style={{
         backgroundImage:
           "repeating-linear-gradient(45deg, color-mix(in oklab, var(--color-brand-blue) 35%, transparent) 0 2px, transparent 2px 8px)"
      }}
    />
  );
}

/**
 * A circled step number — the 01 / 02 / 03 marks. The numeral is accent, the
 * ring is a hairline.
 */
export function StepCircle({
  className,
  children
}: PropsWithChildren<{ className?: string }>): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
        "border-[1.5px] border-hairline text-accent label-mono text-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * The play triangle. A clip-path rather than an icon, because the design ships
 * no icon font — see DESIGN.md §7.
 */
export function PlayGlyph({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn("block size-2.5 bg-ink", className)}
      style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
    />
  );
}

/** A play glyph inside a hairline ring — the free-lesson and resume marks. */
export function RingedPlay({
  className,
  glyphClassName
}: {
  className?: string;
  glyphClassName?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border border-hairline",
        className
      )}
    >
      <PlayGlyph className={cn("ml-0.5", glyphClassName)} />
    </span>
  );
}

/**
 * A small set of plain-text math glyphs (Greek letters, operators) that can be
 * sprinkled into copy. Rendered as a span of serif text so they sit with the
 * formula type rather than the UI type. DESIGN.md §4.
 */
export function MathGlyph({
  children,
  className
}: {
  children: string;
  className?: string;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-formula italic text-brand-gold tracking-normal",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * A single formula character, oversized and faded into a section corner —
 * background texture, not a highlight. `MathGlyph` at full weight is for a
 * word inline in a sentence; this is the quiet version for empty space.
 */
export function FaintFormula({
  className,
  glyph,
  rotate = -6
}: {
  className?: string;
  glyph: string;
  rotate?: number;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none font-formula text-8xl text-brand-gold opacity-[0.08] sm:text-9xl",
        className
      )}
      style={{ transform: `rotate(${String(rotate)}deg)` }}
    >
      {glyph}
    </span>
  );
}
