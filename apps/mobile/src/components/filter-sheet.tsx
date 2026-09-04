import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { JSX } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/src/components/ui";
import { Sheet } from "@/src/components/sheet";
import { useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * The one filter sheet, for the catalogue and for the exams list.
 *
 * It replaces the wall of pills both screens used to open. Pills are wrong for
 * this job twice over: a chip cloud gives no reading order, so "level", "free"
 * and "sort" all looked like the same kind of choice, and a selected chip in a
 * wrapped row is hard to find again. Here every group is a plate of rows, one
 * row per option, with a check on the chosen one — the shape a phone uses for
 * a choice — and the toggles are switches rather than chips that happen to be
 * on.
 *
 * The footer is the other half of the fix: it says how many results the current
 * selection produces, so the sheet can be judged before it is dismissed.
 */

export interface FilterChoiceOption {
  label: string;
  value: string;
}

export type FilterSection =
  | {
      key: string;
      kind: "choice";
      label: string;
      onChange: (value: string) => void;
      options: readonly FilterChoiceOption[];
      value: string;
    }
  | {
      key: string;
      kind: "toggle";
      label: string;
      onChange: (value: boolean) => void;
      subtitle?: string;
      value: boolean;
    };

/** A single-choice row: the label, and a filled check when it is the one. */
function ChoiceRow({
  isLast,
  isSelected,
  label,
  onPress
}: {
  isLast: boolean;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        isLast ? null : styles.rowDivider,
        pressed ? styles.rowPressed : null
      ]}
    >
      <Text numberOfLines={2} style={[styles.rowLabel, isSelected ? styles.rowLabelOn : null]}>
        {label}
      </Text>
      <View style={[styles.check, isSelected ? styles.checkOn : null]}>
        {isSelected ? <Ionicons color={colors.onAccent} name="checkmark" size={15} /> : null}
      </View>
    </Pressable>
  );
}

/** A switch, drawn rather than native: one shape that matches everything else. */
function ToggleRow({
  label,
  onChange,
  subtitle,
  value
}: {
  label: string;
  onChange: (value: boolean) => void;
  subtitle?: string;
  value: boolean;
}): JSX.Element {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        void Haptics.selectionAsync();
        onChange(!value);
      }}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle === undefined ? null : <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <View style={[styles.track, value ? styles.trackOn : null]}>
        <View style={[styles.knob, value ? styles.knobOn : null]} />
      </View>
    </Pressable>
  );
}

export function FilterSheet({
  activeCount,
  isPresented,
  onClear,
  onDismiss,
  sections,
  summary,
  title
}: {
  /** How many groups are set to something other than their default. */
  activeCount: number;
  isPresented: boolean;
  onClear: () => void;
  onDismiss: () => void;
  sections: readonly FilterSection[];
  /** What the current selection yields — "12 of 40 courses", "6 exams match". */
  summary: string;
  title: string;
}): JSX.Element {
  const styles = useStyles();
  const t = useT();

  return (
    <Sheet isPresented={isPresented} onDismiss={onDismiss} title={title}>
      <View style={styles.sheet}>
        {activeCount > 0 ? (
          <View style={styles.countRow}>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>
                {t("courses.activeFilters")} · {activeCount}
              </Text>
            </View>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.sections}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <View style={styles.plate}>
                {section.kind === "toggle" ? (
                  <ToggleRow
                    label={section.label}
                    onChange={section.onChange}
                    {...(section.subtitle === undefined ? {} : { subtitle: section.subtitle })}
                    value={section.value}
                  />
                ) : (
                  section.options.map((option, index) => (
                    <ChoiceRow
                      isLast={index === section.options.length - 1}
                      isSelected={option.value === section.value}
                      key={option.value}
                      label={option.label}
                      onPress={() => section.onChange(option.value)}
                    />
                  ))
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* The count is the point of the footer: a filter you cannot judge
            before closing the sheet is a filter you apply twice. */}
        <View style={styles.footer}>
          <Text style={styles.summary}>{summary}</Text>
          <View style={styles.footerActions}>
            <View style={styles.footerAction}>
              <Button
                disabled={activeCount === 0}
                label={t("action.clearFilters")}
                onPress={onClear}
                stretch
                variant="outline"
              />
            </View>
            <View style={styles.footerAction}>
              <Button icon="checkmark" label={t("action.save")} onPress={onDismiss} stretch />
            </View>
          </View>
        </View>
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  check: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.lineStrong,
    borderRadius: radius.full,
    borderWidth: 1.5,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  countChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  countChipText: { color: colors.accent, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  countRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  footer: {
    backgroundColor: colors.card,
    borderTopColor: colors.separator,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  footerAction: { flex: 1 },
  footerActions: { flexDirection: "row", gap: spacing.md },
  knob: {
    backgroundColor: colors.card,
    borderRadius: radius.full,
    height: 26,
    marginLeft: 3,
    width: 26
  },
  knobOn: { marginLeft: 25 },
  plate: {
    backgroundColor: colors.card,
    borderRadius: radius.square,
    overflow: "hidden"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  rowDivider: { borderBottomColor: colors.separator, borderBottomWidth: 1 },
  rowLabel: { color: colors.inkMuted, flex: 1, fontFamily: fonts.body, fontSize: 16 },
  rowLabelOn: { color: colors.ink, fontFamily: fonts.displaySemiBold },
  rowPressed: { backgroundColor: colors.rowHover },
  rowSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  rowText: { flex: 1, gap: 1 },
  scroll: { flexGrow: 0 },
  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.9,
    paddingHorizontal: spacing.xs,
    textTransform: "uppercase"
  },
  sections: { gap: spacing.lg, padding: spacing.lg, paddingTop: spacing.xs },
  sheet: { width: "100%" },
  summary: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 13, textAlign: "center" },
  track: {
    backgroundColor: colors.barTrack,
    borderRadius: radius.full,
    height: 32,
    justifyContent: "center",
    width: 54
  },
  trackOn: { backgroundColor: colors.accent }
}));
