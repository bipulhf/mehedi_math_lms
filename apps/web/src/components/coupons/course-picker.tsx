import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { listCourses } from "@/lib/api/courses";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

interface CoursePickerProps {
  /** Admins may aim a coupon at every course; the option is theirs alone. */
  allowEveryCourse: boolean;
  id: string;
  onChange: (value: { id: string | null; title: string | null }) => void;
  /** Teachers see only the courses they own — the same set the API accepts. */
  ownedOnly: boolean;
  /** Kept so an existing coupon opens showing its course, not an empty box. */
  selectedTitle: string | null;
  value: string | null;
}

const RESULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 200;

/**
 * A course picker that searches on the server.
 *
 * A `<select>` was fine with a seeded catalogue and stops being fine at a few
 * hundred courses: the browser cannot filter what was never sent, and one page
 * of results is not the catalogue. This asks the API for matches as the staff
 * member types, so the list is always a page of twenty regardless of how many
 * courses exist.
 */
export function CoursePicker({
  allowEveryCourse,
  id,
  onChange,
  ownedOnly,
  selectedTitle,
  value
}: CoursePickerProps): JSX.Element {
  const t = useT();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Debounced into its own state, so the query key changes at most every 200ms
  // while somebody types — the same rule the message participant search uses.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

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

  const coursesQuery = useQuery({
    enabled: isOpen,
    queryFn: async () =>
      listCourses({
        limit: RESULT_LIMIT,
        ...(ownedOnly ? { mine: true, ownedOnly: true } : {}),
        ...(debouncedSearch.length > 0 ? { search: debouncedSearch } : {})
      }),
    queryKey: queryKeys.courses.list({
      forCoupons: true,
      ownedOnly,
      search: debouncedSearch
    })
  });

  const courses = coursesQuery.data?.data ?? [];
  const options: readonly { id: string | null; title: string }[] = [
    ...(allowEveryCourse && debouncedSearch.length === 0
      ? [{ id: null, title: t("coupon.allCourses") }]
      : []),
    ...courses.map((course) => ({ id: course.id, title: course.title }))
  ];

  const label =
    value === null && !allowEveryCourse
      ? ""
      : (selectedTitle ?? (value === null ? t("coupon.allCourses") : ""));

  const choose = (option: { id: string | null; title: string }): void => {
    onChange({ id: option.id, title: option.id === null ? null : option.title });
    setSearch("");
    setIsOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;

        return Math.min(Math.max(next, 0), Math.max(options.length - 1, 0));
      });

      return;
    }

    if (event.key === "Enter" && isOpen) {
      const option = options[activeIndex];

      if (option) {
        // Enter picks the highlighted course rather than submitting the form
        // around it, which would save a coupon aimed at the wrong thing.
        event.preventDefault();
        choose(option);
      }

      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={isOpen}
          autoComplete="off"
          className="pr-9"
          id={id}
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={label.length > 0 ? label : t("coupon.coursePlaceholder")}
          role="combobox"
          value={isOpen ? search : label}
        />
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-5 size-4 -translate-y-1/2 text-muted-faint"
        />
      </div>

      {isOpen ? (
        <ul
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto border border-hairline bg-card"
          id={listId}
          role="listbox"
        >
          {coursesQuery.isPending ? (
            <li className="px-3 py-2.5 text-sm text-muted-light">{t("common.loading")}</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-light">{t("coupon.courseNoMatch")}</li>
          ) : (
            options.map((option, index) => (
              <li key={option.id ?? "all"}>
                <button
                  aria-selected={option.id === value}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-ink transition-colors",
                    index === activeIndex ? "bg-row-hover" : null
                  )}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  type="button"
                >
                  <span className="truncate">{option.title}</span>
                  {option.id === value ? (
                    <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
