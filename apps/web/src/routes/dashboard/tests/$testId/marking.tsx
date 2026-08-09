import { markingReviewModeSchema, type MarkingReviewMode } from "@mma/shared";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { MarkingWorkspace } from "@/components/marking/marking-workspace";
import { BackButton } from "@/components/ui/back-button";
import { seo } from "@/lib/seo";

const markingModeStorageKey = "mma.marking-mode";

export const Route = createFileRoute("/dashboard/tests/$testId/marking")({
  head: () =>
    seo({
      description: "Mark the papers students handed in.",
      path: "/dashboard/tests",
      title: "Marking"
    }),
  component: MarkingPage,
  errorComponent: RouteErrorView,
  validateSearch: (search: Record<string, unknown>): { mode?: MarkingReviewMode } => {
    const parsed = markingReviewModeSchema.safeParse(search.mode);

    return parsed.success ? { mode: parsed.data } : {};
  }
} as never);

/**
 * The review order lives in the URL so a marking session is linkable and the
 * back button works, and is remembered per teacher because it is a working
 * habit rather than a property of the test.
 */
function MarkingPage(): JSX.Element {
  const { testId } = Route.useParams();
  const search = Route.useSearch() as { mode?: MarkingReviewMode };
  const navigate = useNavigate();
  const mode = search.mode ?? "STUDENT";

  useEffect(() => {
    if (search.mode !== undefined) {
      window.localStorage.setItem(markingModeStorageKey, search.mode);
      return;
    }

    const remembered = markingReviewModeSchema.safeParse(
      window.localStorage.getItem(markingModeStorageKey)
    );

    if (remembered.success && remembered.data !== mode) {
      void navigate({
        params: { testId },
        replace: true,
        search: { mode: remembered.data },
        to: "/dashboard/tests/$testId/marking"
      });
    }
  }, [mode, navigate, search.mode, testId]);

  return (
    <div className="space-y-4">
      <BackButton params={{ testId }} to="/dashboard/tests/$testId/submissions" />
      <MarkingWorkspace
        mode={mode}
        testId={testId}
        onModeChange={(nextMode) => {
          window.localStorage.setItem(markingModeStorageKey, nextMode);
          void navigate({
            params: { testId },
            search: { mode: nextMode },
            to: "/dashboard/tests/$testId/marking"
          });
        }}
      />
    </div>
  );
}
