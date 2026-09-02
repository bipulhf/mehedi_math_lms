import { pickImageVariant, readImageVariants, resolveProgressChunks } from "@mma/shared";
import { Image } from "expo-image";
import type { JSX, ReactNode } from "react";
import { PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Polygon, Svg } from "react-native-svg";

import { useFormat } from "@/src/lib/locale";
import { colors, fonts, radius, spacing, typography } from "@/src/theme/tokens";

/** The shared chunked progress tracker. DESIGN.md §6. */
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
            index < chunks.filled
              ? isComplete
                ? styles.trackChunkComplete
                : styles.trackChunkFilled
              : null
          ]}
        />
      ))}
    </View>
  );
}

export interface StreakDay {
  isToday: boolean;
  /** A single-character weekday initial — the strip is 7 chunks wide, not a calendar. */
  label: string;
  studied: boolean;
}

/** A compact week of study activity with an accessible total. */
export function StreakTrack({
  days,
  label,
  streakCount
}: {
  days: readonly StreakDay[];
  label: string;
  streakCount: number;
}): JSX.Element {
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
        <Text style={styles.streakCount}>{streakCount}</Text>
        <Text style={styles.streakEyebrow}>{label}</Text>
      </View>
      <View style={styles.streakRow}>
        {days.map((day, index) => (
          <View key={index} style={styles.streakDay}>
            <View
              style={[
                styles.streakChunk,
                day.studied ? styles.streakChunkFilled : null,
                day.isToday ? styles.streakChunkToday : null
              ]}
            />
            <Text style={styles.streakEyebrow}>{day.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Green when online, muted when not — an explicit semantic-status exception. */
export function PresenceDot({ isOnline }: { isOnline: boolean }): JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.presenceDot, isOnline ? styles.presenceDotOnline : null]}
    />
  );
}

/** A hand-drawn ring around a heading word, with no visual-only accessibility noise. */
export function RingedWord({ children }: { children: ReactNode }): JSX.Element {
  return (
    <View style={styles.ringedWordWrap}>
      {children}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={styles.ringedWordRing}
      />
    </View>
  );
}

function PlayGlyph({ color }: { color: string }): JSX.Element {
  return (
    <Svg height={10} style={styles.playGlyph} viewBox="0 0 10 10" width={10}>
      <Polygon fill={color} points="0,0 10,5 0,10" />
    </Svg>
  );
}

/** A play glyph inside a hairline ring for free lessons and resume actions. */
export function RingedPlay({ tone = "hairline" }: { tone?: "accent" | "hairline" }): JSX.Element {
  return (
    <View style={[styles.ringedPlay, tone === "accent" ? styles.ringedPlayAccent : null]}>
      <PlayGlyph color={tone === "accent" ? colors.accent : colors.ink} />
    </View>
  );
}

/** One shared 44-point filter chip for every horizontal filter strip. */
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
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
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

/** A text tab strip with an explicit 44-point target and 2px active rule. */
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
    <View accessibilityLabel={label} accessibilityRole="tablist" style={styles.tabs}>
      <ScrollView
        contentContainerStyle={styles.tabsContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;

          return (
            <Pressable
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={tab.value}
              onPress={() => onChange(tab.value)}
              style={({ pressed }) => [styles.tab, pressed ? styles.controlPressed : null]}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                {tab.label}
              </Text>
              <View style={[styles.tabUnderline, isActive ? styles.tabUnderlineActive : null]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** One independent accordion row. Opening it never closes its siblings. */
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
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        style={({ pressed }) => [styles.accordionHeader, pressed ? styles.controlPressed : null]}
      >
        <Text numberOfLines={2} style={styles.accordionTitle}>
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

/** A source-aware profile image with a quiet initials fallback. */
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
          accessibilityLabel={name}
          accessibilityRole="image"
          source={{ uri: variantUri }}
          style={[styles.avatar, { borderRadius: size / 2, height: size, width: size }]}
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
        { borderRadius: size / 2, height: size, width: size }
      ]}
    >
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
      <Text style={styles.sectionTitle}>{title}</Text>
      {description === undefined ? null : (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
      {action === undefined ? null : action}
    </View>
  );
}

/** The KPI tile — a muted label over a large number. */
export function StatCard({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/** A price formatted through the shared locale formatter. */
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
  accordionMarker: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 22,
    fontStyle: "italic",
    width: 20
  },
  accordionMarkerOpen: { color: colors.accent },
  accordionMeta: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14 },
  accordionRow: { borderBottomColor: colors.hairline, borderBottomWidth: 1 },
  accordionTitle: { color: colors.ink, flex: 1, fontFamily: fonts.displaySemiBold, fontSize: 17 },
  avatar: { backgroundColor: colors.placeholderFill, overflow: "hidden" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.mutedLight, fontFamily: fonts.displaySemiBold },
  controlPressed: { opacity: 0.78 },
  eyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  filterPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg
  },
  filterPillActive: { backgroundColor: colors.chipActive, borderColor: colors.accent },
  filterPillLabel: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight
  },
  filterPillLabelActive: { color: colors.ink },
  playGlyph: { marginLeft: 2 },
  presenceDot: { backgroundColor: colors.dotIdle, borderRadius: radius.full, height: 8, width: 8 },
  presenceDotOnline: { backgroundColor: colors.online },
  price: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.title.fontSize
  },
  ringedPlay: {
    alignItems: "center",
    borderColor: colors.hairline,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22
  },
  ringedPlayAccent: { borderColor: colors.accent },
  ringedWordRing: {
    borderColor: colors.accent,
    borderRadius: radius.full,
    borderWidth: 2,
    bottom: -2,
    left: -12,
    opacity: 0.4,
    position: "absolute",
    right: -12,
    top: -2,
    transform: [{ rotate: "-3deg" }]
  },
  ringedWordWrap: { alignSelf: "flex-start", position: "relative" },
  sectionDescription: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight
  },
  sectionHeading: { gap: spacing.sm },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fonts.displaySemiBold,
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight
  },
  statCard: { borderColor: colors.hairline, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  statLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  statValue: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 26 },
  streakChunk: {
    backgroundColor: colors.barTrack,
    borderRadius: radius.sm / 2,
    height: 20,
    width: "100%"
  },
  streakChunkFilled: { backgroundColor: colors.accent },
  streakChunkToday: { borderColor: colors.accent, borderWidth: 1.5 },
  streakCount: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 26 },
  streakDay: { alignItems: "center", flex: 1, gap: spacing.xs },
  streakEyebrow: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  streakHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  streakRow: { flexDirection: "row", gap: 3 },
  tab: { alignItems: "center", justifyContent: "flex-end", minHeight: 44 },
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
    borderBottomWidth: 1
  },
  tabsContent: { gap: spacing.xl, paddingHorizontal: spacing.lg },
  trackChunk: { backgroundColor: colors.barTrack, flex: 1, height: 6, minWidth: 4 },
  trackChunkComplete: { backgroundColor: colors.lineStrong },
  trackChunkFilled: { backgroundColor: colors.accent },
  trackRow: { flexDirection: "row", gap: 3 }
});
