import type { JSX } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The full loading state of the landing page.
 *
 * DESIGN.md §1 forbids animation; the placeholders are still blocks, not
 * shimmers. The shape and rhythm of every section is mirrored so the swap to
 * content shifts nothing — the same gutters, the same grid columns, the same
 * card sizing. Two rules follow:
 *
 * - The chrome is the real chrome. `border-hairline bg-card`, not a translucent
 *   hairline over an invisible card.
 * - Widths are fractional wherever the real line is elastic — `w-3/5`, not
 *   `w-64` — because a fixed placeholder wider than a 360px phone scrolls the
 *   page sideways before the content it stands in for has loaded.
 *
 * Sections that don't load from the API (formula band, marquee, math rail,
 * platform features, how it works, reviews, FAQ) still get a placeholder: the
 * API call is the only thing the loader waits on, but the whole page has to
 * feel the same shape during the wait.
 */
export function LandingSkeleton(): JSX.Element {
  return (
    <>
      <CourseCarouselSkeleton />
      <SectionSkeleton tone="paper">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-7 w-2/5" />
        <Skeleton className="mt-3 h-4 w-3/5 max-w-[60ch]" />
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border border-l-2 border-hairline bg-card p-5">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="mt-2 h-3 w-2/5" />
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton tone="paper">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-1/2" />
        <Skeleton className="mt-3 h-4 w-2/5 max-w-[60ch]" />
        <div className="mt-2 grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-16">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className="flex items-center gap-4 border-b border-hairline-faint px-2 py-4"
                key={index}
              >
                <Skeleton className="size-2 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="flex items-center gap-4 border-b border-hairline-faint px-2 py-4"
                key={index}
              >
                <Skeleton className="h-14 w-[76px] shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </SectionSkeleton>

      <MarqueeSkeleton />

      <SectionSkeleton tone="warm">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-1/2" />
        <Skeleton className="mt-3 h-4 w-3/5 max-w-[60ch]" />
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="flex h-full items-center gap-5 border border-hairline bg-card p-5"
              key={index}
            >
              <Skeleton className="h-7 w-20 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-5 shrink-0" />
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton tone="paper">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-1/2" />
        <Skeleton className="mt-3 h-4 w-3/5 max-w-[60ch]" />
        <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="h-full border border-l-2 border-hairline bg-card p-6" key={index}>
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton tone="paper">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-7 w-1/2" />
        <Skeleton className="mt-3 h-4 w-2/5 max-w-[60ch]" />
        <div className="mt-2 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton tone="paper">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-1/2" />
        <Skeleton className="mt-3 h-4 w-3/5 max-w-[60ch]" />
        <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="flex items-center gap-4 border border-l-2 border-hairline bg-card p-5" key={index}>
              <Skeleton className="size-14 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton tone="warm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-7 w-1/2" />
        <Skeleton className="mt-3 h-4 w-3/5 max-w-[60ch]" />
        <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="flex h-full flex-col gap-4 border border-l-2 border-hairline bg-card p-6" key={index}>
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <div className="mt-auto space-y-1.5 pt-4">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <FaqSkeleton />
    </>
  );
}

/**
 * One band of the skeleton: heading + content. Mirrors `LandingSection`'s
 * container and rhythm exactly so the swap to the real section shifts nothing.
 */
function SectionSkeleton({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: "paper" | "warm";
}): JSX.Element {
  return (
    <section
      className={`border-b border-hairline ${tone === "warm" ? "bg-panel-warm" : ""}`}
    >
      <div className="mx-auto w-full max-w-[90rem] space-y-8 px-4 py-14 sm:px-8 lg:px-14 lg:py-20">
        {children}
      </div>
    </section>
  );
}

/**
 * The carousel is full-bleed: a contained skeleton block here and a full-width
 * slide once the loader lands would jump. The skeleton matches the real
 * carousel height so nothing moves when the courses arrive.
 */
function CourseCarouselSkeleton(): JSX.Element {
  return (
    <section aria-hidden="true" className="border-b border-hairline">
      <Skeleton className="h-[30rem] w-full sm:h-[34rem] lg:h-[40rem]" />
    </section>
  );
}

/**
 * The formula marquee: a thin bordered band with a row of placeholder bars.
 * The band sits between two sections, so it needs its own hairline borders
 * rather than the section padding.
 */
function MarqueeSkeleton(): JSX.Element {
  return (
    <section aria-hidden="true" className="border-y border-hairline bg-panel-warm py-6">
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-8 px-4 sm:gap-12 sm:px-8 lg:px-14">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton className="h-7 w-32 shrink-0" key={index} />
        ))}
      </div>
    </section>
  );
}

/**
 * The FAQ: four hairline rows, the first one slightly taller than the rest
 * (it is open by default — DESIGN.md §6) and the rest collapsed.
 */
function FaqSkeleton(): JSX.Element {
  return (
    <SectionSkeleton tone="paper">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-1/2" />
      <div className="mt-2 space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="border-b border-hairline px-1 py-5" key={index}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            {index === 0 ? (
              <div className="mt-3 space-y-2 pl-9">
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </SectionSkeleton>
  );
}