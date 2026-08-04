import { Archive } from "lucide-react";
import type { JSX } from "react";

import { useT } from "@/lib/i18n/locale-context";

/**
 * Shown at the top of every teacher-facing course workspace page when the
 * course is ARCHIVED. Purely informational — the API is what actually
 * refuses the write (see ContentService/AssessmentAccessGuards/NoticeService/
 * CourseService's archived checks) — this exists so a teacher understands
 * why a save just failed instead of guessing.
 */
export function ArchivedCourseBanner(): JSX.Element {
  const t = useT();

  return (
    <div className="flex items-start gap-3 border border-hairline bg-panel-warm/60 p-4">
      <Archive className="mt-0.5 size-4 shrink-0 text-muted" />
      <div>
        <p className="text-sm font-medium text-ink">{t("course.archivedBannerTitle")}</p>
        <p className="mt-0.5 text-xs font-light text-muted">{t("course.archivedBannerLead")}</p>
      </div>
    </div>
  );
}
