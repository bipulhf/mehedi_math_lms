import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";

/**
 * The router's default 404 is a bare `<p>Not Found</p>`. This is the same page
 * a crawler and a mistyped URL both land on, so it gets the real shell.
 */
export function RouteNotFoundView(): JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-highest text-on-surface/60 shadow-md">
        <Compass className="size-8" />
      </div>
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
        This page does not exist
      </h1>
      <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-on-surface-variant">
        The link may be out of date, or the course may have been withdrawn from the catalog.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/courses">Browse courses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Back to the homepage</Link>
        </Button>
      </div>
    </div>
  );
}
