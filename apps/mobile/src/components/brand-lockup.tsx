import { Image } from "expo-image";
import type { JSX } from "react";
import { View } from "react-native";

import { spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo bundled image asset
const mark = require("@/assets/images/mma-mark.png") as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo bundled image asset
const wordmark = require("@/assets/images/mma-wordmark.png") as number;

/** The wordmark's own proportions, so it scales without being squashed. */
const WORDMARK_ASPECT = 1402 / 122;

/**
 * The academy's mark and name, side by side.
 *
 * Two details decide whether this reads or not. The mark is the blue-and-gold
 * artwork, which needs a white plate under it — dropped straight onto cobalt
 * the blue half of it disappears. The wordmark artwork is near-white, drawn for
 * a dark surface, so on cream it has to be tinted to ink; `onColor` is the
 * default because the only place it sits today is inside a cobalt header.
 */
export function BrandLockup({
  onColor = true,
  size = "md"
}: {
  /** False on a cream surface, where the name is tinted to ink. */
  onColor?: boolean;
  size?: "md" | "sm";
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const tile = size === "sm" ? 34 : 42;
  const nameWidth = size === "sm" ? 128 : 152;

  return (
    <View accessibilityLabel="Mehedi's Math Academy" accessibilityRole="image" style={styles.row}>
      <View style={[styles.markPlate, { borderRadius: tile / 2.6, height: tile, width: tile }]}>
        <Image
          contentFit="contain"
          source={mark}
          style={{ height: tile * 0.68, width: tile * 0.68 }}
        />
      </View>
      <Image
        contentFit="contain"
        source={wordmark}
        style={{ aspectRatio: WORDMARK_ASPECT, width: nameWidth }}
        tintColor={onColor ? colors.paper : colors.ink}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  markPlate: {
    alignItems: "center",
    backgroundColor: colors.paper,
    justifyContent: "center"
  },
  row: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm }
}));
