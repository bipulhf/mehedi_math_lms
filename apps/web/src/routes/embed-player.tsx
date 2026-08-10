import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { z } from "zod";

import { RouteErrorView } from "@/components/common/route-error";
import { LecturePlayer } from "@/components/media/lecture-player";

/**
 * A chromeless page whose only job is to host `LecturePlayer` full-bleed.
 * The mobile app has no decoder for a YouTube/Vimeo page and no vidstack of
 * its own, so it points a `WebView` at this route instead of duplicating the
 * player — same `src`, same controls, same provider auto-detection the web
 * app already gets for free.
 */

const searchSchema = z.object({
  src: z.string().url(),
  title: z.string().optional()
});

export const Route = createFileRoute("/embed-player")({
  validateSearch: (search) => searchSchema.parse(search),
  component: EmbedPlayerPage,
  errorComponent: RouteErrorView
});

function EmbedPlayerPage(): JSX.Element {
  const { src, title } = Route.useSearch();

  return (
    <div className="h-screen w-screen bg-black">
      <LecturePlayer className="h-full w-full border-none" src={src} title={title ?? ""} />
    </div>
  );
}
