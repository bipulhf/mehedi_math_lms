import { Link } from "expo-router";
import type { ComponentProps, JSX, ReactNode } from "react";
import { useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * A pressable that navigates, with a style that actually survives the trip.
 *
 * `Link asChild` renders its child through Radix's `Slot`, which merges the
 * child's style with `{ ...slotStyle, ...childStyle }`
 * (`@radix-ui/react-slot/dist/index.js:136`). Spreading is only meaningful for
 * a plain object, so React Native's two usual forms both lose:
 *
 * - the function form, `({ pressed }) => [...]`, spreads to `{}` and the style
 *   is thrown away in silence — no error, no warning, the child simply never
 *   receives it;
 * - the array form throws outright, but only in development.
 *
 * Four screens had written the function form inside `asChild` and none of them
 * were getting the style they asked for. In the catalogue that meant a grid
 * whose tiles were as wide as their own titles; in the inbox it meant a row
 * with no row layout at all.
 *
 * So the `Pressable` here is handed nothing, the caller's `style` goes on a
 * plain `View` underneath it that `Slot` never touches, and the pressed state
 * is tracked by hand rather than read from the render prop. Reach for this
 * instead of writing `Link asChild` by hand.
 *
 * The catalogue grid does not use it: a tile also has to take a fixed column
 * width and stretch to its row's height, which needs style on the `Pressable`
 * itself — see `TILE_PRESSABLE_STYLE` in `course-grid.tsx`, which is a plain
 * object for exactly this reason.
 */
export function LinkPressable({
  accessibilityLabel,
  children,
  href,
  pressedStyle,
  style
}: {
  accessibilityLabel: string;
  children: ReactNode;
  href: ComponentProps<typeof Link>["href"];
  /** Applied over `style` while the press is down. */
  pressedStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="link"
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <View style={[style, isPressed ? pressedStyle : null]}>{children}</View>
      </Pressable>
    </Link>
  );
}
