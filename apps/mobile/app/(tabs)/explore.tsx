import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { BannerStrip } from "@/src/components/banner-strip";
import { BrandLockup } from "@/src/components/brand-lockup";
import {
  CourseGridRow,
  CourseGridSkeleton,
  pairCourses,
  useCourseGridMetrics,
  type CoursePair
} from "@/src/components/course-grid";
import { FilterSheet, type FilterSection } from "@/src/components/filter-sheet";
import { Button, EmptyState, IconButton, Screen, tabScrollInset } from "@/src/components/ui";
import { CurvedHeader } from "@/src/components/ui-layout";
import { FilterPill } from "@/src/components/ui-display";
import { listCategories } from "@/src/lib/api/categories";
import { type CourseSummary, listCourses } from "@/src/lib/api/courses";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

type SortOrder = "newest" | "priceLow" | "priceHigh";

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

  // Paired here rather than by `numColumns`, so the list item is always a full
  // row. `courses` is a fresh array each render only when the query or the sort
  // changes, which is exactly when the pairing has to be redone.
  const pairs = useMemo(() => pairCourses(courses), [courses]);

  // One measurement for the whole grid rather than one per tile, so every tile
  // on the screen is the same width and a rotation moves all of them together.
  const metrics = useCourseGridMetrics();

  const renderItem = useCallback(
    ({ item }: { item: CoursePair }) => <CourseGridRow metrics={metrics} pair={item} />,
    [metrics]
  );
  const keyExtractor = useCallback((item: CoursePair) => item.key, []);

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

      {/* All three states scroll and all three clear the docked nav bar, so the
          screen does not gain or lose a scrollbar as the query settles. */}
      {isPending ? (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {listHeader}
          <CourseGridSkeleton />
        </ScrollView>
      ) : courses.length === 0 ? (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      ) : (
        <FlashList
          contentContainerStyle={styles.grid}
          data={pairs}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
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
  // No horizontal padding: the grid rows carry the screen inset themselves, so
  // the banner in the header can still run edge to edge.
  grid: { paddingBottom: tabScrollInset },
  header: { gap: spacing.lg, paddingBottom: spacing.lg },
  headerTitle: {
    color: colors.paper,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: -spacing.xs
  },
  headerBlock: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.lg },
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
  }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
