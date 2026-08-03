import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The router's default 404 is a bare `<p>{t("notfound.title")}</p>`. This is the same page
 * a crawler and a mistyped URL both land on, so it gets the real shell.
 */
export function RouteNotFoundView(): JSX.Element {
  const t = useT();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-hairline/20 bg-chip-active text-ink/60">
        <Compass className="size-8" />
      </div>
      <h1 className="font-body text-3xl font-medium tracking-tight text-ink">{t("notfound.title")}</h1>
      <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-muted">{t("notfound.lead")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/courses">{t("mine.browse")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">{t("notfound.home")}</Link>
        </Button>
      </div>
    </div>
  );
}
