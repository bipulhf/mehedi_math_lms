import type { JSX } from "react";

import {
  emptyExamFilters,
  type ExamFilterState,
  type ExamKindFilter,
  type ExamStatusFilter,
  isFiltering
} from "@/components/exams/exam-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterPill } from "@/components/ui/pill";
import { useT } from "@/lib/i18n/locale-context";

/**
 * Search and filters for the exams list.
 *
 * Every filter here reads something the exam list already carries — its kind,
 * its title, whether it is published — so narrowing the list costs no further
 * requests. Draft/published is staff-only because a student is never shown a
 * draft in the first place.
 */
export function ExamFilterBar({
  filters,
  isStudent,
  onChange
}: {
  filters: ExamFilterState;
  isStudent: boolean;
  onChange: (filters: ExamFilterState) => void;
}): JSX.Element {
  const t = useT();

  const kinds: readonly { label: string; value: ExamKindFilter }[] = [
    { label: t("exams.filterAll"), value: "ALL" },
    { label: t("exams.filterMcq"), value: "MCQ" },
    { label: t("exams.filterWritten"), value: "WRITTEN" }
  ];
  const statuses: readonly { label: string; value: ExamStatusFilter }[] = [
    { label: t("exams.filterAll"), value: "ALL" },
    { label: t("exams.filterPublished"), value: "PUBLISHED" },
    { label: t("exams.filterDraft"), value: "DRAFT" }
  ];

  return (
    <div className="space-y-3 border border-hairline bg-card p-4">
      <Input
        placeholder={t("exams.search")}
        type="search"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
      />

      <div className="flex flex-wrap items-center gap-2">
        {kinds.map((kind) => (
          <FilterPill
            isSelected={filters.kind === kind.value}
            key={kind.value}
            onClick={() => onChange({ ...filters, kind: kind.value })}
          >
            {kind.label}
          </FilterPill>
        ))}

        {isStudent ? null : (
          <>
            <span aria-hidden="true" className="h-5 w-px bg-hairline" />
            {statuses.map((status) => (
              <FilterPill
                isSelected={filters.status === status.value}
                key={status.value}
                onClick={() => onChange({ ...filters, status: status.value })}
              >
                {status.label}
              </FilterPill>
            ))}
          </>
        )}

        {isFiltering(filters) ? (
          <Button
            className="ml-auto"
            size="sm"
            variant="ghost"
            onClick={() => onChange(emptyExamFilters)}
          >
            {t("exams.clearFilters")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
