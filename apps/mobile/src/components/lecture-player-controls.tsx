import type { JSX } from "react";
import { useCallback, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Path, Rect, Svg } from "react-native-svg";

import { useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

const ICON_SIZE = 22;
const SCRUB_HIT_HEIGHT = 28;
const BAR_HEIGHT = 3;
const THUMB_SIZE = 12;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const secs = whole % 60;

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function PlayIcon(): JSX.Element {
  const colors = useThemeColors();
  return (
    <Svg height={ICON_SIZE} viewBox="0 0 24 24" width={ICON_SIZE}>
      <Path d="M7 5v14l12-7z" fill={colors.paper} />
    </Svg>
  );
}

function PauseIcon(): JSX.Element {
  const colors = useThemeColors();
  return (
    <Svg height={ICON_SIZE} viewBox="0 0 24 24" width={ICON_SIZE}>
      <Rect fill={colors.paper} height={14} rx={1} width={4} x={6} y={5} />
      <Rect fill={colors.paper} height={14} rx={1} width={4} x={14} y={5} />
    </Svg>
  );
}

function FullscreenIcon(): JSX.Element {
  const colors = useThemeColors();
  return (
    <Svg height={18} viewBox="0 0 24 24" width={18}>
      <Path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        fill="none"
        stroke={colors.paper}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function SeekBar({
  currentTime,
  duration,
  onScrub,
  onScrubEnd
}: {
  currentTime: number;
  duration: number;
  onScrub: () => void;
  onScrubEnd: (seconds: number) => void;
}): JSX.Element {
  const styles = useStyles();
  const trackWidthRef = useRef(0);
  const dragStartFractionRef = useRef(0);
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        onScrub();
        const fraction =
          trackWidthRef.current > 0
            ? clampFraction(event.nativeEvent.locationX / trackWidthRef.current)
            : 0;

        dragStartFractionRef.current = fraction;
        setDragFraction(fraction);
      },
      onPanResponderMove: (_event, gesture) => {
        onScrub();

        if (trackWidthRef.current <= 0) {
          return;
        }

        setDragFraction(
          clampFraction(dragStartFractionRef.current + gesture.dx / trackWidthRef.current)
        );
      },
      onPanResponderRelease: () => {
        setDragFraction((fraction) => {
          if (fraction !== null && duration > 0) {
            onScrubEnd(fraction * duration);
          }

          return null;
        });
      },
      onPanResponderTerminate: () => setDragFraction(null),
      onStartShouldSetPanResponder: () => true
    })
  ).current;

  const liveFraction = duration > 0 ? clampFraction(currentTime / duration) : 0;
  const fraction = dragFraction ?? liveFraction;
  const displaySeconds = dragFraction !== null ? dragFraction * duration : currentTime;

  return (
    <View style={styles.seekRow}>
      <Text style={styles.time}>{formatTime(displaySeconds)}</Text>
      <View
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
        }}
        style={styles.scrubZone}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${fraction * 100}%` }]} />
          <View style={[styles.thumb, { left: `${fraction * 100}%` }]} />
        </View>
      </View>
      <Text style={styles.time}>{formatTime(duration)}</Text>
    </View>
  );
}

export function VideoControls({
  currentTime,
  duration,
  isPlaying,
  onFullscreen,
  onScrub,
  onScrubEnd,
  onTogglePlay
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onFullscreen: () => void;
  onScrub: () => void;
  onScrubEnd: (seconds: number) => void;
  onTogglePlay: () => void;
}): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const handleTogglePlay = useCallback(() => onTogglePlay(), [onTogglePlay]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={styles.center}>
        <Pressable
          accessibilityLabel={isPlaying ? t("player.pause") : t("player.play")}
          accessibilityRole="button"
          hitSlop={spacing.md}
          onPress={handleTogglePlay}
          style={styles.playButton}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Pressable>
      </View>
      <View style={styles.bottomBar}>
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          onScrub={onScrub}
          onScrubEnd={onScrubEnd}
        />
        <Pressable
          accessibilityLabel={t("player.fullscreen")}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={onFullscreen}
          style={styles.fullscreenButton}
        >
          <FullscreenIcon />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  // A scrim under the bar: a white time code over a bright frame of video is
  // unreadable, and the video is the one surface the palette cannot control.
  bottomBar: {
    alignItems: "center",
    backgroundColor: "rgba(13, 13, 13, 0.42)",
    borderRadius: radius.pill,
    bottom: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: "absolute",
    right: spacing.sm
  },
  center: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  fullscreenButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  playButton: {
    alignItems: "center",
    backgroundColor: "rgba(13, 13, 13, 0.55)",
    borderRadius: radius.full,
    height: 60,
    justifyContent: "center",
    width: 60
  },
  scrubZone: {
    flex: 1,
    height: SCRUB_HIT_HEIGHT,
    justifyContent: "center"
  },
  seekRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs
  },
  thumb: {
    backgroundColor: colors.paper,
    borderRadius: radius.full,
    height: THUMB_SIZE,
    marginLeft: -THUMB_SIZE / 2,
    marginTop: -(THUMB_SIZE - BAR_HEIGHT) / 2,
    position: "absolute",
    width: THUMB_SIZE
  },
  time: {
    color: colors.paper,
    fontFamily: fonts.numeric,
    fontSize: 12,
    minWidth: 38,
    textAlign: "center"
  },
  track: {
    backgroundColor: "rgba(255, 255, 255, 0.32)",
    borderRadius: radius.pill,
    height: BAR_HEIGHT,
    overflow: "visible"
  },
  trackFill: {
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    height: BAR_HEIGHT
  }
}));
