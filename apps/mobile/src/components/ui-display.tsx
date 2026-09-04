import { pickImageVariant, readImageVariants } from "@mma/shared";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { JSX, ReactNode } from "react";
import { PixelRatio, Pressable, ScrollView, Text, View } from "react-native";
import { Circle, Svg } from "react-native-svg";

import { useFormat } from "@/src/lib/locale";
import { fonts, radius, spacing, typography, type TintName } from "@/src/theme/tokens";
import { makeStyles, shadow, useThemeColors } from "@/src/theme/theme";

/**
 * The composed pieces every screen shares: progress, identity, filters, tiles.
 *
 * Colour carries meaning here rather than decorating it — a family names a
 * subject, a filled track is progress, a green dot is a person who is actually
 * there. Anything that needs a colour asks for a `TintName`, never a hex.
 */

/**
 * A rounded square with an icon in it: the app's most repeated shape.
 *
 * Squircles, not circles. Circles in this design belong to people — an avatar,
 * a presence dot — so a round icon well would read as a face at a glance.
 */
export function IconTile({
  icon,
  size = 44,
  solid = false,
  tint = "brand"
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Filled with the family's saturated colour instead of its wash. */
  solid?: boolean;
  size?: number;
  tint?: TintName;
}): JSX.Element {
  const colors = useThemeColors();
  const family = colors.tint[tint];

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: solid ? family.solid : family.bg,
        borderRadius: size / 2.6,
        height: size,
        justifyContent: "center",
        width: size
      }}
    >
      <Ionicons
        color={solid ? colors.paper : family.fg}
        name={icon}
        size={Math.round(size * 0.46)}
      />
    </View>
  );
}

/**
 * Progress as one continuous bar with a rounded cap.
 *
 * It used to be a row of chunks. A chunked bar reads as a segmented control at
 * small sizes, and on a shelf of six courses that is six controls the student
 * cannot press. The player keeps a chunked tracker, because there a chunk is a
 * named lecture and pressing it is exactly the point.
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
  const styles = useStyles();
  const percent = total <= 0 ? 0 : Math.max(0, Math.min(100, (completed / total) * 100));

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: total, min: 0, now: completed }}
      style={styles.trackRow}
    >
      <View
        style={[
          styles.trackFill,
          isComplete ? styles.trackFillComplete : null,
          { width: `${Math.max(percent, percent > 0 ? 6 : 0)}%` }
        ]}
      />
    </View>
  );
}

/** A percentage as a ring, for a tile with room for one number and no more. */
export function ProgressRing({
  label,
  percent,
  size = 56,
  tint = "brand",
  tone = "onCard"
}: {
  label: string;
  percent: number;
  size?: number;
  tint?: TintName;
  /** `onColor` draws the ring in white over a cobalt block. */
  tone?: "onCard" | "onColor";
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const stroke = size < 48 ? 5 : 7;
  const centre = size / 2;
  const ringRadius = centre - stroke / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const clamped = Math.max(0, Math.min(100, percent));
  const isOnColor = tone === "onColor";

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: clamped }}
      style={{ height: size, width: size }}
    >
      <Svg height={size} width={size}>
        <Circle
          cx={centre}
          cy={centre}
          fill="none"
          r={ringRadius}
          stroke={isOnColor ? "rgba(255,255,255,0.3)" : colors.tint[tint].bg}
          strokeWidth={stroke}
        />
        <Circle
          cx={centre}
          cy={centre}
          fill="none"
          origin={`${centre}, ${centre}`}
          r={ringRadius}
          rotation={-90}
          stroke={isOnColor ? colors.paper : colors.tint[tint].solid}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
      </Svg>
      <View style={styles.ringLabelWrap}>
        <Text
          style={[
            styles.ringLabel,
            isOnColor ? styles.ringLabelOnColor : null,
            { fontSize: size * 0.3 }
          ]}
        >
          {Math.round(clamped)}
        </Text>
      </View>
    </View>
  );
}

