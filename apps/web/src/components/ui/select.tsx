import { Check, ChevronDown } from "lucide-react";
import type { JSX, KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { fieldClassName, fieldHeightClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface SelectOption {
  /** A row that shows but cannot be chosen — the "pick one" placeholder. */
  disabled?: boolean | undefined;
  label: string;
  value: string;
}

export interface SelectProps {
  "aria-label"?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  error?: string | undefined;
  id?: string | undefined;
  /** Emits a hidden input so the control still serialises inside a plain form. */
  name?: string | undefined;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  /** Shown when `value` matches no option. */
  placeholder?: string | undefined;
  value: string;
}

/** How long a typeahead run stays open before the next key starts a new one. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * The app's one select — a listbox, not a `<select>`.
 *
 * A native select paints its own popup, and the popup is the one part of a
 * form control the page cannot style: it takes its type, spacing and highlight
 * from the operating system, so every dropdown broke the palette the rest of
 * the form kept. The list is markup here instead, over `bg-popover`.
 *
 * Collapsed-listbox pattern: focus stays on the trigger and the highlighted
 * row is named by `aria-activedescendant`, so one tab stop covers the control
 * the way the native one did.
 */
export function Select({
  "aria-label": ariaLabel,
  className,
  disabled = false,
  error,
  id,
  name,
  onValueChange,
  options,
  placeholder,
  value
}: SelectProps): JSX.Element {
  const generatedId = useId();
  const listId = `${generatedId}-listbox`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const typeaheadRef = useRef<{ buffer: string; resetAt: number }>({ buffer: "", resetAt: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex === -1 ? undefined : options[selectedIndex];

  /** The next selectable row from `from`, walking in `step`; -1 when there is none. */
  const seek = (from: number, step: number): number => {
    for (let index = from; index >= 0 && index < options.length; index += step) {
      if (options[index]?.disabled !== true) {
        return index;
      }
    }

    return -1;
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [isOpen]);

  // A list taller than its box opens scrolled to the top, which hides the row
  // the arrow keys are actually on.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const open = (index: number): void => {
    setActiveIndex(index === -1 ? 0 : index);
    setIsOpen(true);
  };

  const choose = (index: number): void => {
    const option = options[index];

    if (!option || option.disabled === true) {
      return;
    }

    onValueChange(option.value);
    setIsOpen(false);
  };

  const typeahead = (key: string): void => {
    const now = Date.now();
    const state = typeaheadRef.current;
    const buffer = (now > state.resetAt ? "" : state.buffer) + key.toLowerCase();

    typeaheadRef.current = { buffer, resetAt: now + TYPEAHEAD_RESET_MS };

    const match = options.findIndex(
      (option) => option.disabled !== true && option.label.toLowerCase().startsWith(buffer)
    );

    if (match === -1) {
      return;
    }

    setActiveIndex(match);
    setIsOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        open(selectedIndex);

        return;
      }

      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = seek(activeIndex + step, step);

      if (next !== -1) {
        setActiveIndex(next);
      }

      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();

      const next = event.key === "Home" ? seek(0, 1) : seek(options.length - 1, -1);

      if (next !== -1) {
        open(next);
      }

      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      // Enter inside a form would submit it, and space would scroll the page.
      event.preventDefault();

      if (isOpen) {
        choose(activeIndex);
      } else {
        open(selectedIndex);
      }

      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);

      return;
    }

    if (event.key === "Tab" && isOpen) {
      setIsOpen(false);

      return;
    }

    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      typeahead(event.key);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative" ref={containerRef}>
        <button
          aria-activedescendant={isOpen ? `${listId}-${String(activeIndex)}` : undefined}
          aria-controls={listId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={cn(
            fieldClassName(error),
            fieldHeightClassName,
            "flex items-center justify-between gap-2 text-left",
            className
          )}
          disabled={disabled}
          id={id}
          onClick={() => (isOpen ? setIsOpen(false) : open(selectedIndex))}
          onKeyDown={onKeyDown}
          role="combobox"
          type="button"
        >
          <span className={cn("truncate", selected ? null : "text-placeholder")}>
            {selected?.label ?? placeholder ?? ""}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-faint" />
        </button>

        {isOpen ? (
          <ul
            className={cn(
              "absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto py-1",
              "rounded-[var(--radius)] border border-hairline bg-popover"
            )}
            id={listId}
            ref={listRef}
            role="listbox"
          >
            {options.map((option, index) => (
              <li
                aria-disabled={option.disabled === true}
                aria-selected={option.value === value}
                className={cn(
                  "flex items-center justify-between gap-3 px-3.5 py-2 text-sm transition-colors",
                  option.disabled === true ? "text-muted-faint" : "text-ink",
                  index === activeIndex && option.disabled !== true ? "bg-row-hover" : null
                )}
                id={`${listId}-${String(index)}`}
                key={option.value}
                onClick={() => choose(index)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
              >
                <span className="truncate">{option.label}</span>
                {option.value === value ? (
                  <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {name === undefined ? null : <input name={name} type="hidden" value={value} />}
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
