import { pickImageVariant, readImageVariants } from "@mma/shared";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { JSX, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  PixelRatio,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, layout, radius, spacing, typography, type TintName } from "@/src/theme/tokens";
import { makeStyles, shadow, useThemeColors } from "@/src/theme/theme";

/**
 * The primitives every screen is built from.
 *
 * The shapes carry the design: cream paper, white plates at 24pt, icons in
 * squircles, buttons as bold 18pt rectangles rather than pills, and one indigo
 * that means "this is the way forward". A screen reaching past these for a raw
 * hex or a right angle is the screen that will look like a web page.
 */

export function Screen({
  children,
  style,
  noHeader = false
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * True on a screen that draws its own top: the four tabs and anything with a
   * `CurvedHeader`, which pads for the status bar itself. Every pushed screen
   * keeps its native header, which already reserves that space.
   */
  noHeader?: boolean;
}): JSX.Element {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, noHeader ? { paddingTop: insets.top } : null, style]}>
      {children}
    </View>
  );
}

/**
 * The plate. `tone` fills it with one of the supporting families instead of
 * white, `flush` drops the padding for a card whose first child is an image,
 * and `flat` drops the lift for a plate that sits inside another one.
 */
export function Card({
  children,
  flat = false,
  flush = false,
  style,
  tone
}: {
  children: ReactNode;
  flat?: boolean;
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: TintName | undefined;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        flush ? styles.cardFlush : null,
        flat ? styles.cardFlat : null,
        tone === undefined ? null : { backgroundColor: colors.tint[tone].bg },
        style
      ]}
    >
      {children}
    </View>
  );
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
  const styles = useStyles();
  return (
    <View style={[styles.groupedSection, style]}>
      {title ? <Text style={styles.groupedTitle}>{title}</Text> : null}
      <View style={styles.groupedCard}>{children}</View>
    </View>
  );
}

/** The screen's h1. */
export function Heading({
  children,
  onPaper = false
}: {
  children: ReactNode;
  /** True inside an indigo block, where the ink is white. */
  onPaper?: boolean;
}): JSX.Element {
  const styles = useStyles();
  return <Text style={[styles.heading, onPaper ? styles.onPaper : null]}>{children}</Text>;
}

/** A card or section title. */
export function Title({
  children,
  numberOfLines
}: {
  children: ReactNode;
  numberOfLines?: number;
}): JSX.Element {
  const styles = useStyles();
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
  const styles = useStyles();
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
  const styles = useStyles();
  const toneStyle =
    tone === "error" ? styles.captionError : tone === "faint" ? styles.captionFaint : null;

  return <Text style={[styles.caption, toneStyle]}>{children}</Text>;
}

/** The small all-caps label that opens a section. */
export function Eyebrow({
  children,
  onPaper = false
}: {
  children: ReactNode;
  onPaper?: boolean;
}): JSX.Element {
  const styles = useStyles();
  return <Text style={[styles.eyebrow, onPaper ? styles.eyebrowOnPaper : null]}>{children}</Text>;
}

type BadgeTone = "attention" | "danger" | "faded" | "info" | "neutral" | "quiet" | "success";

const BADGE_TINT: Record<BadgeTone, TintName | null> = {
  attention: "gold",
  danger: "coral",
  faded: null,
  info: "sky",
  neutral: "brand",
  quiet: null,
  success: "mint"
};

/**
 * A status mark: a small pill with a dot in front of the word. The dot is what
 * makes a row of them scannable — the colour is legible before the label is.
 */
export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: BadgeTone;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const tint = BADGE_TINT[tone];
  const ink = tint === null ? (tone === "faded" ? colors.mutedFaint : colors.muted) : colors.tint[tint].fg;

  return (
    <View
      style={[
        styles.badge,
        tint === null ? styles.badgeQuiet : { backgroundColor: colors.tint[tint].bg }
      ]}
    >
      <View
        style={[
          styles.badgeDot,
          { backgroundColor: tint === null ? colors.dotIdle : colors.tint[tint].solid }
        ]}
      />
      <Text style={[styles.badgeText, { color: ink }]}>{children}</Text>
    </View>
  );
}

type ButtonVariant = "accent" | "accentLink" | "ghost" | "ink" | "outline" | "soft";
type ButtonSize = "lg" | "default" | "sm" | "xs";

const SIZE_KEY: Record<ButtonSize, string> = {
  default: "Default",
  lg: "Lg",
  sm: "Sm",
  xs: "Xs"
};

/**
 * The button is a bold rounded rectangle, not a pill and not a gradient: one
 * flat indigo fill, one shape, at four sizes.
 *
 * `ink` is the primary (indigo), `accent` is the gold one a screen may use
 * exactly once, `soft` is the tinted quiet action, `outline` sits on cream, and
 * `accentLink` is a word with an arrow after it.
 */
