import type { JSX } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function DataTableSkeleton({
  columns = 5,
  rows = 5
}: DataTableSkeletonProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
        <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low">
          <div
            className="grid gap-3 border-b border-outline-variant px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={`header-${index}`} className="h-4 w-20" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-3 border-b border-outline-variant/60 px-4 py-4 last:border-b-0"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <Skeleton key={`cell-${rowIndex}-${columnIndex}`} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
