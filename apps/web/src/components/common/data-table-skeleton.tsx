import type { JSX } from "react";

import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSkeletonProps {
  columns?: number;
  rows?: number;
}

/**
 * The placeholder for `DataTable`, and it has to break at the same point the
 * table does.
 *
 * `DataTable` stops being a table below `md` and becomes one card per row. A
 * skeleton that keeps drawing five equal columns there promises a table the
 * phone never gets, and squeezes five placeholder cells into 360px on the way.
 * The two shapes below mirror the two the table itself renders.
 */
export function DataTableSkeleton({
  columns = 5,
  rows = 5
}: DataTableSkeletonProps): JSX.Element {
  const columnTemplate = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  return (
    <>
      <div className="hidden border border-hairline bg-card md:block">
        <div className="grid gap-3 border-b border-hairline bg-panel-warm/40 px-4 py-2.5" style={columnTemplate}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} className="h-3 w-3/5" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-3 border-b border-hairline-fainter px-4 py-3.5 last:border-b-0"
            style={columnTemplate}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton key={`cell-${rowIndex}-${columnIndex}`} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`card-${rowIndex}`} className="border border-hairline bg-card p-4">
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <div
                className="flex items-center justify-between gap-4 py-1.5"
                key={`card-${rowIndex}-${columnIndex}`}
              >
                <Skeleton className="h-3 w-20 shrink-0" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