export function Button({
  disabled = false,
  icon,
  isBusy = false,
  label,
  onPress,
  size = "default",
  stretch = false,
  variant = "ink"
}: {
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  isBusy?: boolean;
  label: string;
  onPress: () => void;
  size?: ButtonSize;
  stretch?: boolean;
  variant?: ButtonVariant;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const isDisabled = disabled || isBusy;
  const isFilled = variant === "ink" || variant === "accent";
  const labelColor =
    variant === "ink"
      ? colors.onAccent
      : variant === "accent"
        ? colors.tint.gold.fg
        : variant === "soft" || variant === "accentLink"
          ? colors.accent
          : variant === "ghost"
            ? colors.muted
            : colors.ink;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => {
        if (isFilled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          void Haptics.selectionAsync();
        }
        onPress();
      }}
      style={({ pressed }) => [
        styles.buttonBase,
        styles[`buttonSize${SIZE_KEY[size]}` as "buttonSizeDefault"],
        variant === "ink" ? styles.buttonInk : null,
        variant === "accent" ? styles.buttonAccent : null,
        variant === "outline" ? styles.buttonOutline : null,
        variant === "soft" ? styles.buttonSoft : null,
        variant === "ghost" ? styles.buttonGhost : null,
        variant === "accentLink" ? styles.buttonAccentLink : null,
        stretch ? styles.buttonStretch : null,
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null
      ]}
    >
      {icon === undefined ? null : <Ionicons color={labelColor} name={icon} size={17} />}
      <Text
        style={[
          styles.buttonLabel,
          { color: labelColor },
          styles[`buttonLabelSize${SIZE_KEY[size]}` as "buttonLabelSizeDefault"]
        ]}
      >
        {isBusy ? `${label}…` : variant === "accentLink" ? `${label} →` : label}
      </Text>
    </Pressable>
  );
}

/** A squircle icon button: the back key, a close, a bell, a filter. */
export function IconButton({
  accessibilityLabel,
  badge = false,
  icon,
  onPress,
  size = 44,
  tone = "plain"
}: {
  accessibilityLabel: string;
  /** A gold dot in the corner — something is waiting behind this button. */
  badge?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  tone?: "accent" | "onPaper" | "plain" | "soft";
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const ink =
    tone === "accent" ? colors.onAccent : tone === "onPaper" ? colors.paper : tone === "soft" ? colors.accent : colors.ink;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { borderRadius: size / 2.6, height: size, width: size },
        tone === "accent" ? styles.iconButtonAccent : null,
        tone === "soft" ? styles.iconButtonSoft : null,
        tone === "onPaper" ? styles.iconButtonOnPaper : null,
        pressed ? styles.iconButtonPressed : null
      ]}
    >
      <Ionicons color={ink} name={icon} size={Math.round(size * 0.45)} />
      {badge ? <View style={styles.iconButtonBadge} /> : null}
    </Pressable>
  );
}

export function Field({
  accessibilityLabel,
  icon,
  label,
  style,
  ...inputProps
}: TextInputProps & { icon?: keyof typeof Ionicons.glyphMap; label: string }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          inputProps.multiline === true ? styles.inputWrapMultiline : null,
          isFocused ? styles.inputWrapFocused : null
        ]}
      >
        {icon === undefined ? null : (
          <Ionicons color={isFocused ? colors.accent : colors.mutedFaint} name={icon} size={19} />
        )}
        {/* `style` is pulled out and merged rather than spread: passing one
            through `inputProps` would replace the base input style entirely. */}
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
          style={[styles.input, style]}
        />
      </View>
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
  const styles = useStyles();
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

/** A failure the user can read: a coral plate, an icon, the message. */
export function ErrorNotice({ message }: { message: string }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <View accessibilityRole="alert" style={styles.errorNotice}>
      <Ionicons color={colors.error} name="alert-circle" size={20} />
      <Text style={styles.errorNoticeText}>{message}</Text>
    </View>
  );
}

/** The counterpart: something went right and the screen has nothing else to say. */
export function SuccessNotice({ message }: { message: string }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <View accessibilityRole="alert" style={styles.successNotice}>
      <Ionicons color={colors.success} name="checkmark-circle" size={20} />
      <Text style={styles.successNoticeText}>{message}</Text>
    </View>
  );
}

/** Empty state: a big squircle, a line, and the way out of it. */
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
  const styles = useStyles();
  const colors = useThemeColors();
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    book: "book",
    "book.closed": "book",
    bubble: "chatbubble-ellipses",
    "bubble.left": "chatbubble",
    magnifyingglass: "search",
    tray: "sparkles"
  };

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons color={colors.accent} name={iconMap[icon] ?? "sparkles"} size={32} />
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
  /** See `Screen`'s `noHeader` — same reasoning. */
  noHeader?: boolean;
}): JSX.Element {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.screenSkeleton, noHeader ? { paddingTop: insets.top + spacing.lg } : null]}
    >
      <SkeletonBlock height={30} width="45%" />
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
 * A block that breathes. The pulse runs on Reanimated's UI thread, so it keeps
 * time while the JS thread is busy with the very work it stands in for — which
 * is the only moment it is ever on screen.
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
  const styles = useStyles();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[styles.skeleton, { height, width: width ?? "100%" }, animated, style]}
    />
  );
}