export interface StreakDay {
  isToday: boolean;
  /** A single-character weekday initial — the strip is 7 marks wide, not a calendar. */
  label: string;
  studied: boolean;
}

/**
 * The week as seven squircles with the day's letter inside each. A studied day
 * is filled cobalt; today is ringed in gold whether or not it has been earned
 * yet, which is the only nudge this screen makes.
 */
export function StreakTrack({
  days,
  label,
  streakCount
}: {
  days: readonly StreakDay[];
  label: string;
  streakCount: number;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: days.length,
        min: 0,
        now: days.filter((day) => day.studied).length
      }}
    >
      <View style={styles.streakHeader}>
        <View style={styles.streakFlame}>
          <Ionicons color={colors.tint.gold.fg} name="flame" size={19} />
        </View>
        <View style={styles.streakHeaderText}>
          <Text style={styles.streakCount}>{streakCount}</Text>
          <Text style={styles.streakEyebrow}>{label}</Text>
        </View>
      </View>
      <View style={styles.streakRow}>
        {days.map((day, index) => (
          <View
            key={index}
            style={[
              styles.streakDay,
              day.studied ? styles.streakDayFilled : null,
              day.isToday ? styles.streakDayToday : null
            ]}
          >
            <Text style={[styles.streakDayText, day.studied ? styles.streakDayTextFilled : null]}>
              {day.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Green when online, grey when not, with a ring so it reads on any fill. */
export function PresenceDot({ isOnline }: { isOnline: boolean }): JSX.Element {
  const styles = useStyles();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.presenceDot, isOnline ? styles.presenceDotOnline : null]}
    />
  );
}

/** A gold highlighter stroke behind a heading word, the way a student marks a book. */
export function RingedWord({ children }: { children: ReactNode }): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.ringedWordWrap}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={styles.ringedWordStroke}
      />
      {children}
    </View>
  );
}

/** A play glyph in a squircle, for a free lesson or a resume action. */
export function RingedPlay({ tone = "hairline" }: { tone?: "accent" | "hairline" }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const isAccent = tone === "accent";

  return (
    <View style={[styles.ringedPlay, isAccent ? styles.ringedPlayAccent : null]}>
      <Ionicons color={isAccent ? colors.paper : colors.accent} name="play" size={13} />
    </View>
  );
}

