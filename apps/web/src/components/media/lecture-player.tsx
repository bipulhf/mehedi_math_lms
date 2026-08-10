import { lazy, Suspense, type JSX } from "react";

import type { LecturePlayerProps } from "@/components/media/lecture-player-impl";

export type { LectureChapterMarker, LecturePlayerProps } from "@/components/media/lecture-player-impl";

const LecturePlayerImpl = lazy(async () => {
  const module = await import("@/components/media/lecture-player-impl");

  return { default: module.LecturePlayer };
});

export function LecturePlayer(props: LecturePlayerProps): JSX.Element {
  return (
    <Suspense fallback={<div className={props.className ?? "min-h-48 bg-black"} />}>
      <LecturePlayerImpl {...props} />
    </Suspense>
  );
}
