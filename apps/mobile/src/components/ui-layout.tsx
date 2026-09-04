import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { JSX, ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconTile } from "@/src/components/ui-display";
import { fonts, layout, radius, spacing, type TintName } from "@/src/theme/tokens";
import { makeStyles, shadow, useThemeColors } from "@/src/theme/theme";

/**
 * The three structures every screen is assembled from.
 *
 * A screen in this app is not a scrolling document with a title at the top. It
 * is a **curved cobalt header**, a body that **overlaps** into it, and — where
 * there is one decision to make — a **bar docked to the bottom edge**. Get
 * those three right and a screen looks native before a single card is styled.
 */

/**
 * The coloured block at the top of a screen. It pads for the status bar itself,
 * so a screen using one passes `noHeader` to `Screen` and hides the native
 * header.
 *
 * `overlap` reserves the height the first card rises into, so the card can pull
 * itself up by `layout.headerOverlap` without the header growing to meet it.
 */
export function CurvedHeader({
  children,
  overlap = true,
  style
}: {
  children: ReactNode;
  overlap?: boolean;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + spacing.md },
        overlap ? styles.headerOverlap : null,
        style
      ]}
    >
      {children}
    </View>
  );
}

/** The row inside a header: something on the left, a title, something on the right. */
export function HeaderBar({
  left,
  right,
  subtitle,
  title
}: {
  left?: ReactNode;
  right?: ReactNode;
  subtitle?: string;
  title: string;
}): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.headerBar}>
      {left === undefined ? null : <View>{left}</View>}
      <View style={styles.headerBarText}>
        {subtitle === undefined ? null : <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
      </View>
      {right === undefined ? null : <View>{right}</View>}
    </View>
  );
}

/**
 * A row in a grouped list: an icon squircle, a label, an optional second line,
 * and whatever sits on the right — a chevron by default.
 *
 * This one component is the settings list, the exam list, the payment list and
 * the teacher list. They were four different rows before, and the differences
 * were never deliberate.
 */
export function ListRow({
  icon,
  isBusy = false,
  isDestructive = false,
  isLast = false,
  onPress,
  subtitle,
  tint = "brand",
  title,
  trailing
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  isBusy?: boolean;
  isDestructive?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  subtitle?: string;
  tint?: TintName;
  title: string;
  /** Replaces the chevron. A value, a badge, a switch. */
  trailing?: ReactNode;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();

  const content = (
    <>
      <View style={styles.rowLeft}>
        {icon === undefined ? null : <IconTile icon={icon} size={40} tint={tint} />}
        <View style={styles.rowText}>
          <Text
            numberOfLines={1}
            style={[styles.rowTitle, isDestructive ? styles.rowTitleDanger : null]}
          >
            {isBusy ? `${title}…` : title}
          </Text>
          {subtitle === undefined ? null : (
            <Text numberOfLines={1} style={styles.rowSubtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {trailing ?? (
        onPress === undefined ? null : (
          <Ionicons color={colors.mutedFaint} name="chevron-forward" size={17} />
        )
      )}
    </>
  );

  if (onPress === undefined) {
    return <View style={[styles.row, isLast ? null : styles.rowDivider]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy }}
      disabled={isBusy}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        isLast ? null : styles.rowDivider,
        pressed ? styles.rowPressed : null
      ]}
    >
      {content}
    </Pressable>
  );
}

/** The white plate a run of `ListRow`s sits on, with its label above it. */
export function ListGroup({
  children,
  style,
  title
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
}): JSX.Element {
  const styles = useStyles();

  return (
    <View style={[styles.group, style]}>
      {title === undefined ? null : <Text style={styles.groupLabel}>{title}</Text>}
      <View style={styles.groupPlate}>{children}</View>
    </View>
  );
}

/**
 * The bar docked to the bottom edge for a screen with one decision on it: enrol,
 * submit, send. It clears the home indicator itself and casts its shadow
 * upward, which is what separates it from the content scrolling under it.
 */
export function StickyBar({ children }: { children: ReactNode }): JSX.Element {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  group: { gap: spacing.sm },
  groupLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    paddingHorizontal: spacing.xs,
    textTransform: "uppercase"
  },
  groupPlate: {
    backgroundColor: colors.card,
    borderRadius: radius.square,
    overflow: "hidden",
    ...shadow(colors, "card")
  },
  header: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: radius.curve,
    borderBottomRightRadius: radius.curve,
    paddingHorizontal: spacing.lg
  },
  headerBar: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  headerBarText: { flex: 1 },
  headerOverlap: { paddingBottom: layout.headerOverlap + spacing.lg },
  headerSubtitle: {
    color: colors.paper,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    opacity: 0.8,
    textTransform: "uppercase"
  },
  headerTitle: { color: colors.paper, fontFamily: fonts.display, fontSize: 24, lineHeight: 32 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  rowDivider: { borderBottomColor: colors.separator, borderBottomWidth: 1 },
  rowLeft: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md },
  rowPressed: { backgroundColor: colors.rowHover },
  rowSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 16 },
  rowTitleDanger: { color: colors.error },
  sticky: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.curve,
    borderTopRightRadius: radius.curve,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    ...shadow(colors, "float")
  }
}));
