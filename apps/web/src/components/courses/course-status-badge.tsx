import type { JSX } from "react";

import { Badge } from "@/components/ui/badge";
import type { CourseSummary } from "@/lib/api/courses";
import { useT } from "@/lib/i18n/locale-context";

type Status = CourseSummary["status"];

/**
 * PENDING is the only status waiting on someone, so it is the only one that
 * gets the accent. DESIGN.md §2 — a published course is not a problem and
 * should not be coloured like one.
 */
function statusTone(status: Status): "attention" | "faded" | "neutral" | "quiet" {
  if (status === "PENDING") {
    return "attention";
  }

  if (status === "PUBLISHED") {
    return "neutral";
  }

  if (status === "ARCHIVED") {
    return "faded";
  }

  return "quiet";
}

const labelKeys = {
  ARCHIVED: "status.archived",
  DRAFT: "status.draft",
  PENDING: "status.pending",
  PUBLISHED: "status.published"
} as const;

export function CourseStatusBadge({ status }: { status: Status }): JSX.Element {
  const t = useT();

  return <Badge tone={statusTone(status)}>{t(labelKeys[status])}</Badge>;
}
