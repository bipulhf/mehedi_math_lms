import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import {
  Badge,
  Body,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  Heading,
  Screen,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { listCategories, listCourses, type CategoryNode, type CourseSummary } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { stripHtml } from "@/src/lib/html";
import { colors, radius, spacing } from "@/src/theme/tokens";

function flatten(categories: readonly CategoryNode[]): readonly CategoryNode[] {
  return categories.flatMap((category) => [category, ...flatten(category.children)]);
}

function formatPrice(price: string): string {
  return Number(price) <= 0 ? "Free" : `BDT ${Number(price).toLocaleString()}`;
}

/**
 * Memoised with a stable key: FlashList recycles rows, and an unmemoised item
 * re-renders the whole visible window on every keystroke in the search field.
 */
const CourseRow = memo(function CourseRow({ course }: { course: CourseSummary }): JSX.Element {
  return (
    <Link asChild href={{ params: { courseId: course.id }, pathname: "/courses/[courseId]" }}>
      <Pressable style={styles.row}>
        <Card>
          <CoverImage uri={course.coverImageUrl} />
          <View style={styles.rowBody}>
            <Title>{course.title}</Title>
            <Body muted numberOfLines={2}>
              {stripHtml(course.description)}
            </Body>
            <View style={styles.rowMeta}>
              <Badge>{formatPrice(course.price)}</Badge>
              {course.isExamOnly ? <Badge tone="warning">Exam only</Badge> : null}
              {course.category ? <Caption>{course.category.name}</Caption> : null}
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
          <SkeletonBlock height={180} />
          <View style={styles.rowBody}>
            <SkeletonBlock height={20} width="70%" />
            <SkeletonBlock height={14} />
            <SkeletonBlock height={14} width="80%" />
          </View>
        </Card>
      ))}
    </View>
  );
}

/**
 * Price bands rather than two number fields: a phone keyboard for a range is a
 * worse experience than three taps, and these are the bands the catalogue
 * actually splits on.
 */
const PRICE_BANDS = [
  { key: "any", label: "Any price" },
  { key: "free", label: "Free", maxPrice: 0 },
  { key: "under-2000", label: "Under 2,000", maxPrice: 2000, minPrice: 1 },
  { key: "2000-plus", label: "2,000+", minPrice: 2000 }
] as const;

type PriceBandKey = (typeof PRICE_BANDS)[number]["key"];

export default function CatalogScreen(): JSX.Element {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priceBand, setPriceBand] = useState<PriceBandKey>("any");

  const { data: categories = [] } = useQuery({
    queryFn: listCategories,
    queryKey: queryKeys.categories()
  });
  const band = PRICE_BANDS.find((entry) => entry.key === priceBand) ?? PRICE_BANDS[0];
  const priceRange = {
    maxPrice: "maxPrice" in band ? band.maxPrice : undefined,
    minPrice: "minPrice" in band ? band.minPrice : undefined
  };
  const filters = { categoryId, priceBand, search };
  const { data, isPending } = useQuery({
    queryFn: async () =>
      listCourses({
        categoryId: categoryId ?? undefined,
        maxPrice: priceRange.maxPrice,
        minPrice: priceRange.minPrice,
        search: search.trim() === "" ? undefined : search.trim()
      }),
    queryKey: queryKeys.courses(filters)
  });

  const renderItem = useCallback(
    ({ item }: { item: CourseSummary }) => <CourseRow course={item} />,
    []
  );
  const keyExtractor = useCallback((item: CourseSummary) => item.id, []);
  const flatCategories = flatten(categories);

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>Catalog</Heading>
        <TextInput
          accessibilityLabel="Search courses"
          onChangeText={setSearch}
          placeholder="Search courses"
          placeholderTextColor={colors.outline}
          style={styles.search}
          value={search}
        />
        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setCategoryId(null)}
            style={[styles.chip, categoryId === null ? styles.chipActive : null]}
          >
            <Caption>All</Caption>
          </Pressable>
          {flatCategories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              style={[styles.chip, categoryId === category.id ? styles.chipActive : null]}
            >
              <Caption>{category.name}</Caption>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {PRICE_BANDS.map((entry) => (
            <Pressable
              key={entry.key}
              onPress={() => setPriceBand(entry.key)}
              style={[styles.chip, priceBand === entry.key ? styles.chipActive : null]}
            >
              <Caption>{entry.label}</Caption>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isPending ? (
        <CatalogSkeleton />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          message="Try a different search, or clear the category filter."
          title="No courses match"
        />
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={data?.items ?? []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  chipActive: { backgroundColor: colors.secondaryContainer, borderColor: colors.primary },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  header: { gap: spacing.md, padding: spacing.lg },
  list: { padding: spacing.lg },
  row: { marginBottom: spacing.lg },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  rowMeta: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  search: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.onSurface,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  skeletonList: { gap: spacing.lg, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
