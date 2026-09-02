import { pickImageVariant, readImageVariants } from "@mma/shared";
import { Image } from "expo-image";
import type { JSX, ReactNode } from "react";
import { useState } from "react";
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing, typography } from "@/src/theme/tokens";

/**
 * The primitives every screen is built from. Deliberately small: the web app's
 * variants exist because it has a design-system surface to fill, whereas this
 * app has four shapes -- a card, a button, a field, and a badge.
 */

export function Screen({
  children,
  style,
  noHeader = false
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * True on the four tab screens, which have no navigation header to clear
   * the status bar for them. Every pushed screen keeps its native header,
   * which already reserves that space — adding it there too would double up.
   */
  noHeader?: boolean;
}): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, noHeader ? { paddingTop: insets.top } : null, style]}>
      {children}
    </View>
  );
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

/** The screen's h1 — 26px at weight 500 (DESIGN.md §4/§8). */
export function Heading({ children }: { children: ReactNode }): JSX.Element {
  return <Text style={styles.heading}>{children}</Text>;
}

/** A card or section title — 20px at weight 500. */
export function Title({
  children,
  numberOfLines
}: {
  children: ReactNode;
  numberOfLines?: number;
}): JSX.Element {
  return (
    <Text numberOfLines={numberOfLines} style={styles.title}>
      {children}
    </Text>
  );
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

export function Caption({
  children,
  tone = "muted"
}: {
  children: ReactNode;
  tone?: "muted" | "faint" | "error";
}): JSX.Element {
  const toneStyle =
    tone === "error" ? styles.captionError : tone === "faint" ? styles.captionFaint : null;

  return <Text style={[styles.caption, toneStyle]}>{children}</Text>;
}

/**
 * Status marks, drawn in the muted scale rather than a red/green/amber
 * palette. DESIGN.md §2. The tone names and colours match the web app exactly.
 */
export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "attention" | "faded" | "neutral" | "quiet" | "success";
}): JSX.Element {
  const isNeutral = tone === "neutral";

  return (
    <View
      style={[
        styles.badge,
        isNeutral ? null : styles.badgeBordered,
        tone === "attention" ? styles.badgeAttention : null,
        tone === "faded" ? styles.badgeFaded : null,
        tone === "quiet" ? styles.badgeQuiet : null,
        tone === "success" ? styles.badgeSuccess : null
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "attention" ? styles.badgeTextAttention : null,
          tone === "faded" ? styles.badgeTextFaded : null,
          tone === "quiet" ? styles.badgeTextQuiet : null,
          tone === "success" ? styles.badgeTextSuccess : null
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function Button({
  disabled = false,
  isBusy = false,
  label,
  onPress,
  size = "default",
  variant = "ink"
}: {
  disabled?: boolean;
  isBusy?: boolean;
  label: string;
  onPress: () => void;
  size?: "lg" | "default" | "sm" | "xs";
  variant?: "accent" | "accentLink" | "ghost" | "ink" | "outline";
}): JSX.Element {
  const isDisabled = disabled || isBusy;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        styles[
          `buttonSize${size === "default" ? "Default" : size === "lg" ? "Lg" : size === "sm" ? "Sm" : "Xs"}`
        ],
        variant === "ink" ? styles.buttonInk : null,
        variant === "accent" ? styles.buttonAccent : null,
        variant === "outline" ? styles.buttonOutline : null,
        variant === "ghost" ? styles.buttonGhost : null,
        variant === "accentLink" ? styles.buttonAccentLink : null,
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === "ink" || variant === "accent" ? null : styles.buttonLabelOnSurface,
          variant === "outline" ? styles.buttonLabelInk : null,
          variant === "ghost" ? styles.buttonLabelGhost : null,
          variant === "accentLink" ? styles.buttonLabelAccentLink : null,
          styles[
            `buttonLabelSize${size === "default" ? "Default" : size === "lg" ? "Lg" : size === "sm" ? "Sm" : "Xs"}`
          ]
        ]}
      >
        {isBusy ? `${label}…` : variant === "accentLink" ? `${label} →` : label}
      </Text>
    </Pressable>
  );
}

export function Field({
  accessibilityLabel,
  label,
  style,
  ...inputProps
}: TextInputProps & { label: string }): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {/* `style` is pulled out and merged rather than spread: passing one
          through `inputProps` would replace the base input style entirely, and
          a caller adding a min-height would silently lose the border. */}
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        onBlur={(event) => {
          setIsFocused(false);
          inputProps.onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          inputProps.onFocus?.(event);
        }}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.accent}
        style={[styles.input, isFocused ? styles.inputFocused : null, style]}
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
  const { width } = useWindowDimensions();
  // Device pixels, not layout points: a 390pt-wide phone at 3x needs 1170 real
  // pixels, and asking for 390 would put a blurred image on the best screen.
  const source = uri === null ? null : readImageVariants(uri);
  const variantUri =
    source === null ? null : pickImageVariant(source, Math.round(width * PixelRatio.get()));

  if (variantUri === null) {
    return <View style={[styles.coverFallback, { height }]} />;
  }

  return (
    <Image
      contentFit="cover"
      // expo-image, not RN Image: it caches to disk, which is what makes the
      // catalogue usable on a second launch without a network.
      accessibilityLabel=""
      accessibilityRole="image"
      source={{ uri: variantUri }}
      style={[styles.cover, { height }]}
    />
  );
}

