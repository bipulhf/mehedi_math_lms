import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import type { MessageKey } from "@genex/i18n";

import { useFormat, useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type BuilderStep = "chapters" | "info" | "lectures" | "review";

interface StepDefinition {
  readonly labelKey: MessageKey;
  readonly stage?: "chapters" | "lectures" | undefined;
  readonly step: BuilderStep;
  readonly to: string;
}

const steps: readonly StepDefinition[] = [
  { labelKey: "builder.stepInfo", step: "info", to: "/dashboard/courses/$id/edit" },
  {
    labelKey: "builder.stepContent",
    stage: "chapters",
    step: "chapters",
    to: "/dashboard/courses/$id/content"
  },
  {
    labelKey: "builder.stepTests",
    stage: "lectures",
    step: "lectures",
    to: "/dashboard/courses/$id/content"
  },
  { labelKey: "builder.stepPublish", step: "review", to: "/dashboard/courses/$id/publish" }
];

/**
 * The step strip: an accent ring and an accent underline on the current step,
 * muted labels on the rest. DESIGN.md §6, and the handoff's Course Builder.
 */
export function CourseBuilderSteps({
  courseId,
  current
}: {
  courseId: string;
  current: BuilderStep;
}): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <nav className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto border-b border-hairline px-4 sm:mx-0 sm:px-0">
      {steps.map((definition, index) => {
        const isCurrent = definition.step === current;

        return (
          <Link
            className={cn(
              "flex shrink-0 items-center gap-2.5 border-b-2 pb-3 pt-1 text-base transition-colors",
              isCurrent ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            )}
            key={definition.step}
            params={{ id: courseId }}
            search={definition.stage ? { stage: definition.stage } : {}}
            to={definition.to}
          >
            <span
              className={cn(
                "label-mono inline-flex size-7 items-center justify-center rounded-full border text-xs",
                isCurrent ? "border-accent text-accent" : "border-hairline text-muted-faint"
              )}
            >
              {format.digits(String(index + 1))}
            </span>
            {t(definition.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
