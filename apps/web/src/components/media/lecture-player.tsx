import {
  FullscreenButton,
  MediaPlayer,
  MediaProvider,
  MuteButton,
  PlayButton,
  Poster,
  Time,
  TimeSlider,
  VolumeSlider,
  useMediaState
} from "@vidstack/react";
import { Maximize, Minimize, Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

export interface LecturePlayerProps {
  className?: string;
  onEnded?: () => void;
  poster?: string | null | undefined;
  src: string;
  title: string;
}

const controlButtonClassName =
  "flex size-8 shrink-0 items-center justify-center text-paper transition-colors hover:text-accent";

function PlayerPlayButton(): JSX.Element {
  const paused = useMediaState("paused");

  return (
    <PlayButton aria-label={paused ? "Play" : "Pause"} className={controlButtonClassName}>
      {paused ? <Play className="size-4" fill="currentColor" /> : <Pause className="size-4" fill="currentColor" />}
    </PlayButton>
  );
}

function PlayerMuteButton(): JSX.Element {
  const volume = useMediaState("volume");
  const muted = useMediaState("muted");
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <MuteButton aria-label={muted ? "Unmute" : "Mute"} className={controlButtonClassName}>
      <VolumeIcon className="size-4" />
    </MuteButton>
  );
}

function PlayerFullscreenButton(): JSX.Element {
  const active = useMediaState("fullscreen");

  return (
    <FullscreenButton
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      className={controlButtonClassName}
    >
      {active ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
    </FullscreenButton>
  );
}

function PlayerBufferingSpinner(): JSX.Element | null {
  const waiting = useMediaState("waiting");

  if (!waiting) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-ink/30">
      <span className="size-8 animate-spin rounded-full border-2 border-paper/25 border-t-paper" />
    </div>
  );
}

/**
 * Full-width overlay, not a strip beneath the video -- low-opacity scrim so
 * the frame doesn't grow when controls appear, and it fades out on its own
 * after a few seconds of inactivity (vidstack's built-in idle timer, exposed
 * as `controlsVisible`) rather than staying pinned on screen.
 */
function PlayerControlsBar(): JSX.Element {
  const visible = useMediaState("controlsVisible");

  return (
    <div
      className={cn(
        // z-20: vidstack renders its own click-blocker over iframe providers
        // (youtube/vimeo) at z-index: 1 (.vds-blocker in base.css) to stop the
        // iframe itself from swallowing clicks -- without a higher z-index
        // here, that blocker sits on top of these controls and eats every
        // click and seek-drag before it reaches them.
        "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 bg-ink/55 px-3 py-2.5 backdrop-blur-md",
        "transition-opacity duration-300",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        "sm:px-4"
      )}
    >
      <TimeSlider.Root className="group/slider relative flex h-4 w-full items-center">
        <TimeSlider.Track className="relative h-[3px] w-full bg-paper/25">
          <TimeSlider.Progress className="absolute h-full bg-paper/40" />
          <TimeSlider.TrackFill className="absolute h-full bg-accent" />
        </TimeSlider.Track>
        <TimeSlider.Thumb className="size-2.5 bg-accent opacity-0 transition-opacity group-hover/slider:opacity-100" />
        <TimeSlider.Preview className="flex flex-col items-center opacity-0 transition-opacity group-hover/slider:opacity-100">
          <TimeSlider.Value className="label-mono border border-hairline bg-card px-1.5 py-0.5 text-[0.65rem] text-ink" />
        </TimeSlider.Preview>
      </TimeSlider.Root>

      <div className="flex items-center gap-1">
        <PlayerPlayButton />

        <div className="label-mono flex items-center gap-1 text-[0.7rem] text-paper/70">
          <Time className="tabular-nums" type="current" />
          <span aria-hidden="true">/</span>
          <Time className="tabular-nums" type="duration" />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <PlayerMuteButton />
          <VolumeSlider.Root className="relative hidden h-4 w-16 items-center sm:flex">
            <VolumeSlider.Track className="relative h-[3px] w-full bg-paper/25">
              <VolumeSlider.TrackFill className="absolute h-full bg-paper" />
            </VolumeSlider.Track>
            <VolumeSlider.Thumb className="size-2.5 bg-paper" />
          </VolumeSlider.Root>
        </div>

        <PlayerFullscreenButton />
      </div>
    </div>
  );
}

/**
 * The one video player in the system, wherever a lecture plays -- the
 * student learning view, the public free-lesson preview, and the teacher's
 * authoring preview. Vidstack (vidstack.io) supplies the media engine
 * (native file/HLS playback plus YouTube/Vimeo providers, auto-detected from
 * `src`); every control below is built from its headless primitives and
 * styled to this app's own tokens rather than vidstack's default/plyr theme.
 *
 * DESIGN.md constraints this skin follows: square corners (no rounded video
 * frame or controls), no shadows, colour-only hover transitions, the accent
 * colour reserved for the seek fill and nothing else in the bar, and the
 * Archivo mark (`label-mono`) for the numeral time display.
 */
export function LecturePlayer({
  className,
  onEnded,
  poster,
  src,
  title
}: LecturePlayerProps): JSX.Element {
  return (
    <MediaPlayer
      className={cn("overflow-hidden border border-hairline bg-ink outline-none", className)}
      hideControlsOnMouseLeave
      onEnded={onEnded}
      playsInline
      src={src}
      title={title}
    >
      <MediaProvider>
        {poster ? (
          <Poster alt={title} className="h-full w-full object-cover" src={poster} />
        ) : null}
      </MediaProvider>

      <PlayerBufferingSpinner />
      <PlayerControlsBar />
    </MediaPlayer>
  );
}
