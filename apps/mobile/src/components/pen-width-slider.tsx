import type { JSX } from "react";
import { useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/src/theme/tokens";

const TRACK_HEIGHT = 3;
const THUMB_SIZE = 12;
const HIT_HEIGHT = 32;
/** The preview dot scales between these two pixel sizes across the slider's range. */
const PREVIEW_MIN_PX = 4;
const PREVIEW_MAX_PX = 18;

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * A continuous drag-to-set slider, the same `PanResponder`-on-a-track
 * technique `SeekBar` uses for video scrubbing — no slider package exists in
 * this app yet, and this one is small enough not to need one. `onChange`
 * fires on every move, not just on release: unlike a video seek, moving this
 * mid-drag has nothing to disrupt.
 */
export function PenWidthSlider({
  accessibilityLabel,
  max,
  min,
  onChange,
  value
}: {
  accessibilityLabel: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}): JSX.Element {
  const trackWidthRef = useRef(0);
  const dragStartFractionRef = useRef(0);
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  const commitFraction = (fraction: number): void => {
    onChange(min + fraction * (max - min));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const fraction =
          trackWidthRef.current > 0
            ? clampFraction(event.nativeEvent.locationX / trackWidthRef.current)
            : 0;

        dragStartFractionRef.current = fraction;
        setDragFraction(fraction);
        commitFraction(fraction);
      },
      onPanResponderMove: (_event, gesture) => {
        if (trackWidthRef.current <= 0) {
          return;
        }

        const fraction = clampFraction(
          dragStartFractionRef.current + gesture.dx / trackWidthRef.current
        );

        setDragFraction(fraction);
        commitFraction(fraction);
      },
      onPanResponderRelease: () => setDragFraction(null),
      onPanResponderTerminate: () => setDragFraction(null),
      onStartShouldSetPanResponder: () => true
    })
  ).current;

  const liveFraction = max > min ? clampFraction((value - min) / (max - min)) : 0;
  const fraction = dragFraction ?? liveFraction;
  const previewSize = PREVIEW_MIN_PX + fraction * (PREVIEW_MAX_PX - PREVIEW_MIN_PX);

  return (
    <View style={styles.row}>
      <View style={[styles.preview, { height: previewSize, width: previewSize }]} />
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="adjustable"
        accessibilityValue={{ max, min, now: value }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { backgroundColor: colors.ink, borderRadius: radius.full },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minWidth: 120 },
  scrubZone: { flex: 1, height: HIT_HEIGHT, justifyContent: "center" },
  thumb: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: THUMB_SIZE,
    marginLeft: -THUMB_SIZE / 2,
    marginTop: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
    position: "absolute",
    width: THUMB_SIZE
  },
  track: {
    backgroundColor: colors.barTrack,
    borderRadius: radius.pill,
    height: TRACK_HEIGHT
  },
  trackFill: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: TRACK_HEIGHT
  }
});
