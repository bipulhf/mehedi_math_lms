import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import type { MessageKey } from "@genex/i18n";

import { useFormat, useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type BuilderStep = "info" | "content" | "tests" | "publish";

interface StepDefinition {
  readonly labelKey: MessageKey;
  readonly step: BuilderStep;
  readonly to: string;
}

/**
 * Four steps, not the design's five. Its "কোর্সের তথ্য" and "দাম ও ব্যাচ" are
 * separate screens because the second holds a discount, a seat count and a
 * batch date — none of which exist here (GENEX_MIGRATION.md §2). What is left
 * of the pricing step is one price field, which belongs on the details form.
 *
 * The steps are routes rather than local state: each already existed as its own
 * page with its own saving, and turning four working forms into one component's
 * state would have risked the whole authoring flow to gain nothing the user can
 * see.
 */
const steps: readonly StepDefinition[] = [
  { labelKey: "builder.stepInfo", step: "info", to: "/dashboard/courses/$id/edit" },
  { labelKey: "builder.stepContent", step: "content", to: "/dashboard/courses/$id/content" },
  { labelKey: "builder.stepTests", step: "tests", to: "/dashboard/courses/$id/tests" },
  { labelKey: "builder.stepPublish", step: "publish", to: "/dashboard/courses/$id/publish" }
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