/** One shared filter chip for every horizontal filter strip. */
export function FilterPill({
  isSelected,
  label,
  onPress
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}): JSX.Element {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.filterPill,
        isSelected ? styles.filterPillActive : null,
        pressed ? styles.controlPressed : null
      ]}
    >
      <Text style={[styles.filterPillLabel, isSelected ? styles.filterPillLabelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The segmented control: no trough, no box. The options sit on the page and the
 * selected one is a filled cobalt pill — the same mark the nav bar uses for the
 * tab you are on, so "where am I" reads the same everywhere.
 */
export function Tabs<TValue extends string>({
  inset = true,
  label,
  onChange,
  tabs,
  value
}: {
  /** False inside something that already has padding — a card, a header. */
  inset?: boolean;
  label: string;
  onChange: (value: TValue) => void;
  tabs: readonly { isActive: boolean; label: string; value: TValue }[];
  value: TValue;
}): JSX.Element {
  const styles = useStyles();
  const isCompact = tabs.length <= 3;

  const item = (tab: { label: string; value: TValue }, scroll: boolean): JSX.Element => {
    const isActive = tab.value === value;

    return (
      <Pressable
        accessibilityLabel={tab.label}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        key={tab.value}
        onPress={() => {
          void Haptics.selectionAsync();
          onChange(tab.value);
        }}
        style={[
          scroll ? styles.segmentItemScroll : styles.segmentItem,
          isActive ? styles.segmentItemActive : null
        ]}
      >
        <Text style={[styles.segmentLabel, isActive ? styles.segmentLabelActive : null]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  if (isCompact) {
    return (
      <View
        accessibilityLabel={label}
        accessibilityRole="tablist"
        style={[styles.segmented, inset ? styles.segmentedInset : null]}
      >
        {tabs.map((tab) => item(tab, false))}
      </View>
    );
  }

  return (
    <ScrollView
      accessibilityLabel={label}
      accessibilityRole="tablist"
      contentContainerStyle={[styles.segmented, inset ? styles.segmentedInset : null]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.segmentedScroll}
    >
      {tabs.map((tab) => item(tab, true))}
    </ScrollView>
  );
}

/** One independent accordion row — a squircle chevron well, not a +/– glyph. */
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
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <View style={styles.accordionRow}>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => {
          void Haptics.selectionAsync();
          onToggle();
        }}
        style={({ pressed }) => [styles.accordionHeader, pressed ? styles.rowPressed : null]}
      >
        <View style={styles.accordionText}>
          <Text numberOfLines={2} style={styles.accordionTitle}>
            {title}
          </Text>
          {meta === undefined ? null : <Text style={styles.accordionMeta}>{meta}</Text>}
        </View>
        <View style={[styles.accordionChevron, isOpen ? styles.accordionChevronOpen : null]}>
          <Ionicons
            color={isOpen ? colors.onAccent : colors.muted}
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={15}
          />
        </View>
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

/** A profile image with a tinted initials fallback and an optional white ring. */
export function Avatar({
  name,
  photo,
  ring = false,
  size = 40
}: {
  name: string;
  photo: string | null;
  ring?: boolean;
  size?: number;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  // Written out rather than taken from the sheet: the same ring lands on an
  // `Image` here, and `ImageStyle` will not take a `ViewStyle`.
  const ringStyle = ring ? { borderColor: colors.paper, borderWidth: 3 } : null;

  if (photo !== null && photo.length > 0) {
    const source = readImageVariants(photo);
    const variantUri = pickImageVariant(source, Math.round(size * PixelRatio.get()));

    if (variantUri !== null) {
      return (
        <Image
          accessibilityLabel={name}
          accessibilityRole="image"
          source={{ uri: variantUri }}
          style={[styles.avatar, ringStyle, { borderRadius: size / 2, height: size, width: size }]}
        />
      );
    }
  }

  return (
    <View
      accessibilityLabel={name}
      accessibilityRole="image"
      style={[
        styles.avatar,
        styles.avatarFallback,
        ringStyle,
        { borderRadius: size / 2, height: size, width: size }
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
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
  const styles = useStyles();
  return (
    <View style={styles.sectionHeading}>
      {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.sectionTitle}>{title}</Text>
      {description === undefined ? null : (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
      {action === undefined ? null : action}
    </View>
  );
}

/** A row that opens a list: the title on the left, one way onward on the right. */
export function SectionHeader({
  actionLabel,
  onAction,
  title
}: {
  actionLabel?: string;
  onAction?: () => void;
  title: string;
}): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel === undefined || onAction === undefined ? null : (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={() => {
            void Haptics.selectionAsync();
            onAction();
          }}
          style={({ pressed }) => (pressed ? styles.controlPressed : null)}
        >
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** The KPI tile: the number first, at size, then what it counts. */
export function StatCard({
  icon,
  label,
  tint = "brand",
  value
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: TintName;
  value: ReactNode;
}): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.statCard}>
      {icon === undefined ? null : <IconTile icon={icon} size={34} tint={tint} />}
      <Text style={styles.statValue}>{value}</Text>
      <Text numberOfLines={2} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

/** A price formatted through the shared locale formatter. */
export function PriceText({
  amount,
  onColor = false
}: {
  amount: number | string;
  onColor?: boolean;
}): JSX.Element {
  const styles = useStyles();
  const format = useFormat();

  return (
    <Text style={[styles.price, onColor ? styles.priceOnColor : null]}>
      {format.currency(amount)}
    </Text>
  );
}

/** A star and a number, for a course's rating. Small, and never a row of stars. */
export function RatingMark({ value }: { value: number }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
  const format = useFormat();

  return (
    <View style={styles.rating}>
      <Ionicons color={colors.tint.gold.solid} name="star" size={13} />
      <Text style={styles.ratingText}>{format.rating(value)}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  accordionBody: { paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: 2 },
  accordionChevron: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderRadius: radius.md,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  accordionChevronOpen: { backgroundColor: colors.accent },
  accordionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  accordionMeta: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13 },
  accordionRow: { borderBottomColor: colors.separator, borderBottomWidth: 1 },
  accordionText: { flex: 1, gap: 1 },
  accordionTitle: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 16 },
  avatar: { backgroundColor: colors.placeholderFill, overflow: "hidden" },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    justifyContent: "center"
  },
  avatarText: { color: colors.accent, fontFamily: fonts.displayBold },
  controlPressed: { opacity: 0.7 },
  eyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  filterPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.lg
  },
  filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterPillLabel: {
    color: colors.inkMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 19
  },
  filterPillLabelActive: { color: colors.onAccent },
  presenceDot: {
    backgroundColor: colors.dotIdle,
    borderColor: colors.paper,
    borderRadius: radius.full,
    borderWidth: 2.5,
    height: 14,
    width: 14
  },
  presenceDotOnline: { backgroundColor: colors.online },
  price: { color: colors.ink, fontFamily: fonts.numeric, fontSize: 20 },
  priceOnColor: { color: colors.paper },
  rating: { alignItems: "center", flexDirection: "row", gap: 4 },
  ratingText: { color: colors.inkMuted, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  ringLabel: { color: colors.ink, fontFamily: fonts.numeric },
  ringLabelOnColor: { color: colors.paper },
  ringLabelWrap: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  ringedPlay: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  ringedPlayAccent: { backgroundColor: colors.accent },
  // A highlighter stroke sitting behind the word rather than around it.
  ringedWordStroke: {
    backgroundColor: colors.tint.gold.bg,
    borderRadius: radius.sm,
    bottom: 1,
    height: 13,
    left: -4,
    position: "absolute",
    right: -4
  },
  ringedWordWrap: { alignSelf: "flex-start", position: "relative" },
  rowPressed: { backgroundColor: colors.rowHover },
  sectionAction: { color: colors.accent, fontFamily: fonts.displaySemiBold, fontSize: 14 },
  sectionDescription: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionHeading: { gap: spacing.sm },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 19,
    lineHeight: 26
  },
  segmented: { flexDirection: "row", gap: spacing.sm },
  segmentedInset: { paddingHorizontal: spacing.lg },
  segmentedScroll: { flexGrow: 0 },
  segmentItem: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.md
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentItemScroll: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.lg
  },
  segmentLabel: {
    color: colors.muted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    textAlign: "center"
  },
  segmentLabelActive: { color: colors.onAccent, fontFamily: fonts.displaySemiBold },
  statCard: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radius.square,
    flex: 1,
    gap: 4,
    minWidth: 0,
    padding: spacing.md,
    ...shadow(colors, "card")
  },
  statLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  statValue: { color: colors.ink, fontFamily: fonts.numeric, fontSize: 24, marginTop: 2 },
  streakCount: { color: colors.ink, fontFamily: fonts.numeric, fontSize: 26, lineHeight: 32 },
  streakDay: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.panelWarm,
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center"
  },
  streakDayFilled: { backgroundColor: colors.accent },
  streakDayText: { color: colors.mutedLight, fontFamily: fonts.displaySemiBold, fontSize: 13 },
  streakDayTextFilled: { color: colors.onAccent },
  streakDayToday: { borderColor: colors.tint.gold.solid },
  streakEyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  streakFlame: {
    alignItems: "center",
    backgroundColor: colors.tint.gold.bg,
    borderRadius: radius.md,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  streakHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  streakHeaderText: { flex: 1 },
  streakRow: { flexDirection: "row", gap: 6 },
  trackFill: { backgroundColor: colors.accent, borderRadius: radius.full, height: "100%" },
  trackFillComplete: { backgroundColor: colors.success },
  trackRow: {
    backgroundColor: colors.barTrack,
    borderRadius: radius.full,
    height: 8,
    overflow: "hidden",
    width: "100%"
  }
}));
