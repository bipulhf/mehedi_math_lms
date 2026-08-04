import type { JSX } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { DotRow } from "@/components/ui/dot-row";
import { Input } from "@/components/ui/input";
import { FilterPill } from "@/components/ui/pill";
import type { CategoryNode } from "@/lib/api/categories";
import { useT } from "@/lib/i18n/locale-context";

interface CourseFilterRailProps {
  readonly categories: readonly CategoryNode[];
  readonly isFreeOnly: boolean;
  readonly levelId: string | null;
  readonly onLevelChange: (levelId: string | null) => void;
  readonly onReset: () => void;
  readonly onSearchChange: (search: string) => void;
  readonly onSubjectChange: (subjectId: string | null) => void;
  readonly onToggleFreeOnly: () => void;
  readonly search: string;
  readonly subjectId: string | null;
}

/**
 * The 296px filter rail: search, levels as dot rows, subjects as pills, and a
 * reset.
 *
 * Levels are root categories and subjects are their children — one tree, two
 * axes, per GENEX_MIGRATION.md decision 2. Which subjects are offered therefore
 * depends on the selected level, and selecting "all levels" offers every
 * subject in the tree.
 *
 * On a phone it is an ordinary block above the results rather than a drawer:
 * it is four short controls, and hiding them behind a button would cost a tap
 * to reach what fits on the screen anyway.
 */
export function CourseFilterRail({
  categories,
  isFreeOnly,
  levelId,
  onLevelChange,
  onReset,
  onSearchChange,
  onSubjectChange,
  onToggleFreeOnly,
  search,
  subjectId
}: CourseFilterRailProps): JSX.Element {
  const t = useT();
  const levels = categories.filter((category) => category.parentId === null);
  const selectedLevel = levels.find((level) => level.id === levelId);
  const subjects = selectedLevel
    ? selectedLevel.children
    : levels.flatMap((level) => level.children);

  return (
    <aside className="space-y-9 lg:border-r lg:border-hairline lg:pr-8">
      <div className="space-y-3">
        <Input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("courses.searchPlaceholder")}
          type="search"
          value={search}
        />
      </div>

      <div className="space-y-1">
        <p className="label-mono mb-2 text-xs uppercase text-muted-faint">{t("courses.level")}</p>
        <DotRow
          isSelected={levelId === null}
          label={t("courses.allLevels")}
          onSelect={() => onLevelChange(null)}
        />
        {levels.map((level) => (
          <DotRow
            isSelected={level.id === levelId}
            key={level.id}
            label={level.name}
            onSelect={() => onLevelChange(level.id)}
          />
        ))}
      </div>

      {subjects.length === 0 ? null : (
        <div className="space-y-3">
          <p className="label-mono text-xs uppercase text-muted-faint">{t("courses.subject")}</p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <FilterPill
                isSelected={subject.id === subjectId}
                key={subject.id}
                onClick={() => onSubjectChange(subject.id === subjectId ? null : subject.id)}
              >
                {subject.name}
              </FilterPill>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Checkbox
          checked={isFreeOnly}
          label={t("courses.freeOnly")}
          onChange={onToggleFreeOnly}
        />
      </div>

      <button
        className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-accent hover:text-accent"
        onClick={onReset}
        type="button"
      >
        {t("action.clearFilters")}
      </button>
    </aside>
  );
}
