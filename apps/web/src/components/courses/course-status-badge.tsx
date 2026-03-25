import type { JSX } from "react";

import { Badge } from "@/components/ui/badge";
import type { CourseSummary } from "@/lib/api/courses";

function statusTone(
  status: CourseSummary["status"]
): "amber" | "blue" | "gray" | "green" {
  if (status === "PENDING") {
    return "amber";
  }

  if (status === "PUBLISHED") {
    return "green";
  }

  if (status === "ARCHIVED") {
    return "gray";
  }

  return "blue";
}

export function CourseStatusBadge({
  status
}: {
  status: CourseSummary["status"];
}): JSX.Element {
  return <Badge tone={statusTone(status)}>{status}</Badge>;
}
