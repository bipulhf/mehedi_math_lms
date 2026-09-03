import { Image } from "expo-image";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "@/src/theme/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo bundled image asset
const mark = require("@/assets/images/splash-icon.png") as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo bundled image asset
const wordmark = require("@/assets/images/mma-wordmark.png") as number;

/** The wordmark's own proportions, so it scales without being squashed. */
const WORDMARK_ASPECT = 1402 / 122;

/**
 * What the app shows while the fonts are still loading: the same mark the
 * native splash draws, at the same width, with the academy's name under it.
 *
 * The name is a bundled image rather than a `Text`, and deliberately so. This
 * screen exists precisely because the type scale has not resolved yet, and
 * React Native substitutes the system font for an unresolved family without
 * warning -- the name would render in whatever the handset happened to have.
 */
export function BootSplash({ onLayout }: { onLayout?: () => void }): JSX.Element {
  return (
    <View onLayout={onLayout} style={styles.root}>
      <Image contentFit="contain" source={mark} style={styles.mark} />
      <Image contentFit="contain" source={wordmark} style={styles.wordmark} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { height: 200, width: 200 },
  root: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center"
  },
  wordmark: { aspectRatio: WORDMARK_ASPECT, width: 240 }
});
