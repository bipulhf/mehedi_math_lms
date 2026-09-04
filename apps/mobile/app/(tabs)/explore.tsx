import type { Formatters, Translator } from "@mma/i18n";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { BannerStrip } from "@/src/components/banner-strip";
import { BrandLockup } from "@/src/components/brand-lockup";
import { FilterSheet, type FilterSection } from "@/src/components/filter-sheet";
import {
  Badge,
  Button,
  Card,
  CoverImage,
  EmptyState,
  IconButton,
  Screen,
  SkeletonBlock,
  tabScrollInset
} from "@/src/components/ui";
import { CurvedHeader } from "@/src/components/ui-layout";
import { FilterPill, PriceText, RatingMark } from "@/src/components/ui-display";
import { listCategories } from "@/src/lib/api/categories";
import { type CourseSummary, listCourses } from "@/src/lib/api/courses";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

type SortOrder = "newest" | "priceLow" | "priceHigh";

/** The one meta line a grid tile has room for: lessons, then free lessons. */
function courseMetaLine(
  course: CourseSummary,
  t: Translator,
  format: Formatters
): string {
  const parts: string[] = [];

  if (course.stats.lectureCount > 0) {
    parts.push(t("course.lessons", { count: format.number(course.stats.lectureCount) }));
  }

  if (course.stats.freeLessonCount > 0) {
    parts.push(t("course.freeLessons", { count: format.number(course.stats.freeLessonCount) }));
  }

  return parts.join(" · ");
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
 * A catalogue tile.
 *
 * The catalogue is a **two-column grid**, not a stack of full-width cards: a
 * student browsing is comparing courses, and a list that shows one and a half
 * of them at a time makes comparing impossible. What survives the narrower
 * column is what actually decides a tap — the cover, the name, the price.
 */
const CourseTile = memo(function CourseTile({ course }: { course: CourseSummary }): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();
  const meta = courseMetaLine(course, t, format);

  return (
    <Link asChild href={{ params: { courseId: course.slug }, pathname: "/courses/[courseId]" }}>
      <Pressable
        accessibilityLabel={course.title}
        accessibilityRole="link"
        style={({ pressed }) => [styles.tileWrap, pressed ? styles.pressed : null]}
      >
        <Card flush style={styles.tile}>
          <View>
            <CoverImage bleed height={112} uri={course.coverImageUrl} />
            {course.isExamOnly ? (
              <View style={styles.tileFlag}>
                <Badge tone="attention">{t("course.examOnly")}</Badge>
              </View>
            ) : null}
          </View>
          <View style={styles.tileBody}>
            {course.category ? (
              <Text numberOfLines={1} style={styles.tileCategory}>
                {course.category.name}
              </Text>
            ) : null}
            <Text numberOfLines={2} style={styles.tileTitle}>
              {course.title}
            </Text>
            {meta.length > 0 ? (
              <Text numberOfLines={1} style={styles.tileMeta}>
                {meta}
              </Text>
            ) : null}
            <View style={styles.tileFoot}>
              <PriceText amount={course.price} />
              {course.stats.reviewCount > 0 ? (
                <RatingMark value={course.stats.reviewAverage ?? 0} />
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
});

function CatalogSkeleton(): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.skeletonGrid}>
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={styles.tileWrap}>
          <Card flush style={styles.tile}>
            <SkeletonBlock height={112} />
            <View style={styles.tileBody}>
              <SkeletonBlock height={10} width="50%" />
              <SkeletonBlock height={16} width="90%" />
              <SkeletonBlock height={14} width="40%" />
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}

export default function CatalogScreen(): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
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
    ({ item }: { item: CourseSummary }) => <CourseTile course={item} />,
    []
  );
  const keyExtractor = useCallback((item: CourseSummary) => item.id, []);

  const sortOptions: readonly { label: string; value: SortOrder }[] = [
    { label: t("courses.sort.newest"), value: "newest" },
    { label: t("courses.sort.priceLow"), value: "priceLow" },
    { label: t("courses.sort.priceHigh"), value: "priceHigh" }
  ];
  const activeFilterCount = [
    levelId !== null,
    subjectId !== null,
    isFreeOnly,
    sortOrder !== "newest"
  ].filter(Boolean).length;

  // The subject group only exists once a level is picked, which is also the
  // order the two are read in.
  const filterSections: readonly FilterSection[] = [
    {
      key: "level",
      kind: "choice",
      label: t("courses.level"),
      onChange: (value) => {
        setLevelId(value === "" ? null : value);
        setSubjectId(null);
      },
      options: [
        { label: t("courses.allLevels"), value: "" },
        ...categories.map((level) => ({ label: level.name, value: level.id }))
      ],
      value: levelId ?? ""
    },
    ...(selectedLevel === null
      ? []
      : [
          {
            key: "subject",
            kind: "choice" as const,
            label: t("courses.subject"),
            onChange: (value: string) => setSubjectId(value === "" ? null : value),
            options: [
              { label: t("courses.allLevels"), value: "" },
              ...selectedLevel.children.map((subject) => ({
                label: subject.name,
                value: subject.id
              }))
            ],
            value: subjectId ?? ""
          }
        ]),
    {
      key: "free",
      kind: "toggle",
      label: t("courses.freeOnly"),
      onChange: setIsFreeOnly,
      value: isFreeOnly
    },
    {
      key: "sort",
      kind: "choice",
      label: t("courses.sortLabel"),
      onChange: (value) => setSortOrder(value as SortOrder),
      options: sortOptions.map((option) => ({ label: option.label, value: option.value })),
      value: sortOrder
    }
  ];

  const listHeader = (
    <View style={styles.headerBlock}>
      {/* The app's storefront is where web puts it too — on the public layout,
          not behind the sign-in. */}
      <BannerStrip />

      {categories.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.chipRow}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipStrip}
        >
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
                setLevelId(level.id === levelId ? null : level.id);
                setSubjectId(null);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.resultRow}>
        <Text style={styles.resultText}>
          {t("courses.resultCount", {
            shown: format.number(courses.length),
            total: format.number(data?.items.length ?? courses.length)
          })}
        </Text>
        {activeFilterCount > 0 || search.length > 0 ? (
          <Pressable hitSlop={spacing.sm} onPress={resetFilters}>
            <Text style={styles.clearLink}>{t("action.clearFilters")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen>
      <CurvedHeader overlap={false} style={styles.header}>
        {/* The storefront is the one screen a visitor can reach without an
            account, so it is the one that says whose academy this is. */}
        <View style={styles.brandRow}>
          <BrandLockup />
          <IconButton
            accessibilityLabel={t("courses.filters")}
            badge={activeFilterCount > 0}
            icon="options"
            onPress={() => {
              void Haptics.selectionAsync();
              setIsFilterSheetOpen(true);
            }}
            tone="onPaper"
          />
        </View>
        <Text style={styles.headerTitle}>{t("courses.title")}</Text>

        <View style={styles.searchWrap}>
          <Ionicons color={colors.mutedFaint} name="search" size={19} />
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
            >
              <Ionicons color={colors.mutedFaint} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
      </CurvedHeader>

      <FilterSheet
        activeCount={activeFilterCount}
        isPresented={isFilterSheetOpen}
        onClear={() => {
          resetFilters();
          setIsFilterSheetOpen(false);
        }}
        onDismiss={() => setIsFilterSheetOpen(false)}
        sections={filterSections}
        summary={t("courses.resultCount", {
          shown: format.number(courses.length),
          total: format.number(data?.items.length ?? courses.length)
        })}
        title={t("courses.filters")}
      />

      {isPending ? (
        <View>
          {listHeader}
          <CatalogSkeleton />
        </View>
      ) : courses.length === 0 ? (
        <View>
          {listHeader}
          <EmptyState
            action={
              <Button
                label={t("action.clearFilters")}
                onPress={resetFilters}
                size="sm"
                stretch
                variant="outline"
              />
            }
            icon="magnifyingglass"
            message={t("empty.courses")}
          />
        </View>
      ) : (
        <FlashList
          contentContainerStyle={styles.grid}
          data={courses}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          numColumns={2}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  brandRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chipStrip: { flexGrow: 0 },
  clearLink: { color: colors.accent, fontFamily: fonts.displaySemiBold, fontSize: 13 },
  grid: { paddingBottom: tabScrollInset, paddingHorizontal: spacing.sm },
  header: { gap: spacing.lg, paddingBottom: spacing.lg },
  headerTitle: {
    color: colors.paper,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: -spacing.xs
  },
  headerBlock: { gap: spacing.md, paddingTop: spacing.lg },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  resultRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg
  },
  resultText: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13 },
  search: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: spacing.md
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.tile,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.sm },
  tile: { flex: 1 },
  tileBody: { gap: 4, padding: spacing.md },
  tileCategory: {
    color: colors.accent,
    fontFamily: fonts.monoLabel,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  tileFlag: { left: spacing.sm, position: "absolute", top: spacing.sm },
  tileFoot: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingTop: spacing.xs
  },
  tileMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  tileTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 21 },
  tileWrap: { flex: 1, padding: spacing.sm }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
