import type { JSX } from "react";

import { useFormat } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export interface PriceTextProps {
  /** The stored price. `numeric(10, 2)` arrives as a string like "5900.00". */
  amount: number | string;
  className?: string | undefined;
}

/**
 * A price, formatted for the reader's locale — ৳5,900, grouped the Bangla way
 * for a Bangla reader. The taka sign sits tight against the number; `formatCurrency` in
 * `@mma/i18n` is the one place that knows why.
 *
 * There is no struck-through original price: the schema stores one price per
 * course and the discount the design shows has nothing behind it.
 */
export function PriceText({ amount, className }: PriceTextProps): JSX.Element {
  const format = useFormat();

  return <span className={cn("text-ink", className)}>{format.currency(amount)}</span>;
}
