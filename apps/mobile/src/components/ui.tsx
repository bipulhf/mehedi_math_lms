import { Image } from "expo-image";
import type { JSX, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";

import { colors, radius, shadow, spacing, typography } from "@/src/theme/tokens";

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
 * The one place a spinner is allowed: a full-screen boot, where there is no
 * layout to draw a skeleton of yet.
 */
export function BootIndicator(): JSX.Element {
  return (
    <View style={styles.boot}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

/** Skeleton block. Every list and detail screen builds its own shape from these. */
export function SkeletonBlock({
  height,
  style,
  width
}: {
  height: number;
  style?: StyleProp<ViewStyle>;
  width?: number | `${number}%`;
}): JSX.Element {
  return <View style={[styles.skeleton, { height, width: width ?? "100%" }, style]} />;
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
    fontSize: typography.caption.fontSize,
    fontWeight: "700"
  },
  badgeWarning: { backgroundColor: "#ffe6bf" },
  body: {
    color: colors.onSurface,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  bodyMuted: { color: colors.onSurfaceVariant },
  boot: { alignItems: "center", flex: 1, justifyContent: "center" },
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
  buttonLabel: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  buttonLabelOnSurface: { color: colors.onSurface },
  buttonOutline: {
    backgroundColor: "transparent",
    borderColor: colors.outlineVariant,
    borderWidth: 1
  },
  buttonPressed: { opacity: 0.85 },
  caption: { color: colors.onSurfaceVariant, fontSize: typography.caption.fontSize },
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
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  heading: { color: colors.onSurface, fontSize: typography.display.fontSize, fontWeight: "800" },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.onSurface,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  skeleton: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md },
  title: { color: colors.onSurface, fontSize: typography.title.fontSize, fontWeight: "700" }
});
