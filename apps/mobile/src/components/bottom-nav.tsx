import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, layout, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, shadow, useThemeColors } from "@/src/theme/theme";

/**
 * The bar the app is navigated by: docked to the bottom edge, white, with its
 * top corners curved and its shadow cast upward so the page appears to slide
 * under it.
 *
 * Each destination is an icon in a squircle with its name under it. The one you
 * are on has the squircle filled indigo — the same mark the segmented control
 * uses, so "where am I" reads identically everywhere in the app.
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
  /** Messages plus notifications — one number for the merged Inbox tab. */
  unreadInbox: number;
  /** The route names to draw, in the order they should appear. */
  visible: readonly string[];
}

export function BottomNav({
  descriptors,
  navigation,
  state,
  unreadInbox,
  visible
}: BottomNavProps): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
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
        const icon = ICONS[route.name] ?? ICONS.explore;
        const label =
          typeof descriptor?.options.title === "string" ? descriptor.options.title : route.name;

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            key={route.key}
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
            style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
          >
            <View style={[styles.tile, isFocused ? styles.tileActive : null]}>
              <Ionicons
                color={isFocused ? colors.onAccent : colors.mutedLight}
                name={isFocused ? (icon?.active ?? "ellipse") : (icon?.idle ?? "ellipse-outline")}
                size={21}
              />
              {route.name === "inbox" && unreadInbox > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadInbox > 99 ? "99+" : String(unreadInbox)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.label, isFocused ? styles.labelActive : null]}>
              {label}
            </Text>
          </Pressable>
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
    right: -8,
    top: -6
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
  item: { alignItems: "center", flex: 1, gap: 5, paddingBottom: spacing.xs },
  itemPressed: { opacity: 0.75 },
  label: { color: colors.mutedLight, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  labelActive: { color: colors.accent, fontFamily: fonts.displaySemiBold },
  tile: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: radius.md,
    height: 38,
    justifyContent: "center",
    width: 46
  },
  tileActive: { backgroundColor: colors.accent }
}));
