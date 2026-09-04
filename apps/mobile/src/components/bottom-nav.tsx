import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { JSX } from "react";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, layout, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, shadow, useThemeColors } from "@/src/theme/theme";

/**
 * The bar the app is navigated by: docked to the bottom edge, white, with its
 * top corners curved and its shadow cast upward so the page appears to slide
 * under it.
 *
 * Each destination is an icon with its name under it, and the one you are on
 * sits in a **soft indigo capsule** — the wash, not the saturated blue. A
 * solid indigo block is what this used to be, and at the bottom of every screen
 * it was the loudest thing in the app: a filled rectangle competing with the
 * curved header for the same colour and winning. The wash marks the same place
 * without shouting, which is what the rest of the design does everywhere else.
 *
 * The capsule fades and widens over 180ms when the tab changes. That is the
 * only motion here: it says which destination took the tap, and it is over
 * before a screen could have finished rendering, so it never delays anything.
 *
 * **Nothing in here may be an `SvgView`.** React Navigation re-parents a tab's
 * icon when the focused tab changes, and under Fabric an `SvgView` does not
 * survive being moved: the throw lands on the main looper, below every error
 * boundary, and kills the process. Icon fonts and views only.
 */

const ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
> = {
  explore: { active: "compass", idle: "compass-outline" },
  inbox: { active: "chatbubbles", idle: "chatbubbles-outline" },
  index: { active: "home", idle: "home-outline" },
  profile: { active: "person", idle: "person-outline" }
};

export interface BottomNavProps extends BottomTabBarProps {
  /** Unread messages — one number for the Inbox tab. */
  unreadInbox: number;
  /** The route names to draw, in the order they should appear. */
  visible: readonly string[];
}

function NavItem({
  badgeCount,
  icon,
  isFocused,
  label,
  onPress
}: {
  badgeCount: number;
  icon: { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap };
  isFocused: boolean;
  label: string;
  onPress: () => void;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.quad)
    });
  }, [isFocused, progress]);

  // Width, not scale: a scaled capsule would drag its own rounded corners out
  // of round on the way, and the shape is the point of it.
  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.72 + progress.value * 0.28 }]
  }));

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
    >
      <View style={styles.capsuleWrap}>
        <Animated.View style={[styles.capsule, capsuleStyle]} />
        <View style={styles.iconWrap}>
          <Ionicons
            color={isFocused ? colors.accent : colors.mutedLight}
            name={isFocused ? icon.active : icon.idle}
            size={22}
          />
          {badgeCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeCount > 99 ? "99+" : String(badgeCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={1} style={[styles.label, isFocused ? styles.labelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomNav({
  descriptors,
  navigation,
  state,
  unreadInbox,
  visible
}: BottomNavProps): JSX.Element {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const routes = visible
    .map((name) => state.routes.find((route) => route.name === name))
    .filter((route): route is (typeof state.routes)[number] => route !== undefined);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      {routes.map((route) => {
        const descriptor = descriptors[route.key];
        const isFocused = state.routes[state.index]?.key === route.key;
        const icon = ICONS[route.name] ?? ICONS.explore ?? { active: "ellipse", idle: "ellipse-outline" };
        const label =
          typeof descriptor?.options.title === "string" ? descriptor.options.title : route.name;

        return (
          <NavItem
            badgeCount={route.name === "inbox" ? unreadInbox : 0}
            icon={icon}
            isFocused={isFocused}
            key={route.key}
            label={label}
            onPress={() => {
              void Haptics.selectionAsync();

              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: "tabPress"
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  badge: {
    alignItems: "center",
    backgroundColor: colors.tint.coral.solid,
    borderColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 2,
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -12,
    top: -7
  },
  badgeText: { color: colors.paper, fontFamily: fonts.displayBold, fontSize: 10, lineHeight: 14 },
  bar: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.curve,
    borderTopRightRadius: radius.curve,
    bottom: 0,
    flexDirection: "row",
    left: 0,
    minHeight: layout.navBarHeight,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    position: "absolute",
    right: 0,
    ...shadow(colors, "float")
  },
  capsule: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  capsuleWrap: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 64
  },
  iconWrap: { alignItems: "center", justifyContent: "center" },
  item: { alignItems: "center", flex: 1, gap: 5, paddingBottom: spacing.xs },
  itemPressed: { opacity: 0.75 },
  label: { color: colors.mutedLight, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  labelActive: { color: colors.accent, fontFamily: fonts.displaySemiBold }
}));
