import Ionicons from "@expo/vector-icons/Ionicons";
import type { JSX } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Body, Caption } from "@/src/components/ui";
import { Sheet } from "@/src/components/sheet";
import { AccordionRow, IconTile } from "@/src/components/ui-display";
import type { ContentLecture } from "@/src/lib/api/content";
import type { AssessmentTestSummary } from "@/src/lib/api/tests";
import { useT } from "@/src/lib/locale";
import { radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

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
  const styles = useStyles();
  const colors = useThemeColors();
  const t = useT();
  const isTest = item.kind === "test";

  return (
    <Pressable
      accessibilityLabel={item.title}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onSelect}
      style={[styles.itemRow, isSelected ? styles.itemRowActive : null]}
    >
      {/* What kind of stop this is, in colour: a paper is coral, a class is
          indigo, and a class already watched is mint. Glyphs in text
          (▶ ✓ ○) were doing this job and read as typos. */}
      <IconTile
        icon={isTest ? "document-text" : item.lecture.type === "TEXT" ? "book" : "play"}
        size={38}
        tint={isTest ? "coral" : isCompleted ? "mint" : "brand"}
      />
      <View style={styles.itemRowText}>
        <Body numberOfLines={1}>{item.title}</Body>
        <Caption>
          {item.kind === "lecture"
            ? item.lecture.videoDuration
              ? t("course.minutes", { count: item.lecture.videoDuration })
              : t("player.selfPaced")
            : `${t("player.questionCount", { count: item.test.questionCount })} · ${t(
                "player.totalMarks",
                { count: item.test.totalMarks }
              )}`}
        </Caption>
      </View>
      {isCompleted ? (
        <Ionicons color={colors.success} name="checkmark-circle" size={20} />
      ) : (
        <Ionicons color={colors.mutedFaint} name="chevron-forward" size={17} />
      )}
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
  const styles = useStyles();
  const t = useT();

  return (
    <Sheet isPresented={visible} onDismiss={onClose} title={t("player.navigator")}>
      <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetPlate}>
          {chapters.map((chapter) => {
            const chapterItems = navigationItems.filter(
              (item) => item.chapterId === chapter.id
            );

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
        </View>
      </ScrollView>
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  itemRow: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  itemRowActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  itemRowText: { flex: 1, gap: 2 },
  // The chapters sit on one plate rather than as free rows on the sheet, the
  // same shape the filter sheet uses for its groups.
  sheetContent: { padding: spacing.lg, paddingTop: spacing.sm },
  sheetPlate: {
    backgroundColor: colors.card,
    borderRadius: radius.square,
    overflow: "hidden"
  }
}));
