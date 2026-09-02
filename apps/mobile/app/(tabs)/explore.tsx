import type { Formatters, Translator } from "@mma/i18n";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BottomSheet } from "@expo/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { BannerStrip } from "@/src/components/banner-strip";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  Heading,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { Avatar, FilterPill, PriceText } from "@/src/components/ui-display";
import { listCategories } from "@/src/lib/api/categories";
import { type CourseSummary, listCourses } from "@/src/lib/api/courses";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { stripHtml } from "@/src/lib/html";
import { colors, fonts, radius, spacing } from "@/src/theme/tokens";

type SortOrder = "newest" | "priceLow" | "priceHigh";

/** The meta line under a card title: lessons · free lessons. No total length. */
function courseMetaParts(
  course: CourseSummary,
  t: Translator,
  format: Formatters
): readonly string[] {
  const parts: string[] = [];

  if (course.stats.lectureCount > 0) {
    parts.push(t("course.lessons", { count: format.number(course.stats.lectureCount) }));
  }

  if (course.stats.freeLessonCount > 0) {
    parts.push(t("course.freeLessons", { count: format.number(course.stats.freeLessonCount) }));
  }

  return parts;
}

function sortCourses(
  courses: readonly CourseSummary[],
  order: SortOrder
): readonly CourseSummary[] {
  if (order === "newest") {
    return courses;
  }

  const direction = order === "priceLow" ? 1 : -1;

  return [...courses].sort((a, b) => (Number(a.price) - Number(b.price)) * direction);
}

/**
 * Memoised with a stable key: FlashList recycles rows, and an unmemoised item
 * re-renders the whole visible window on every keystroke in the search field.
 */
