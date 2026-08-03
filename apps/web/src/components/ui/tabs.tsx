import type { JSX } from "react";

import { cn } from "@/lib/utils";

export interface TabItem<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
}

export interface TabsProps<TValue extends string> {
  className?: string | undefined;
  /** Names the tab set for assistive technology. */
  label: string;
  onChange: (value: TValue) => void;
  tabs: readonly TabItem<TValue>[];
  value: TValue;
}

/**
 * A 2px accent underline on the active tab, muted labels on the rest.
 * DESIGN.md §6.
 *
 * The strip scrolls sideways rather than wrapping on a narrow screen — a tab
 * bar that reflows to two rows stops reading as one control.
 */
export function Tabs<TValue extends string>({
  className,
  label,
  onChange,
  tabs,
  value
}: TabsProps<TValue>): JSX.Element {
  return (
    <div
      aria-label={label}
      className={cn(
        "no-scrollbar flex items-stretch gap-6 overflow-x-auto border-b border-hairline",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;

        return (
          <button
            aria-selected={isActive}
            className={cn(
              "min-h-11 shrink-0 cursor-pointer border-b-2 px-1 pb-3 text-base transition-colors duration-150",
              "focus-visible:outline-none focus-visible:text-ink",
              isActive
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            )}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
