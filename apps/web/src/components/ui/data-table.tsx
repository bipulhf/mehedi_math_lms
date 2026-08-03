import type { JSX, ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export interface DataTableColumn<TRow> {
  /** Right-align numbers and amounts, as the design does. */
  readonly align?: "end" | "start";
  readonly cell: (row: TRow) => ReactNode;
  readonly header: string;
  readonly key: string;
  /**
   * Left out of the stacked mobile card. Use for a column that only repeats
   * something already in the row's title.
   */
  readonly hideWhenStacked?: boolean;
}

export interface DataTableProps<TRow> {
  className?: string | undefined;
  readonly columns: readonly DataTableColumn<TRow>[];
  /** Shown instead of the table when there are no rows. */
  readonly emptyState?: ReactNode;
  readonly rowKey: (row: TRow) => string;
  readonly rows: readonly TRow[];
}

/**
 * The dashboard table: white card, hairline outer border, `hairline-fainter`
 * between rows, muted headers, `row-hover` on hover.
 *
 * Below `md` it stops being a table and becomes one card per row, because the
 * alternative — a table scrolling sideways inside a phone — hides the columns
 * that carry the decision. DESIGN.md §8. The same `columns` array drives both,
 * so the two can never describe different data.
 */
export function DataTable<TRow>({
  className,
  columns,
  emptyState,
  rowKey,
  rows
}: DataTableProps<TRow>): JSX.Element {
  const t = useT();

  if (rows.length === 0) {
    return <>{emptyState ?? <EmptyState className="my-6" message={t("empty.generic")} />}</>;
  }

  return (
    <div className={className}>
      <div className="hidden border border-hairline bg-card md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline">
              {columns.map((column) => (
                <th
                  className={cn(
                    "px-5 py-4 text-sm font-normal text-muted-light",
                    column.align === "end" ? "text-right" : "text-left"
                  )}
                  key={column.key}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-b border-hairline-fainter transition-colors last:border-b-0 hover:bg-row-hover"
                key={rowKey(row)}
              >
                {columns.map((column) => (
                  <td
                    className={cn(
                      "px-5 py-4 align-middle text-base font-light text-ink-muted",
                      column.align === "end" ? "text-right" : "text-left"
                    )}
                    key={column.key}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div className="border border-hairline bg-card p-5" key={rowKey(row)}>
            {columns
              .filter((column) => column.hideWhenStacked !== true)
              .map((column) => (
                <div
                  className="flex items-baseline justify-between gap-4 py-1.5"
                  key={column.key}
                >
                  <span className="text-sm text-muted-light">{column.header}</span>
                  <span className="text-right text-base font-light text-ink-muted">
                    {column.cell(row)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
