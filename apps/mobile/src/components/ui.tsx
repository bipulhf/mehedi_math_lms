import { pickImageVariant, readImageVariants, resolveProgressChunks } from "@mma/shared";
import { Image } from "expo-image";
import type { JSX, ReactNode } from "react";
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

import { useFormat } from "@/src/lib/locale";
import { colors, fonts, radius, spacing, typography } from "@/src/theme/tokens";

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

/** The screen's h1 — 26px at weight 500 (DESIGN.md §4/§8). */
export function Heading({ children }: { children: ReactNode }): JSX.Element {
  return <Text style={styles.heading}>{children}</Text>;
}

/** A card or section title — 20px at weight 500. */
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

export function Caption({
  children,
  tone = "muted"
}: {
  children: ReactNode;
  tone?: "muted" | "faint" | "error";
}): JSX.Element {
  const toneStyle = tone === "error" ? styles.captionError : tone === "faint" ? styles.captionFaint : null;

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
  tone?: "attention" | "faded" | "neutral" | "quiet";
}): JSX.Element {
  const isNeutral = tone === "neutral";

  return (
    <View
      style={[
        styles.badge,
        isNeutral ? null : styles.badgeBordered,
        tone === "attention" ? styles.badgeAttention : null,
        tone === "faded" ? styles.badgeFaded : null,
        tone === "quiet" ? styles.badgeQuiet : null
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "attention" ? styles.badgeTextAttention : null,
          tone === "faded" ? styles.badgeTextFaded : null,
          tone === "quiet" ? styles.badgeTextQuiet : null
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
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        styles[`buttonSize${size === "default" ? "Default" : size === "lg" ? "Lg" : size === "sm" ? "Sm" : "Xs"}`],
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
          styles[`buttonLabelSize${size === "default" ? "Default" : size === "lg" ? "Lg" : size === "sm" ? "Sm" : "Xs"}`]
        ]}
      >
        {isBusy ? `${label}…` : variant === "accentLink" ? `${label} →` : label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  style,
  ...inputProps
}: TextInputProps & { label: string }): JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {/* `style` is pulled out and merged rather than spread: passing one
          through `inputProps` would replace the base input style entirely, and
          a caller adding a min-height would silently lose the border. */}
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={[styles.input, style]}
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
      source={{ uri: variantUri }}
      style={[styles.cover, { height }]}
      transition={150}
    />
  );
}

/**
 * The chunked progress tracker: accent for what is done, `bar-track` for what
 * is not, square chunks, no thin line. A finished course fills in
 * `line-strong` rather than accent — the design spends accent on what still
 * needs doing.
 */
export function ProgressTrack({
  completed,
  isComplete = false,
  label,
  total
}: {
  completed: number;
  isComplete?: boolean;
  label: string;
  total: number;
}): JSX.Element {
  const chunks = resolveProgressChunks(completed, total);

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: total, min: 0, now: completed }}
      style={styles.trackRow}
    >
      {Array.from({ length: chunks.total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.trackChunk,
            index < chunks.filled ? (isComplete ? styles.trackChunkComplete : styles.trackChunkFilled) : null
          ]}
        />
      ))}
    </View>
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

/**
 * Green when online, muted when not — an explicit exception to DESIGN.md §2's
 * "no red/green/amber status palette", requested for this one affordance.
 */
export function PresenceDot({ isOnline }: { isOnline: boolean }): JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.presenceDot, isOnline ? styles.presenceDotOnline : null]}
    />
  );
}

/**
 * A filter chip: `chip-active` fill and border when selected, a hairline card
 * otherwise. The one shape behind every horizontal filter strip — level,
 * subject, free-only, sort — so each stops keeping its own copy of the style.
 */
export function FilterPill({
  isSelected,
  label,
  onPress
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.filterPill, isSelected ? styles.filterPillActive : null]}
    >
      <Caption>{label}</Caption>
    </Pressable>
  );
}

/**
 * A 2px accent underline on the active tab, muted labels on the rest. The strip
 * scrolls sideways rather than wrapping. DESIGN.md §6.
 */
