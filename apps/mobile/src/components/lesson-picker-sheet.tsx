import type { JSX } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Body, Caption, Title } from "@/src/components/ui";
import { AccordionRow } from "@/src/components/ui-display";
import type { ContentLecture } from "@/src/lib/api/content";
import type { AssessmentTestSummary } from "@/src/lib/api/tests";
import { useT } from "@/src/lib/locale";
import { colors, radius, spacing } from "@/src/theme/tokens";

/**
 * A lecture and its chapter's test are one sequence in the player, so both
 * kinds of stop are one `sortOrder`-ordered list rather than two.
 */
export interface NavigationLectureItem {
  chapterId: string;
  id: string;
  kind: "lecture";
  lecture: ContentLecture;
  sortOrder: number;
  title: string;
}

export interface NavigationTestItem {
  chapterId: string;
  id: string;
  kind: "test";
  sortOrder: number;
  test: AssessmentTestSummary;
  title: string;
}

export type NavigationItem = NavigationLectureItem | NavigationTestItem;

function ChapterItem({
  isCompleted,
  isSelected,
  item,
  onSelect
}: {
  isCompleted: boolean;
  isSelected: boolean;
  item: NavigationItem;
  onSelect: () => void;
}): JSX.Element {
  const t = useT();

  return (
    <Pressable
      accessibilityLabel={item.title}
      accessibilityRole="button"
      onPress={onSelect}
      style={[styles.itemRow, isSelected ? styles.itemRowActive : null]}
    >
      <View style={styles.itemRowText}>
        <Body numberOfLines={1}>{item.title}</Body>
        <Caption>
          {item.kind === "lecture"
            ? `${item.lecture.type === "TEXT" ? "" : "▶ "}${
                item.lecture.videoDuration
                  ? t("course.minutes", { count: item.lecture.videoDuration })
                  : t("player.selfPaced")
              }`
            : `${t("player.questionCount", { count: item.test.questionCount })} · ${t(
                "player.totalMarks",
                { count: item.test.totalMarks }
              )}`}
        </Caption>
      </View>
      <Caption>{item.kind === "test" ? "✦" : isCompleted ? "✓" : "○"}</Caption>
    </Pressable>
  );
}

/**
 * The lesson picker, as a bottom sheet rather than a permanent block above
 * the player — Khan Academy's redesign moves exactly this off-screen until
 * asked for. Built on the core `Modal` (`animationType="slide"`), not a
 * gesture-driven sheet library: `react-native-reanimated` is a declared
 * dependency this app has never actually used, its worklet Babel plugin is
 * unconfigured, and this codebase has never run on real hardware
 * (`docs/mobile-plan.md` Stage 0) — not the place to debut either for the
 * first time. `Modal` needs neither.
 */
export function LessonPickerSheet({
  chapters,
  completedIds,
  navigationItems,
  onClose,
  onSelect,
  openChapterId,
  onToggleChapter,
  selectedItemId,
  visible
}: {
  chapters: readonly { id: string; materials: ContentLecture["materials"]; title: string }[];
  completedIds: ReadonlySet<string>;
  navigationItems: readonly NavigationItem[];
  onClose: () => void;
  onSelect: (itemId: string) => void;
  onToggleChapter: (chapterId: string) => void;
  openChapterId: string | null;
  selectedItemId: string | null;
  visible: boolean;
}): JSX.Element {
  const t = useT();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sheetRoot}>
        <Pressable
          accessible={false}
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheetPanel}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Title>{t("player.navigator")}</Title>
            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              hitSlop={spacing.sm}
              onPress={onClose}
            >
              <Text style={styles.sheetClose}>&times;</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {chapters.map((chapter) => {
              const chapterItems = navigationItems.filter((item) => item.chapterId === chapter.id);

              return (
                <AccordionRow
                  isOpen={openChapterId === chapter.id}
                  key={chapter.id}
                  meta={chapterItems.length}
                  onToggle={() => onToggleChapter(chapter.id)}
                  title={chapter.title}
                >
                  <View style={{ gap: spacing.xs }}>
                    {chapterItems.map((item) => (
                      <ChapterItem
                        isCompleted={
                          item.kind === "lecture" && Boolean(completedIds.has(item.lecture.id))
                        }
                        isSelected={selectedItemId === item.id}
                        item={item}
                        key={item.id}
                        onSelect={() => onSelect(item.id)}
                      />
                    ))}
                  </View>
                </AccordionRow>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    alignItems: "center",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  itemRowActive: { backgroundColor: colors.chipActive },
  itemRowText: { flex: 1, gap: 2 },
  sheetClose: { color: colors.muted, fontSize: 24, padding: spacing.xs },
  sheetContent: { padding: spacing.lg },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.hairline,
    borderRadius: radius.pill,
    height: 4,
    marginTop: spacing.sm,
    width: 36
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  sheetPanel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.square,
    borderTopRightRadius: radius.square,
    maxHeight: "75%"
  },
  sheetRoot: { backgroundColor: "rgba(0, 0, 0, 0.5)", flex: 1, justifyContent: "flex-end" }
});
