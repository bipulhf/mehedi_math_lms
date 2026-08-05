import type { Formatters, Translator } from "@genex/i18n";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  Avatar,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  FilterPill,
  Heading,
  PriceText,
  Screen,
  SkeletonBlock
} from "@/src/components/ui";
import { listCategories, listCourses, type CourseSummary } from "@/src/lib/api";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { stripHtml } from "@/src/lib/html";
import { colors, fonts, radius, spacing } from "@/src/theme/tokens";

type SortOrder = "newest" | "priceLow" | "priceHigh";

/** The meta line under a card title: lessons · free lessons. No total length. */
function courseMetaParts(course: CourseSummary, t: Translator, format: Formatters): readonly string[] {
  const parts: string[] = [];

  if (course.stats.lectureCount > 0) {
    parts.push(t("course.lessons", { count: format.number(course.stats.lectureCount) }));
  }

  if (course.stats.freeLessonCount > 0) {
    parts.push(t("course.freeLessons", { count: format.number(course.stats.freeLessonCount) }));
  }

  return parts;
}

function sortCourses(courses: readonly CourseSummary[], order: SortOrder): readonly CourseSummary[] {
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
    <Link asChild href={{ params: { courseId: course.id }, pathname: "/courses/[courseId]" }}>
      <Pressable style={styles.row}>
        <Card>
          <View>
            <CoverImage height={150} uri={course.coverImageUrl} />
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
  const selectedLevel = levelId === null ? null : categories.find((level) => level.id === levelId) ?? null;

  const resetFilters = (): void => {
    setLevelId(null);
    setSubjectId(null);
    setSearch("");
    setIsFreeOnly(false);
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

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>{t("courses.title")}</Heading>
        <TextInput
          accessibilityLabel="Search courses"
          onChangeText={setSearch}
          placeholder={t("courses.searchPlaceholder")}
          placeholderTextColor={colors.placeholder}
          style={styles.search}
          value={search}
        />
        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
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
                setLevelId(level.id);
                setSubjectId(null);
              }}
            />
          ))}
        </ScrollView>
        {selectedLevel !== null ? (
          <ScrollView
            contentContainerStyle={styles.filters}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
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
          </ScrollView>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <FilterPill
            isSelected={isFreeOnly}
            label={t("courses.freeOnly")}
            onPress={() => setIsFreeOnly((current) => !current)}
          />
          {sortOptions.map((option) => (
            <FilterPill
              isSelected={sortOrder === option.value}
              key={option.value}
              label={option.label}
              onPress={() => setSortOrder(option.value)}
            />
          ))}
        </ScrollView>
        <Caption>
          {t("courses.resultCount", {
            shown: format.number(courses.length),
            total: format.number(data?.items.length ?? courses.length)
          })}
        </Caption>
      </View>

      {isPending ? (
        <CatalogSkeleton />
      ) : courses.length === 0 ? (
        <EmptyState
          action={
            <Button label={t("action.clearFilters")} onPress={resetFilters} size="sm" variant="outline" />
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
  coverBadge: { left: spacing.sm, position: "absolute", top: spacing.sm },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  footer: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  header: { gap: spacing.md, padding: spacing.lg },
  list: { padding: spacing.lg },
  metaText: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 13 },
  row: { marginBottom: spacing.lg },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  skeletonList: { gap: spacing.lg, padding: spacing.lg },
  teacherName: { color: colors.muted, flex: 1, fontFamily: fonts.body, fontSize: 14 },
  teacherRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  titleText: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 18, lineHeight: 24 }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