/**
 * A failure the user can read. Distinct from `EmptyState`, which describes a
 * screen with nothing in it. A hairline card with the validation-red text —
 * there is no red surface in the design. DESIGN.md §2.
 */
export function ErrorNotice({ message }: { message: string }): JSX.Element {
  return (
    <View accessibilityRole="alert" style={styles.errorNotice}>
      <Text style={styles.errorNoticeText}>{message}</Text>
    </View>
  );
}

/** A dashed box with one muted sentence and an optional way out. DESIGN.md §6. */
export function EmptyState({
  action,
  message,
  title
}: {
  action?: ReactNode;
  message: string;
  title?: string;
}): JSX.Element {
  return (
    <View style={styles.emptyState}>
      {title === undefined ? null : <Title>{title}</Title>}
      <Text style={[styles.body, styles.emptyMessage]}>{message}</Text>
      {action === undefined ? null : <View style={styles.emptyAction}>{action}</View>}
    </View>
  );
}

/**
 * The shape a screen shows before its session resolves. Even the boot state is
 * a skeleton of the screen that is about to arrive, never a spinner.
 */
export function ScreenSkeleton({
  rows = 3,
  noHeader = false
}: {
  rows?: number;
  /** See `Screen`'s `noHeader` — same reasoning, same four tab screens. */
  noHeader?: boolean;
}): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.screenSkeleton, noHeader ? { paddingTop: insets.top + spacing.lg } : null]}
    >
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
 * A still block, not a shimmer. DESIGN.md §1 forbids animation outright, so
 * there is nothing to sweep across it.
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
  return <View style={[styles.skeleton, { height, width: width ?? "100%" }, style]} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.chipActive,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  badgeAttention: { backgroundColor: colors.card },
  badgeBordered: { borderColor: colors.hairline, borderWidth: 1 },
  badgeFaded: { backgroundColor: colors.card },
  badgeQuiet: { backgroundColor: colors.card },
  badgeSuccess: { backgroundColor: colors.card, borderColor: colors.success, borderWidth: 1 },
  badgeText: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.caption.fontSize
  },
  badgeTextAttention: { color: colors.accent },
  badgeTextFaded: { color: colors.mutedFaint },
  badgeTextQuiet: { color: colors.muted },
  badgeTextSuccess: { color: colors.success },
  body: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  bodyMuted: { color: colors.muted },
  buttonAccent: { backgroundColor: colors.brandOrange },
  buttonAccentLink: {
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 0
  },
  buttonBase: {
    alignItems: "center",
    borderRadius: radius.sm,
    justifyContent: "center"
  },
  buttonDisabled: { opacity: 0.5 },
  buttonGhost: { backgroundColor: "transparent" },
  buttonInk: { backgroundColor: colors.accent },
  buttonLabel: { color: colors.actionForeground, fontFamily: fonts.displaySemiBold },
  buttonLabelAccentLink: { color: colors.accent },
  buttonLabelGhost: { color: colors.muted },
  buttonLabelInk: { color: colors.ink },
  buttonLabelOnSurface: { color: colors.paper },
  buttonLabelSizeDefault: { fontSize: 15 },
  buttonLabelSizeLg: { fontSize: 16 },
  buttonLabelSizeSm: { fontSize: 13 },
  buttonLabelSizeXs: { fontSize: 12 },
  buttonOutline: {
    backgroundColor: "transparent",
    borderColor: colors.lineStrong,
    borderWidth: 1
  },
  buttonPressed: { opacity: 0.85 },
  buttonSizeDefault: { minHeight: 48, paddingHorizontal: spacing.xl },
  buttonSizeLg: { minHeight: 52, paddingHorizontal: spacing.xl },
  buttonSizeSm: { minHeight: 44, paddingHorizontal: spacing.lg },
  buttonSizeXs: { minHeight: 44, paddingHorizontal: spacing.md },
  caption: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight
  },
  captionError: { color: colors.error },
  captionFaint: { color: colors.mutedFaint },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.square,
    borderWidth: 1,
    padding: spacing.lg
  },
  cover: { width: "100%" },
  coverFallback: { backgroundColor: colors.placeholderFill, width: "100%" },
  emptyAction: { paddingTop: spacing.sm },
  emptyMessage: { textAlign: "center" },
  emptyState: {
    alignItems: "center",
    borderColor: colors.dotIdle,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl
  },
  errorNotice: {
    borderColor: colors.hairline,
    borderWidth: 1,
    padding: spacing.lg
  },
  errorNoticeText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    color: colors.mutedLight,
    fontFamily: fonts.monoLabel,
    fontSize: 12,
    letterSpacing: 0.72,
    textTransform: "uppercase"
  },
  heading: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.display.fontSize,
    lineHeight: typography.display.lineHeight
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  inputFocused: { borderColor: colors.accent, borderWidth: 2, paddingHorizontal: spacing.lg - 1 },
  screen: { backgroundColor: colors.background, flex: 1 },
  screenSkeleton: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  skeleton: { backgroundColor: colors.placeholderFill, borderRadius: radius.sm },
  title: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight
  }
});
