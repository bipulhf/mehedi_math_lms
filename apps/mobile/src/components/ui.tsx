import { pickImageVariant, readImageVariants } from "@mma/shared";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
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

export function GroupedSection({
  children,
  style,
  title
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
}): JSX.Element {
  return (
    <View style={[styles.groupedSection, style]}>
      {title ? <Text style={styles.groupedTitle}>{title}</Text> : null}
      <View style={styles.groupedCard}>{children}</View>
    </View>
  );
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
      onPress={() => {
        if (variant === "ink" || variant === "accent") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          void Haptics.selectionAsync();
        }
        onPress();
      }}
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
  bleed = false,
  height = 180,
  uri
}: {
  bleed?: boolean;
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
    return <View style={[styles.coverFallback, bleed ? styles.coverBleed : null, { height }]} />;
  }

  return (
    <Image
      contentFit="cover"
      // expo-image, not RN Image: it caches to disk, which is what makes the
      // catalogue usable on a second launch without a network.
      accessibilityLabel=""
      accessibilityRole="image"
      source={{ uri: variantUri }}
      style={[styles.cover, bleed ? styles.coverBleed : null, { height }]}
    />
  );
}

/**
 * A failure the user can read. Native banner: tinted red fill, rounded, with
 * an icon — not a hairline card with red text on transparent.
 */
export function ErrorNotice({ message }: { message: string }): JSX.Element {
  return (
    <View accessibilityRole="alert" style={styles.errorNotice}>
      <Ionicons color={colors.error} name="warning" size={18} />
      <Text style={styles.errorNoticeText}>{message}</Text>
    </View>
  );
}

/** Native empty state: centered icon + message, no dashed border. */
export function EmptyState({
  action,
  icon = "tray",
  message,
  title
}: {
  action?: ReactNode;
  icon?: "tray" | "book.closed" | "bubble.left" | "magnifyingglass";
  message: string;
  title?: string;
}): JSX.Element {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    book: "book",
    "book.closed": "book",
    bubble: "chatbubble-ellipses",
    "bubble.left": "chatbubble",
    magnifyingglass: "search",
    tray: "cube"
  };

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons color={colors.mutedFaint} name={iconMap[icon] ?? "cube"} size={28} />
      </View>
      {title === undefined ? null : <Text style={styles.emptyTitle}>{title}</Text>}
      <Text style={styles.emptyMessage}>{message}</Text>
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
    paddingVertical: 5
  },
  badgeAttention: { backgroundColor: colors.card },
  badgeBordered: { borderColor: colors.hairline, borderWidth: 0.5 },
  badgeFaded: { backgroundColor: colors.card },
  badgeQuiet: { backgroundColor: colors.card },
  badgeSuccess: { backgroundColor: colors.card, borderColor: colors.success, borderWidth: 0.5 },
  badgeText: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: 12,
    letterSpacing: 0.2
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
    borderRadius: 14,
    justifyContent: "center"
  },
  buttonDisabled: { opacity: 0.45 },
  buttonGhost: { backgroundColor: "transparent" },
  buttonInk: { backgroundColor: colors.accent },
  buttonLabel: { color: colors.onAccent, fontFamily: fonts.displaySemiBold, letterSpacing: 0.15 },
  buttonLabelAccentLink: { color: colors.accent },
  buttonLabelGhost: { color: colors.muted },
  buttonLabelInk: { color: colors.ink },
  buttonLabelOnSurface: { color: colors.paper },
  buttonLabelSizeDefault: { fontSize: 15 },
  buttonLabelSizeLg: { fontSize: 16 },
  buttonLabelSizeSm: { fontSize: 14 },
  buttonLabelSizeXs: { fontSize: 12 },
  buttonOutline: {
    backgroundColor: "transparent",
    borderColor: colors.lineStrong,
    borderWidth: 1
  },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  buttonSizeDefault: { minHeight: 52, paddingHorizontal: spacing.xl },
  buttonSizeLg: { minHeight: 56, paddingHorizontal: spacing.xl },
  buttonSizeSm: { minHeight: 44, paddingHorizontal: spacing.lg },
  buttonSizeXs: { minHeight: 36, paddingHorizontal: spacing.md },
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
    borderColor: colors.hairlineFaint,
    borderRadius: radius.square,
    borderWidth: 0.5,
    overflow: "hidden",
    padding: spacing.lg
  },
  cover: { borderRadius: 10, overflow: "hidden", width: "100%" },
  coverBleed: { borderRadius: 0 },
  coverFallback: {
    backgroundColor: colors.placeholderFill,
    borderRadius: 10,
    width: "100%"
  },
  emptyAction: { paddingTop: spacing.md },
  emptyIconWrap: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderRadius: radius.full,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  emptyMessage: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, textAlign: "center" },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.hairlineFaint,
    borderRadius: radius.square,
    borderWidth: 0.5,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl
  },
  emptyTitle: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 17, textAlign: "center" },
  errorNotice: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 12,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  errorNoticeText: {
    color: colors.error,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    color: colors.mutedLight,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.72,
    textTransform: "uppercase"
  },
  groupedCard: {
    backgroundColor: colors.card,
    borderColor: colors.hairlineFaint,
    borderRadius: radius.square,
    borderWidth: 0.5,
    overflow: "hidden"
  },
  groupedSection: { gap: spacing.sm },
  groupedTitle: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    paddingHorizontal: spacing.sm,
    textTransform: "uppercase"
  },
  heading: {
    color: colors.ink,
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34
  },
  input: {
    backgroundColor: colors.input,
    borderColor: colors.hairline,
    borderRadius: 12,
    borderWidth: 0.5,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  inputFocused: { borderColor: colors.accent, borderWidth: 1.2 },
  screen: { backgroundColor: colors.background, flex: 1 },
  screenSkeleton: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  skeleton: { backgroundColor: colors.placeholderFill, borderRadius: 10 },
  title: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight
  }
});