export function Tabs<TValue extends string>({
  label,
  onChange,
  tabs,
  value
}: {
  label: string;
  onChange: (value: TValue) => void;
  tabs: readonly { isActive: boolean; label: string; value: TValue }[];
  value: TValue;
}): JSX.Element {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={styles.tabs}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={styles.tab}
          >
            <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>{tab.label}</Text>
            <View style={[styles.tabUnderline, isActive ? styles.tabUnderlineActive : null]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * One accordion row. Rows are independent — opening one never closes another,
 * which is why open state is the caller's and not held here. The marker is a
 * text `+` / `–`, not icon motion.
 */
export function AccordionRow({
  children,
  isOpen,
  meta,
  onToggle,
  title
}: {
  children: ReactNode;
  isOpen: boolean;
  meta?: ReactNode;
  onToggle: () => void;
  title: string;
}): JSX.Element {
  return (
    <View style={styles.accordionRow}>
      <Pressable accessibilityState={{ expanded: isOpen }} onPress={onToggle} style={styles.accordionHeader}>
        <Text style={styles.accordionTitle} numberOfLines={2}>
          {title}
        </Text>
        {meta === undefined ? null : <Text style={styles.accordionMeta}>{meta}</Text>}
        <Text style={[styles.accordionMarker, isOpen ? styles.accordionMarkerOpen : null]}>
          {isOpen ? "–" : "+"}
        </Text>
      </Pressable>
      {isOpen ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Someone without an uploaded photo gets their initials on the placeholder
 * fill, not a stock portrait. The fallback is the same quiet grey every
 * missing image uses. DESIGN.md §9.
 */
export function Avatar({
  name,
  photo,
  size = 40
}: {
  name: string;
  photo: string | null;
  size?: number;
}): JSX.Element {
  if (photo !== null && photo.length > 0) {
    const source = readImageVariants(photo);
    const variantUri = pickImageVariant(source, Math.round(size * PixelRatio.get()));

    if (variantUri !== null) {
      return (
        <Image
          source={{ uri: variantUri }}
          style={[styles.avatar, { borderRadius: size / 2, height: size, width: size }]}
        />
      );
    }
  }

  return (
    <View style={[styles.avatar, styles.avatarFallback, { borderRadius: size / 2, height: size, width: size }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials(name)}</Text>
    </View>
  );
}

/** The heading block that opens a section: eyebrow, title, description, action. */
export function SectionHeading({
  action,
  description,
  eyebrow,
  title
}: {
  action?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
}): JSX.Element {
  return (
    <View style={styles.sectionHeading}>
      {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Title>{title}</Title>
      {description === undefined ? null : <Body muted>{description}</Body>}
      {action === undefined ? null : action}
    </View>
  );
}

/** The KPI tile — a muted label over a large number. DESIGN.md §4. */
export function StatCard({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/** A price, formatted for the reader's locale. ৳5,900, grouped the Bangla way. */
export function PriceText({ amount }: { amount: number | string }): JSX.Element {
  const format = useFormat();

  return <Text style={styles.price}>{format.currency(amount)}</Text>;
}

const styles = StyleSheet.create({
  accordionBody: { paddingBottom: spacing.lg, paddingHorizontal: spacing.sm },
  accordionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md
  },
  accordionMarker: { color: colors.muted, fontFamily: fonts.body, fontSize: 22, fontStyle: "italic", width: 20 },
  accordionMarkerOpen: { color: colors.accent },
  accordionMeta: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14 },
  accordionRow: { borderBottomColor: colors.hairline, borderBottomWidth: 1 },
  accordionTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.displaySemiBold,
    fontSize: 17
  },
  avatar: {
    backgroundColor: colors.placeholderFill,
    overflow: "hidden"
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.mutedLight, fontFamily: fonts.displaySemiBold },
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
  badgeText: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.caption.fontSize
  },
  badgeTextAttention: { color: colors.accent },
  badgeTextFaded: { color: colors.mutedFaint },
  badgeTextQuiet: { color: colors.muted },
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
    minHeight: 0,
    paddingHorizontal: 0
  },
  buttonBase: {
    alignItems: "center",
    borderRadius: radius.sm,
    justifyContent: "center"
  },
  buttonDisabled: { opacity: 0.5 },
  buttonGhost: { backgroundColor: "transparent" },
  buttonInk: { backgroundColor: colors.brandCyan },
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
  buttonSizeSm: { minHeight: 40, paddingHorizontal: spacing.lg },
  buttonSizeXs: { minHeight: 32, paddingHorizontal: spacing.md },
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
    padding: spacing.lg,
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
  eyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    color: colors.mutedLight,
    fontFamily: fonts.monoLabel,
    fontSize: 12,
    letterSpacing: 0.72,
    textTransform: "uppercase"
  },
  filterPill: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  filterPillActive: { backgroundColor: colors.chipActive, borderColor: colors.chipActive },
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
  presenceDot: { backgroundColor: colors.dotIdle, borderRadius: radius.full, height: 8, width: 8 },
  presenceDotOnline: { backgroundColor: colors.online },
  price: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: typography.title.fontSize },
  screen: { backgroundColor: colors.background, flex: 1 },
  screenSkeleton: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  sectionHeading: { gap: spacing.sm },
  skeleton: { backgroundColor: colors.placeholderFill, borderRadius: radius.sm },
  statCard: { borderColor: colors.hairline, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  statLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  statValue: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 26 },
  tab: { alignItems: "center", gap: 0 },
  tabLabel: {
    color: colors.muted,
    fontFamily: fonts.displaySemiBold,
    fontSize: 16,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md
  },
  tabLabelActive: { color: colors.ink },
  tabUnderline: { backgroundColor: "transparent", height: 2, width: "100%" },
  tabUnderlineActive: { backgroundColor: colors.accent },
  tabs: {
    borderBottomColor: colors.hairline,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xl
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight
  },
  trackChunk: {
    backgroundColor: colors.barTrack,
    flex: 1,
    height: 6,
    // Square chunks with a small gap — the design is explicit that this is not
    // a thin rounded bar. The smallest faint-boundary keeps the chunk from
    // reading as a hairline.
    minWidth: 4
  },
  trackChunkComplete: { backgroundColor: colors.lineStrong },
  trackChunkFilled: { backgroundColor: colors.accent },
  trackRow: { flexDirection: "row", gap: 3 }
});
