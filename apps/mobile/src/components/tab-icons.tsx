import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme/tokens";

/**
 * The four tab icons, drawn with plain views.
 *
 * They were `react-native-svg` until a release build on a handset showed what
 * that costs: switching tabs killed the process outright with
 *
 *     addViewAt: cannot insert view [134] into parent [136]:
 *     View already has a parent: [158]  Parent: ReactViewGroup  View: SvgView
 *     Caused by: The specified child already has a parent.
 *
 * React Navigation re-parents a tab's icon when the focused tab changes, and
 * under Fabric an `SvgView` does not survive being moved — it still belongs to
 * its old parent, `ReactViewGroup.addView` throws, and because the throw lands
 * on the main looper inside the mount dispatcher there is no error boundary
 * above it. A `View` re-parents fine, so the icons are borders and transforms.
 *
 * Unicode glyphs are still not an option — that was the original reason for
 * SVG here, and every Android OEM font drew them differently.
 */

const SIZE = 24;
const STROKE = 1.8;

type IconProps = {
  focused: boolean;
};

function strokeColor(focused: boolean): string {
  return focused ? colors.ink : colors.muted;
}

/** Four rounded squares in a 2x2 grid. */
export function CatalogIcon({ focused }: IconProps): JSX.Element {
  const color = strokeColor(focused);

  return (
    <View style={styles.frame}>
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((cell) => (
          <View key={cell} style={[styles.gridCell, { borderColor: color }]} />
        ))}
      </View>
    </View>
  );
}

/** A ring with a play triangle in it. */
export function LearningIcon({ focused }: IconProps): JSX.Element {
  const color = strokeColor(focused);

  return (
    <View style={styles.frame}>
      <View style={[styles.ring, { borderColor: color }]}>
        <View style={[styles.playTriangle, { borderLeftColor: color }]} />
      </View>
    </View>
  );
}

/**
 * A speech bubble: a rounded box with a tail at the bottom left. The tail is a
 * rotated square whose two outer edges carry the border, so it reads as part
 * of the outline rather than as a separate mark.
 */
export function MessagesIcon({ focused }: IconProps): JSX.Element {
  const color = strokeColor(focused);

  return (
    <View style={styles.frame}>
      <View style={[styles.bubble, { borderColor: color }]} />
      <View style={[styles.bubbleTail, { borderColor: color }]} />
    </View>
  );
}

/** A head over shoulders. */
export function ProfileIcon({ focused }: IconProps): JSX.Element {
  const color = strokeColor(focused);

  return (
    <View style={styles.frame}>
      <View style={[styles.head, { borderColor: color }]} />
      <View style={[styles.shoulders, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 5,
    borderWidth: STROKE,
    height: 14,
    marginBottom: 3,
    width: 18
  },
  bubbleTail: {
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    bottom: 3,
    height: 6,
    left: 5,
    position: "absolute",
    transform: [{ rotate: "-45deg" }],
    width: 6
  },
  frame: {
    alignItems: "center",
    height: SIZE,
    justifyContent: "center",
    width: SIZE
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    height: 19,
    width: 19
  },
  gridCell: {
    borderRadius: 2,
    borderWidth: STROKE,
    height: 8,
    width: 8
  },
  head: {
    borderRadius: 5,
    borderWidth: STROKE,
    height: 9,
    marginBottom: 2,
    width: 9
  },
  playTriangle: {
    borderBottomColor: "transparent",
    borderBottomWidth: 4,
    borderLeftWidth: 7,
    borderTopColor: "transparent",
    borderTopWidth: 4,
    height: 0,
    marginLeft: 3,
    width: 0
  },
  ring: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: STROKE,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  // The bottom edge is left off so the arc reads as shoulders rather than as a
  // closed box under the head.
  shoulders: {
    borderBottomWidth: 0,
    borderLeftWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: STROKE,
    height: 7,
    width: 17
  }
});
