import { Image } from "expo-image";
import type { JSX, ReactNode } from "react";
import { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";

import { colors, fonts, radius, shadow, spacing, typography } from "@/src/theme/tokens";

/**
 * The primitives every screen is built from. Deliberately small: the web app's
 * variants exist because it has a design-system surface to fill, whereas this
 * app has four shapes -- a card, a button, a field, and a badge.
 */

export function Screen({
  children,
  style
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  style
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Heading({ children }: { children: ReactNode }): JSX.Element {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }): JSX.Element {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({
  children,
  muted = false,
  numberOfLines
}: {
  children: ReactNode;
  muted?: boolean;
  numberOfLines?: number;
}): JSX.Element {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, muted ? styles.bodyMuted : null]}>
      {children}
    </Text>
  );
}

export function Caption({ children }: { children: ReactNode }): JSX.Element {
  return <Text style={styles.caption}>{children}</Text>;
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning";
}): JSX.Element {
  return (
    <View
      style={[
        styles.badge,
        tone === "positive" ? styles.badgePositive : null,
        tone === "warning" ? styles.badgeWarning : null
      ]}
    >
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function Button({
  disabled = false,
  isBusy = false,
  label,
  onPress,
  variant = "primary"
}: {
  disabled?: boolean;
  isBusy?: boolean;
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost";
}): JSX.Element {
  const isDisabled = disabled || isBusy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" ? styles.buttonOutline : null,
        variant === "ghost" ? styles.buttonGhost : null,
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null
      ]}
    >
      <Text
        style={[styles.buttonLabel, variant === "primary" ? null : styles.buttonLabelOnSurface]}
      >
        {isBusy ? `${label}…` : label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  ...inputProps
}: TextInputProps & { label: string }): JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.outline}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

export function CoverImage({
  height = 180,
  uri
}: {
  height?: number;
  uri: string | null;
}): JSX.Element {
  if (!uri) {
    return <View style={[styles.coverFallback, { height }]} />;
  }

  return (
    <Image
      contentFit="cover"
      // expo-image, not RN Image: it caches to disk, which is what makes the
      // catalogue usable on a second launch without a network.
      source={{ uri }}
      style={[styles.cover, { height }]}
      transition={150}
    />
  );
}

export function EmptyState({ message, title }: { message: string; title: string }): JSX.Element {
  return (
    <Card style={styles.emptyState}>
      <Title>{title}</Title>
      <View style={{ height: spacing.sm }} />
      <Body muted>{message}</Body>
    </Card>
  );
}

/**
 * The shape a screen shows before its session resolves. Standards §12 admits
 * no spinners on any data-fetching boundary, web or mobile, so even the boot
 * state is a skeleton of the screen that is about to arrive.
 */
export function ScreenSkeleton({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <View style={styles.screenSkeleton}>
      <SkeletonBlock height={28} width="45%" />
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index}>
          <SkeletonBlock height={18} width="60%" />
          <View style={{ height: spacing.sm }} />
          <SkeletonBlock height={14} />
        </Card>
      ))}
    </View>
  );
}

/**
 * Skeleton block. Every list and detail screen builds its own shape from these.
 *
 * The pulse runs on Reanimated's UI thread, so it keeps its 60fps while the
 * JS thread is busy doing the very work the skeleton is standing in for.
 */
export function SkeletonBlock({
  height,
  style,
  width
}: {
  height: number;
  style?: StyleProp<ViewStyle>;
  width?: number | `${number}%`;
}): JSX.Element {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[styles.skeleton, { height, width: width ?? "100%" }, animatedStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  badgePositive: { backgroundColor: "#d7f0e2" },
  badgeText: {
    color: colors.onSecondaryContainer,
    fontFamily: fonts.displayBold,
    fontSize: typography.caption.fontSize
  },
  badgeWarning: { backgroundColor: "#ffe6bf" },
  body: {
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  bodyMuted: { color: colors.onSurfaceVariant },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.xl
  },
  buttonDisabled: { opacity: 0.5 },
  buttonGhost: { backgroundColor: "transparent" },
  buttonLabel: { color: colors.onPrimary, fontFamily: fonts.displayBold, fontSize: 15 },
  buttonLabelOnSurface: { color: colors.onSurface },
  buttonOutline: {
    backgroundColor: "transparent",
    borderColor: colors.outlineVariant,
    borderWidth: 1
  },
  buttonPressed: { opacity: 0.85 },
  caption: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    ...shadow.card
  },
  cover: { borderRadius: radius.lg, width: "100%" },
  coverFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    width: "100%"
  },
  emptyState: { alignItems: "center", paddingVertical: spacing.xxl },
  field: { gap: spacing.xs },
  fieldLabel: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.caption.fontSize,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  heading: {
    color: colors.onSurface,
    fontFamily: fonts.displayExtraBold,
    fontSize: typography.display.fontSize
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  screenSkeleton: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  skeleton: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.displayBold,
    fontSize: typography.title.fontSize
  }
});
