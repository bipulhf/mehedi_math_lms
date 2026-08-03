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
 * Every one of these mirrors the real layout's grid, spacing and radii, so the
 * swap to content shifts nothing.
 */

export function StatsGridSkeleton({ cards = 4 }: { cards?: number }): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="border border-outline-variant/40 bg-surface-container-lowest/80 p-6"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-9 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={
        className ??
        "border border-hairline bg-card p-6"
      }
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />
      {/* Bars of varying height, so the shape reads as a chart rather than a block. */}
      <div className="mt-8 flex h-56 items-end gap-3">
        {[45, 70, 35, 88, 60, 74, 52, 90, 66, 40, 80, 58].map((height, index) => (
          <Skeleton key={index} className="flex-1 rounded-t-xl" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

export function RecentActivitySkeleton({ rows = 5 }: { rows?: number }): JSX.Element {
  return (
    <div className="border border-outline-variant/40 bg-surface-container-lowest/80 p-8">
      <Skeleton className="h-5 w-40" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourseDetailSkeleton(): JSX.Element {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-8 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        {/* 16:9, matching the real cover, so nothing jumps when it arrives. */}
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-10 w-3/4" />
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
      <aside className="space-y-4">
        <div className="border border-outline-variant/40 bg-surface-container-lowest/80 p-6">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
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
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="border border-outline-variant/20 bg-surface-container-low/40 p-5"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
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
    <div className="flex flex-col gap-4 p-6">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          // Alternating sides, matching the real thread's own/other split.
          className={
            index % 2 === 0
              ? "h-20 w-2/3 rounded-3xl rounded-tl-sm"
              : "ml-auto h-20 w-3/5 rounded-3xl rounded-tr-sm"
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
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          {/* One indented reply, matching the two-level nesting cap. */}
          {index === 0 ? (
            <div className="flex items-start gap-3 border-l border-outline-variant/15 pl-4 md:pl-6">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
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
        <div key={index} className="bg-surface-container-low/50 p-4">
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
          className={index % 3 === 2 ? "pl-8" : undefined}
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
      <div className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest/80 p-8">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TestTakingSkeleton(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="border border-outline-variant/40 bg-surface-container-lowest/80 p-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-6 w-full" />
        <Skeleton className="mt-2 h-6 w-4/5" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
    </div>
  );
}
