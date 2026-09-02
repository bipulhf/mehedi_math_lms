import { useRouter } from "@tanstack/react-router";
import type { JSX, KeyboardEvent, MouseEvent, ReactNode } from "react";

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
  readonly rowHref?: ((row: TRow) => string) | undefined;
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
  rows,
  rowHref
}: DataTableProps<TRow>): JSX.Element {
  const t = useT();
  const router = useRouter();

  const activateRow = (row: TRow): void => {
    const href = rowHref?.(row);

    if (href) {
      void router.navigate({ to: href as never });
    }
  };

  const handleRowClick = (row: TRow, event: MouseEvent<HTMLElement>): void => {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) {
      return;
    }

    activateRow(row);
  };

  const handleRowKeyDown = (row: TRow, event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    activateRow(row);
  };

  if (rows.length === 0) {
    return <>{emptyState ?? <EmptyState className="my-6" message={t("empty.generic")} />}</>;
  }

  return (
    <div className={className}>
      <div className="hidden border border-hairline bg-card md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-panel-warm">
              {columns.map((column) => (
                <th
                  className={cn(
                    "px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-faint",
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
                className={cn(
                  "border-b border-hairline-fainter transition-colors last:border-b-0 hover:bg-row-hover",
                  rowHref && "cursor-pointer"
                )}
                key={rowKey(row)}
                onClick={rowHref ? (event) => handleRowClick(row, event) : undefined}
                onKeyDown={rowHref ? (event) => handleRowKeyDown(row, event) : undefined}
                role={rowHref ? "link" : undefined}
                tabIndex={rowHref ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    className={cn(
                      "px-4 py-3 align-middle text-sm font-light text-ink-muted",
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
          <div
            className={cn(
              "border border-hairline bg-card p-4",
              rowHref && "cursor-pointer"
            )}
            key={rowKey(row)}
            onClick={rowHref ? (event) => handleRowClick(row, event) : undefined}
            onKeyDown={rowHref ? (event) => handleRowKeyDown(row, event) : undefined}
            role={rowHref ? "link" : undefined}
            tabIndex={rowHref ? 0 : undefined}
          >
            {columns
              .filter((column) => column.hideWhenStacked !== true)
              .map((column) => (
                <div
                  className="flex items-baseline justify-between gap-4 py-1"
                  key={column.key}
                >
                  <span className="text-xs text-muted-light">{column.header}</span>
                  <span className="text-right text-sm font-light text-ink-muted">
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