const CourseRow = memo(function CourseRow({ course }: { course: CourseSummary }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const teacher = course.teachers[0];
  const extraTeachers = course.teachers.length - 1;
  const meta = courseMetaParts(course, t, format);

  return (
    <Link asChild href={{ params: { courseId: course.slug }, pathname: "/courses/[courseId]" }}>
      <Pressable
        accessibilityLabel={course.title}
        accessibilityRole="link"
        style={({ pressed }) => [styles.row, pressed ? { opacity: 0.92, transform: [{ scale: 0.98 }] } : null]}
      >
        <Card style={styles.rowCard}>
          <View>
            <CoverImage bleed height={150} uri={course.coverImageUrl} />
            {course.isExamOnly ? (
              <View style={styles.coverBadge}>
                <Badge tone="attention">{t("course.examOnly")}</Badge>
              </View>
            ) : null}
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.metaText}>
              {course.category ? <Text style={styles.metaText}>{course.category.name}</Text> : null}
              {meta.length > 0 ? (
                <Text style={styles.metaText}>
                  {" · "}
                  {meta.join(" · ")}
                </Text>
              ) : null}
            </Text>
            <Text style={styles.titleText} numberOfLines={2}>
              {course.title}
            </Text>
            <Body muted numberOfLines={2}>
              {stripHtml(course.description)}
            </Body>
            {teacher ? (
              <View style={styles.teacherRow}>
                <Avatar name={teacher.name} photo={teacher.profilePhoto} size={28} />
                <Text numberOfLines={1} style={styles.teacherName}>
                  {teacher.name}
                  {extraTeachers > 0 ? ` +${format.number(extraTeachers)}` : ""}
                </Text>
              </View>
            ) : null}
            <View style={styles.footer}>
              <PriceText amount={course.price} />
              {course.stats.reviewCount > 0 ? (
                <Caption>
                  {format.rating(course.stats.reviewAverage ?? 0)} ·{" "}
                  {t("course.reviews", { count: format.number(course.stats.reviewCount) })}
                </Caption>
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
});

function CatalogSkeleton(): JSX.Element {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((key) => (
        <Card key={key}>
          <SkeletonBlock height={150} />
          <View style={styles.rowBody}>
            <SkeletonBlock height={16} width="70%" />
            <SkeletonBlock height={20} />
            <SkeletonBlock height={14} width="80%" />
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function CatalogScreen(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const [search, setSearch] = useState("");
  const [levelId, setLevelId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [isFreeOnly, setIsFreeOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryFn: listCategories,
    queryKey: queryKeys.categories()
  });

  // The subject narrows the level, so whichever is more specific decides the
  // query. Sending both would need an `in` filter the endpoint does not have.
  const categoryId = subjectId ?? levelId;
  const filters = { categoryId, isFreeOnly, search, sortOrder };
  const { data, isPending } = useQuery({
    queryFn: () =>
      listCourses({
        ...(categoryId === null ? {} : { categoryId }),
        ...(isFreeOnly ? { hasFreeLesson: true } : {}),
        search: search.trim() === "" ? undefined : search.trim()
      }),
    queryKey: queryKeys.courses(filters)
  });

  const courses = sortCourses(data?.items ?? [], sortOrder);
  const selectedLevel =
    levelId === null ? null : (categories.find((level) => level.id === levelId) ?? null);

  const resetFilters = (): void => {
    setLevelId(null);
    setSubjectId(null);
    setSearch("");
    setIsFreeOnly(false);
    setSortOrder("newest");
  };

  const renderItem = useCallback(
    ({ item }: { item: CourseSummary }) => <CourseRow course={item} />,
    []
  );
  const keyExtractor = useCallback((item: CourseSummary) => item.id, []);

  const sortOptions: readonly { label: string; value: SortOrder }[] = [
    { label: t("courses.sort.newest"), value: "newest" },
    { label: t("courses.sort.priceLow"), value: "priceLow" },
    { label: t("courses.sort.priceHigh"), value: "priceHigh" }
  ];
  const activeFilterCount = [levelId !== null, isFreeOnly, sortOrder !== "newest"].filter(
    Boolean
  ).length;

  return (
    <Screen noHeader>
      {/* The app's storefront is where web puts it too — on the public layout,
          not behind the sign-in. */}
      <BannerStrip />

      <View style={styles.header}>
        <Heading>{t("courses.title")}</Heading>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons color={colors.mutedFaint} name="search" size={18} />
            <TextInput
              accessibilityLabel={t("courses.searchPlaceholder")}
              onChangeText={setSearch}
              placeholder={t("courses.searchPlaceholder")}
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.accent}
              style={styles.search}
              value={search}
            />
            {search.length > 0 ? (
              <Pressable
                accessibilityLabel={t("action.clearFilters")}
                accessibilityRole="button"
                hitSlop={spacing.sm}
                onPress={() => setSearch("")}
                style={styles.searchClear}
              >
                <Ionicons color={colors.mutedFaint} name="close-circle" size={18} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={t("courses.filters")}
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync();
              setIsFilterSheetOpen(true);
            }}
            style={({ pressed }) => [
              styles.filterButton,
              activeFilterCount > 0 ? styles.filterButtonActive : null,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Ionicons
              color={activeFilterCount > 0 ? colors.onAccent : colors.ink}
              name="options"
              size={18}
            />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <View style={styles.resultRow}>
          <Caption>
            {t("courses.resultCount", {
              shown: format.number(courses.length),
              total: format.number(data?.items.length ?? courses.length)
            })}
          </Caption>
          {activeFilterCount > 0 ? (
            <Pressable onPress={resetFilters}>
              <Text style={styles.clearLink}>{t("action.clearFilters")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <BottomSheet
        isPresented={isFilterSheetOpen}
        onDismiss={() => setIsFilterSheetOpen(false)}
        showDragIndicator
      >
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeader}>
            <Title>{t("courses.filters")}</Title>
            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              hitSlop={spacing.sm}
              onPress={() => setIsFilterSheetOpen(false)}
            >
              <Ionicons color={colors.mutedFaint} name="close-circle" size={26} />
            </Pressable>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>{t("courses.allLevels")}</Text>
            <View style={styles.sheetPills}>
              <FilterPill
                isSelected={levelId === null}
                label={t("courses.allLevels")}
                onPress={() => {
                  setLevelId(null);
                  setSubjectId(null);
                }}
              />
              {categories.map((level) => (
                <FilterPill
                  isSelected={levelId === level.id}
                  key={level.id}
                  label={level.name}
                  onPress={() => {
                    setLevelId(level.id);
                    setSubjectId(null);
                  }}
                />
              ))}
            </View>
          </View>

          {selectedLevel !== null ? (
            <View style={styles.sheetSection}>
              <Text style={styles.sheetLabel}>{selectedLevel.name}</Text>
              <View style={styles.sheetPills}>
                <FilterPill
                  isSelected={subjectId === null}
                  label={t("courses.allLevels")}
                  onPress={() => setSubjectId(null)}
                />
                {selectedLevel.children.map((subject) => (
                  <FilterPill
                    isSelected={subjectId === subject.id}
                    key={subject.id}
                    label={subject.name}
                    onPress={() => setSubjectId(subject.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Options</Text>
            <View style={styles.sheetPills}>
              <FilterPill
                isSelected={isFreeOnly}
                label={t("courses.freeOnly")}
                onPress={() => setIsFreeOnly((current) => !current)}
              />
            </View>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>Sort</Text>
            <View style={styles.sheetPills}>
              {sortOptions.map((option) => (
                <FilterPill
                  isSelected={sortOrder === option.value}
                  key={option.value}
                  label={option.label}
                  onPress={() => setSortOrder(option.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.sheetFooter}>
            <Button
              label={t("action.clearFilters")}
              onPress={() => {
                resetFilters();
                setIsFilterSheetOpen(false);
              }}
              variant="outline"
            />
            <View style={{ flex: 1 }}>
              <Button
                label={t("common.close")}
                onPress={() => setIsFilterSheetOpen(false)}
              />
            </View>
          </View>
        </ScrollView>
      </BottomSheet>

      {isPending ? (
        <CatalogSkeleton />
      ) : courses.length === 0 ? (
        <EmptyState
          action={
            <Button
              label={t("action.clearFilters")}
              onPress={resetFilters}
              size="sm"
              variant="outline"
            />
          }
          message={t("empty.courses")}
        />
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={courses}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clearLink: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  coverBadge: { left: spacing.sm, position: "absolute", top: spacing.sm },
  filterBadge: {
    alignItems: "center",
    backgroundColor: colors.onAccent,
    borderRadius: radius.full,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 3,
    position: "absolute",
    right: -6,
    top: -6
  },
  filterBadgeText: { color: colors.accent, fontFamily: fonts.displayBold, fontSize: 10 },
  filterButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.hairlineFaint,
    borderRadius: 12,
    borderWidth: 0.5,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  filterButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  header: { gap: spacing.md, padding: spacing.lg },
  list: { padding: spacing.lg },
  metaText: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13 },
  resultRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  row: { marginBottom: spacing.lg },
  rowBody: { gap: spacing.sm, padding: spacing.lg },
  rowCard: { overflow: "hidden", padding: 0 },
  search: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingVertical: spacing.md
  },
  searchClear: { padding: spacing.xs },
  searchIcon: { marginRight: spacing.sm },
  searchRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  searchWrap: {
    alignItems: "center",
    backgroundColor: colors.input,
    borderColor: colors.hairlineFaint,
    borderRadius: 14,
    borderWidth: 0.5,
    flex: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  sheetContent: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetFooter: { flexDirection: "row", gap: spacing.md, paddingTop: spacing.md },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sheetLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  sheetPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm },
  sheetSection: { gap: spacing.xs },
  skeletonList: { gap: spacing.lg, padding: spacing.lg },
  teacherName: { color: colors.muted, flex: 1, fontFamily: fonts.body, fontSize: 14 },
  teacherRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  titleText: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 18, lineHeight: 24 }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
