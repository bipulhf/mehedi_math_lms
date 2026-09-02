import { useEvent } from "expo";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { VideoControls } from "@/src/components/lecture-player-controls";
import { Caption, ErrorNotice } from "@/src/components/ui";
import { mobileEnv } from "@/src/lib/env";
import { resolveLectureVideo } from "@/src/lib/lecture-video";
import { useT } from "@/src/lib/locale";
import { colors, radius } from "@/src/theme/tokens";

/**
 * Lecture playback. `expo-video` plays a media file directly; a YouTube/Vimeo
 * page goes through the web app's vidstack player in a `WebView` instead, but
 * inline here, never a separate browser tab. `lecture-video.ts` decides which
 * of the two a lecture is.
 */

/**
 * How much of a lecture counts as watched. Not 100%: credits, an outro, or a
 * player that stops a beat short would otherwise leave a lecture the student
 * finished sitting at incomplete forever.
 */
const WATCHED_FRACTION = 0.95;

/** Controls hide after this long once playing and untouched. */
const CONTROLS_HIDE_DELAY_MS = 3000;

function StreamPlayer({
  isCompleted,
  onWatched,
  uri
}: {
  isCompleted: boolean;
  onWatched: () => void;
  uri: string;
}): JSX.Element {
  const t = useT();
  const [hasFailed, setHasFailed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Bumped on every scrub/press so the auto-hide effect below restarts its
  // timer even when `controlsVisible` was already true.
  const [activityTick, setActivityTick] = useState(0);
  // Ref rather than state: this fires from a player event once a second, and
  // the screen has no reason to re-render for it.
  const hasReportedRef = useRef(isCompleted);
  const onWatchedRef = useRef(onWatched);
  const videoViewRef = useRef<VideoView>(null);

  onWatchedRef.current = onWatched;

  const player = useVideoPlayer(uri, (instance: VideoPlayer) => {
    instance.timeUpdateEventInterval = 1;
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });

  useEffect(() => {
    hasReportedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    const timeUpdate = player.addListener("timeUpdate", (payload) => {
      const { currentTime: playedSeconds } = payload;
      const { duration: totalSeconds } = player;

      setCurrentTime(playedSeconds);
      setDuration(totalSeconds);

      if (hasReportedRef.current || totalSeconds <= 0) {
        return;
      }

      if (playedSeconds / totalSeconds >= WATCHED_FRACTION) {
        // Latched locally as well as on the server, so a second event a
        // second later does not fire a second mutation. ADR-0005.
        hasReportedRef.current = true;
        onWatchedRef.current();
      }
    });
    const statusChange = player.addListener("statusChange", ({ error, status }) => {
      setHasFailed(status === "error" || error !== undefined);
    });

    return () => {
      timeUpdate.remove();
      statusChange.remove();
    };
  }, [player]);

  // Controls stay up while paused or while the user is actively scrubbing
  // (each scrub tick bumps `activityTick`); they hide themselves once
  // playback has run untouched for a few seconds.
  useEffect(() => {
    if (!controlsVisible || !isPlaying) {
      return undefined;
    }

    const id = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY_MS);

    return () => clearTimeout(id);
  }, [controlsVisible, isPlaying, activityTick]);

  const bumpActivity = useCallback(() => setActivityTick((tick) => tick + 1), []);

  const handleToggleStage = useCallback(() => {
    setControlsVisible((visible) => !visible);
    bumpActivity();
  }, [bumpActivity]);

  const handleTogglePlay = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }

    setControlsVisible(true);
    bumpActivity();
  }, [bumpActivity, player]);

  const handleScrubEnd = useCallback(
    (seconds: number) => {
      player.currentTime = seconds;
      setCurrentTime(seconds);
      bumpActivity();
    },
    [bumpActivity, player]
  );

  const handleFullscreen = useCallback(() => {
    void videoViewRef.current?.enterFullscreen();
  }, []);

  // Opening a lecture is opening it to watch, not to preview at postcard
  // size — fullscreen (and the landscape rotation that comes with it) starts
  // immediately rather than waiting for a tap on the button above. A native
  // call, not a DOM Fullscreen API request, so it isn't subject to the
  // browser rule that fullscreen needs a user gesture.
  useEffect(() => {
    const openFullscreen = async (): Promise<void> => {
      try {
        await videoViewRef.current?.enterFullscreen();
      } catch {
        // Silent: an auto-attempt failing (view not ready yet, platform
        // declines it) should fall back to the inline player, not surface an
        // error for something the student never asked for directly.
      }
    };

    void openFullscreen();
  }, []);

  if (hasFailed) {
    return <ErrorNotice message={t("player.videoBroken")} />;
  }

  return (
    <View style={styles.stage}>
      <VideoView
        allowsPictureInPicture
        contentFit="contain"
        // The app itself is portrait-locked (`app.json`), so fullscreen is the
        // only way a lecture is watchable at any size. `landscape` asks for the
        // rotation that lock would otherwise prevent. Native controls take
        // over in fullscreen regardless of `nativeControls` below — the only
        // way off the platform gives it.
        fullscreenOptions={{ enable: true, orientation: "landscape" }}
        nativeControls={false}
        player={player}
        ref={videoViewRef}
        style={styles.video}
      />
      <Pressable onPress={handleToggleStage} style={StyleSheet.absoluteFill} />
      {controlsVisible ? (
        <VideoControls
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onFullscreen={handleFullscreen}
          onScrub={bumpActivity}
          onScrubEnd={handleScrubEnd}
          onTogglePlay={handleTogglePlay}
        />
      ) : null}
    </View>
  );
}

/**
 * A YouTube/Vimeo lecture. `expo-video` has no decoder for a provider page,
 * and the app bundles no vidstack of its own, so this points a `WebView` at
 * the web app's `/embed-player` route — the exact same `LecturePlayer`
 * (vidstack) the web client uses, with the same provider auto-detection, same
 * controls. `player.watched` (the manual button in the parent screen) is how
 * these lectures get marked complete; there is no progress event to hook.
 */
function buildEmbedPlayerUrl(videoUrl: string, title: string): string {
  const params = new URLSearchParams({ src: videoUrl, title });

  return `${mobileEnv.webOrigin}/embed-player?${params.toString()}`;
}

function EmbedPlayer({ title, videoUrl }: { title: string; videoUrl: string }): JSX.Element {
  return (
    <View style={styles.stage}>
      <WebView
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        source={{ uri: buildEmbedPlayerUrl(videoUrl, title) }}
        style={styles.video}
      />
    </View>
  );
}

export function LecturePlayer({
  isCompleted,
  onWatched,
  title,
  videoUrl
}: {
  isCompleted: boolean;
  onWatched: () => void;
  title: string;
  videoUrl: string | null;
}): JSX.Element {
  const t = useT();
  const source = resolveLectureVideo(videoUrl);

  if (source === null) {
    return <Caption>{t("player.noVideo")}</Caption>;
  }

  if (source.kind === "embed") {
    return <EmbedPlayer title={title} videoUrl={source.url} />;
  }

  return <StreamPlayer isCompleted={isCompleted} onWatched={onWatched} uri={source.uri} />;
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    overflow: "hidden"
  },
  video: { aspectRatio: 16 / 9, width: "100%" }
});
