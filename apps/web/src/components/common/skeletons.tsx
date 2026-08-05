import type { JSX } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The skeletons named in the §12 inventory that did not previously exist.
 *
 * They live together rather than beside each consumer because several are used
 * from more than one place -- `StatsGridSkeleton` by three analytics pages,
 * `ChartSkeleton` by four. Feature-specific skeletons that only ever have one
 * caller stay co-located with it (`CoursePlayerSkeleton`, `CourseEditorSkeleton`).
 *
 * Every one of these mirrors the real layout's container, grid, padding and
 * border, so the swap to content shifts nothing. Two rules follow from that and
 * are easy to get wrong:
 *
 * - The chrome is the real chrome. `border-hairline bg-card`, not a translucent
 *   `border-hairline bg-card` that draws a second, fainter card.
 * - Cards are square (DESIGN.md §6). Only avatars are round, and a button
 *   placeholder carries the button's own `--radius`. A skeleton with soft
 *   corners promises a card that never arrives.
 *
 * Widths are fractional rather than fixed wherever the real line is elastic —
 * `w-3/5`, not `w-64` — because a fixed placeholder wider than a 360px phone
 * scrolls the page sideways before the content it stands in for has loaded.
 */

export function StatsGridSkeleton({ cards = 4 }: { cards?: number }): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, index) => (
        // Matches `StatCard`: hairline, square, `p-4 sm:p-5`, label over number.
        <div key={index} className="border border-hairline bg-card p-4 sm:p-5">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="mt-2.5 h-7 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }): JSX.Element {
  return (
    <div className={className ?? "border border-hairline bg-card p-4 sm:p-6"}>
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="mt-2 h-3 w-3/5" />
      {/* Bars of varying height, so the shape reads as a chart rather than a
          block. Square-topped: recharts draws no corner radius here. */}
      <div className="mt-8 flex h-48 items-end gap-2 sm:h-56 sm:gap-3">
        {[45, 70, 35, 88, 60, 74, 52, 90, 66, 40, 80, 58].map((height, index) => (
          <Skeleton key={index} className="flex-1" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

export function CourseDetailSkeleton(): JSX.Element {
  return (
    // The course page's own container, gutters and column split, verbatim.
    <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_380px] lg:gap-14 lg:px-14 lg:py-14">
      <div className="min-w-0 space-y-6">
        {/* 16:9, matching the real cover, so nothing jumps when it arrives. */}
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-9 w-3/4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="space-y-3 pt-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
      <aside className="min-w-0 space-y-4">
        <div className="border border-hairline bg-card p-5 sm:p-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-6 h-12 w-full" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ConversationListSkeleton({ rows = 6 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2 p-3 sm:p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="border border-hairline bg-panel-warm p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageThreadSkeleton({ rows = 6 }: { rows?: number }): JSX.Element {
  return (
    <div className="flex flex-col gap-3 p-4 sm:p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          // Alternating sides and the bubble's own measure: `max-w-[85%]`
          // narrowing to `75%` from `sm`, square like the real bubble.
          className={
            index % 2 === 0 ? "h-20 w-[85%] sm:w-[75%]" : "ml-auto h-20 w-[80%] sm:w-[70%]"
          }
        />
      ))}
    </div>
  );
}

export function CommentThreadSkeleton({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          {/* One indented reply, matching the two-level nesting cap. */}
          {index === 0 ? (
            <div className="flex items-start gap-3 border-l border-hairline pl-4 md:pl-6">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function NotificationListSkeleton({ rows = 5 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="bg-panel-warm p-4">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function CategoryTreeSkeleton({ rows = 6 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          // Every third row is indented, standing in for a child category.
          className={index % 3 === 2 ? "pl-6 sm:pl-8" : undefined}
        >
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TestBuilderSkeleton(): JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
      <div className="min-w-0 space-y-4 border border-hairline bg-card p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The test page's two cards — the question index on the left, the question and
 * its options on the right — in the same `xl` split the page uses.
 *
 * It used to be a single centred `max-w-3xl` column, which is not a layout this
 * page has ever had at any width.
 */
export function TestTakingSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-24" />
      <div className="grid gap-4 xl:grid-cols-[0.3fr_0.7fr]">
        <div className="min-w-0 border border-hairline bg-card">
          <div className="space-y-3 p-4 sm:p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="space-y-2 p-4 pt-0 sm:p-6 sm:pt-0">
            <Skeleton className="h-16 w-full" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </div>

        <div className="min-w-0 border border-hairline bg-card">
          <div className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-20 w-full" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
            <div className="flex justify-between gap-4 pt-2">
              <Skeleton className="h-11 w-28 rounded-[var(--radius)]" />
              <Skeleton className="h-11 w-28 rounded-[var(--radius)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
