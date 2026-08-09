import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import * as WebBrowser from "expo-web-browser";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Body, Button, Caption, ErrorNotice } from "@/src/components/ui";
import { resolveLectureVideo } from "@/src/lib/lecture-video";
import { useT } from "@/src/lib/locale";
import { colors, radius, spacing } from "@/src/theme/tokens";

/**
 * Lecture playback. A course is mostly video, so the app plays it rather than
 * pointing at the web — but only what it can play; `lecture-video.ts` decides
 * which of the two a lecture is.
 */

/**
 * How much of a lecture counts as watched. Not 100%: credits, an outro, or a
 * player that stops a beat short would otherwise leave a lecture the student
 * finished sitting at incomplete forever.
 */
const WATCHED_FRACTION = 0.95;

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
  // Ref rather than state: this fires from a player event once a second, and
  // the screen has no reason to re-render for it.
  const hasReportedRef = useRef(isCompleted);
  const onWatchedRef = useRef(onWatched);

  onWatchedRef.current = onWatched;

  const player = useVideoPlayer(uri, (instance: VideoPlayer) => {
    instance.timeUpdateEventInterval = 1;
  });

  useEffect(() => {
    hasReportedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    const timeUpdate = player.addListener("timeUpdate", ({ currentTime }) => {
      const { duration } = player;

      if (hasReportedRef.current || duration <= 0) {
        return;
      }

      if (currentTime / duration >= WATCHED_FRACTION) {
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
        // rotation that lock would otherwise prevent.
        fullscreenOptions={{ enable: true, orientation: "landscape" }}
        nativeControls
        player={player}
        style={styles.video}
      />
    </View>
  );
}

export function LecturePlayer({
  isCompleted,
  onWatched,
  videoUrl
}: {
  isCompleted: boolean;
  onWatched: () => void;
  videoUrl: string | null;
}): JSX.Element {
  const t = useT();
  const source = resolveLectureVideo(videoUrl);

  if (source === null) {
    return <Caption>{t("player.noVideo")}</Caption>;
  }

  if (source.kind === "external") {
    return (
      <View style={styles.external}>
        <Body muted>{t("player.externalVideoLead")}</Body>
        <Button
          label={t("player.openVideo")}
          onPress={() => {
            void WebBrowser.openBrowserAsync(source.url);
          }}
          variant="outline"
        />
      </View>
    );
  }

  return <StreamPlayer isCompleted={isCompleted} onWatched={onWatched} uri={source.uri} />;
}

const styles = StyleSheet.create({
  external: { gap: spacing.md },
  stage: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    overflow: "hidden"
  },
  video: { aspectRatio: 16 / 9, width: "100%" }
});