/** The bottom padding a scrolling tab screen needs to clear the docked nav bar. */
export const tabScrollInset = layout.tabScrollInset;

const useStyles = makeStyles((colors) => ({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.tint.brand.bg,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  badgeDot: { borderRadius: radius.full, height: 6, width: 6 },
  badgeQuiet: { backgroundColor: colors.panelWarm },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.2,
    lineHeight: 16
  },
  body: {
    color: colors.inkMuted,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  bodyMuted: { color: colors.muted },
  buttonAccent: { backgroundColor: colors.tint.gold.solid },
  buttonAccentLink: {
    alignItems: "center",
    backgroundColor: "transparent",
    minHeight: 32,
    paddingHorizontal: 0
  },
  buttonBase: {
    alignItems: "center",
    borderRadius: radius.tile,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center"
  },
  buttonDisabled: { opacity: 0.42 },
  buttonGhost: { backgroundColor: "transparent" },
  buttonInk: { backgroundColor: colors.accent },
  buttonLabel: { fontFamily: fonts.displayBold, letterSpacing: 0.2 },
  buttonLabelSizeDefault: { fontSize: 16 },
  buttonLabelSizeLg: { fontSize: 17 },
  buttonLabelSizeSm: { fontSize: 15 },
  buttonLabelSizeXs: { fontSize: 13 },
  buttonOutline: {
    backgroundColor: colors.card,
    borderColor: colors.lineStrong,
    borderWidth: 1.5
  },
  buttonPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  buttonSizeDefault: { minHeight: 52, paddingHorizontal: spacing.xl },
  buttonSizeLg: { minHeight: 58, paddingHorizontal: spacing.xl },
  buttonSizeSm: { minHeight: 44, paddingHorizontal: spacing.lg },
  buttonSizeXs: { minHeight: 34, paddingHorizontal: spacing.md },
  buttonSoft: { backgroundColor: colors.accentSoft },
  buttonStretch: { alignSelf: "stretch" },
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
    borderRadius: radius.square,
    overflow: "hidden",
    padding: spacing.lg,
    ...shadow(colors, "card")
  },
  cardFlat: { elevation: 0, shadowOpacity: 0 },
  cardFlush: { padding: 0 },
  cover: { borderRadius: radius.square, overflow: "hidden", width: "100%" },
  coverBleed: { borderRadius: 0 },
  coverFallback: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.square,
    overflow: "hidden",
    width: "100%"
  },
  emptyAction: { paddingTop: spacing.md, width: "100%" },
  emptyIconWrap: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.curve,
    height: 76,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 76
  },
  emptyMessage: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center"
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.curve,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    ...shadow(colors, "card")
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 19,
    textAlign: "center"
  },
  errorNotice: {
    alignItems: "center",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
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
  eyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  eyebrowOnPaper: { color: colors.paper, opacity: 0.82 },
  field: { gap: 6 },
  fieldLabel: {
    color: colors.mutedLight,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  groupedCard: {
    backgroundColor: colors.card,
    borderRadius: radius.square,
    overflow: "hidden",
    ...shadow(colors, "card")
  },
  groupedSection: { gap: spacing.sm },
  groupedTitle: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    paddingHorizontal: spacing.sm,
    textTransform: "uppercase"
  },
  heading: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: typography.display.fontSize,
    lineHeight: typography.display.lineHeight
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    justifyContent: "center",
    ...shadow(colors, "card")
  },
  iconButtonAccent: { backgroundColor: colors.accent, ...shadow(colors, "hero", colors.accent) },
  iconButtonBadge: {
    backgroundColor: colors.tint.gold.solid,
    borderColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 2,
    height: 12,
    position: "absolute",
    right: 6,
    top: 6,
    width: 12
  },
  iconButtonOnPaper: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    elevation: 0,
    shadowOpacity: 0
  },
  iconButtonPressed: { opacity: 0.86, transform: [{ scale: 0.94 }] },
  iconButtonSoft: { backgroundColor: colors.accentSoft, elevation: 0, shadowOpacity: 0 },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 54,
    paddingVertical: spacing.md
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: colors.input,
    borderColor: "transparent",
    borderRadius: radius.tile,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  inputWrapFocused: { backgroundColor: colors.card, borderColor: colors.accent },
  // A textarea's icon and text both belong at the top of the box, not floating
  // in the middle of six lines of it.
  inputWrapMultiline: { alignItems: "flex-start", paddingVertical: spacing.sm },
  onPaper: { color: colors.paper },
  screen: { backgroundColor: colors.background, flex: 1 },
  screenSkeleton: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  skeleton: { backgroundColor: colors.placeholderFill, borderRadius: radius.sm },
  successNotice: {
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  successNoticeText: {
    color: colors.tint.mint.fg,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight
  }
}));
