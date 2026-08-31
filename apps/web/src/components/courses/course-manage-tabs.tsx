import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import type { MessageKey } from "@mma/i18n";

import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type ManageTab = "analytics" | "content" | "discussions" | "info" | "notices" | "routine";

interface TabDefinition {
  readonly labelKey: MessageKey;
  readonly tab: ManageTab;
  readonly to: string;
}

/**
 * What a teacher does with a course *after* it exists — as distinct from the
 * build wizard in `CourseBuilderSteps`, which is numbered because its order
 * matters. These are places, not steps, so they carry no numerals.
 */
const tabs: readonly TabDefinition[] = [
  { labelKey: "builder.stepInfo", tab: "info", to: "/dashboard/courses/$id/edit" },
  { labelKey: "builder.stepContent", tab: "content", to: "/dashboard/courses/$id/content" },
  { labelKey: "manage.routine", tab: "routine", to: "/dashboard/courses/$id/routine" },
  { labelKey: "manage.notices", tab: "notices", to: "/dashboard/courses/$id/notices" },
  { labelKey: "manage.discussions", tab: "discussions", to: "/dashboard/courses/$id/discussions" },
  { labelKey: "manage.analytics", tab: "analytics", to: "/dashboard/courses/$id/analytics" }
];

export function CourseManageTabs({
  courseId,
  current
}: {
  courseId: string;
  current: ManageTab;
}): JSX.Element {
  const t = useT();

  return (
    <nav className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto border-b border-hairline px-4 sm:mx-0 sm:px-0">
      {tabs.map((definition) => (
        <Link
          className={cn(
            "shrink-0 border-b-2 pb-3 pt-1 text-base transition-colors",
            definition.tab === current
              ? "border-accent text-ink"
              : "border-transparent text-muted hover:text-ink"
          )}
          key={definition.tab}
          params={{ id: courseId }}
          to={definition.to}
        >
          {t(definition.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
