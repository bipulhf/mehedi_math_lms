import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

interface BackButtonProps {
  readonly className?: string | undefined;
  /** Params for `to`. Only read when there is no history to go back through. */
  readonly params?: Record<string, string> | undefined;
  /**
   * Where to land when the page was opened cold — a shared link, a new tab, a
   * redirect after sign-in. Never used when the reader has somewhere to go back
   * to.
   */
  readonly to: string;
}

/**
 * Goes back the way the reader came.
 *
 * This used to be a link to the page above, which is not the same thing: a
 * teacher who reached a submission from the exams list was sent to the course
 * builder instead, and pressing back again went somewhere else again. `to`
 * survives as the landing place for a page opened with no history behind it.
 */
export function BackButton({ className, params, to }: BackButtonProps): JSX.Element {
  const t = useT();
  const router = useRouter();

  return (
    <Button
      className={className}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => {
        if (router.history.canGoBack()) {
          router.history.back();

          return;
        }

        void router.navigate({ params: params as never, to: to as never });
      }}
    >
      <ArrowLeft className="size-3.5" />
      {t("common.back")}
    </Button>
  );
}
