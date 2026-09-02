import { useQueries, useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";

import { BottomSheet } from "@expo/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { CourseExamGroup } from "@/src/components/course-exam-group";
import { Body, Button, Caption, EmptyState, Heading, Screen, SkeletonBlock, Title } from "@/src/components/ui";
import { FilterPill } from "@/src/components/ui-display";
import { type CourseSummary, listCourses } from "@/src/lib/api/courses";
import { listMyEnrollments } from "@/src/lib/api/enrollments";
import { getCourseAssessments } from "@/src/lib/api/tests";
import {
  type ExamFilterState,
  type ExamKindFilter,
  type ExamStatusFilter,
  countExams,
  emptyExamFilters,
  filterChapters,
  isFiltering
} from "@/src/lib/exam-filters";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { Pressable, Text } from "react-native";

import { colors, fonts, radius, spacing } from "@/src/theme/tokens";

/** The course list endpoint's own maximum. */
const PAGE_SIZE = 50;

interface ExamCourse {
  id: string;
  subtitle: string;
  title: string;
}

/**
 * Every course the caller can manage, not just the first page of them.
 *
 * The list endpoint caps a page at 50, so a teacher with more courses than that
 * would otherwise silently lose the tail — and a course missing from this list
 * is a course whose exams nobody can reach.
 */
async function listAllStaffCourses(mine: boolean): Promise<readonly CourseSummary[]> {
  const firstPage = await listCourses({ limit: PAGE_SIZE, mine, page: 1 });
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.pages - 1) },
    (_unused, index) => index + 2
  );
  const rest = await Promise.all(
    remainingPages.map(async (page) => listCourses({ limit: PAGE_SIZE, mine, page }))
  );

  return [firstPage, ...rest].flatMap((response) => response.items);
}

/**
 * Exams, course by course, on one screen — the app's counterpart to the web
 * `/dashboard/exams` page, and the only place either app lists exams across
 * courses rather than inside one.
 *
 * The same list for everyone: a teacher opens a course to mark its papers and a
 * student opens it to see how they did, so only the source and the actions
 * differ.
 */
export default function ExamsScreen(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useSession();
  const role = session?.session.role;
  const isStudent = role === "STUDENT";
  const isStaff = role === "TEACHER" || role === "ADMIN";
  const [openCourseIds, setOpenCourseIds] = useState<ReadonlySet<string>>(new Set());
  const [filters, setFilters] = useState<ExamFilterState>(emptyExamFilters);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const staffCourses = useQuery({
    enabled: isStaff,
    queryFn: () => listAllStaffCourses(role === "TEACHER"),
    queryKey: queryKeys.staffCourses(role === "TEACHER")
  });
  const enrollments = useQuery({
    enabled: isStudent,
    queryFn: listMyEnrollments,
    queryKey: queryKeys.enrollments()
  });

  const isPending =
    isSessionPending || (isStaff && staffCourses.isPending) || (isStudent && enrollments.isPending);

  const courses: readonly ExamCourse[] = isStudent
    ? (enrollments.data ?? [])
        .filter((enrollment) => enrollment.accessGranted)
        .map((enrollment) => ({
          id: enrollment.course.id,
          subtitle: enrollment.category.name,
          title: enrollment.course.title
        }))
    : (staffCourses.data ?? []).map((course) => ({
        id: course.id,
        subtitle: `${course.category?.name ?? ""} · ${format.number(course.stats.lectureCount)} ${t("common.lessons")}`,
        title: course.title
      }));

  const isSearching = isFiltering(filters);
  const search = filters.search.trim().toLowerCase();

  /**
   * A course's exams load when its row is opened — a teacher with twenty
   * courses should not fetch twenty chapter trees to read a list of names. A
   * search is the exception: it has to look inside every course to answer
   * honestly, so filtering loads them all.
   */
  const assessmentQueries = useQueries({
    queries: courses.map((course) => ({
      enabled: isSearching || openCourseIds.has(course.id),
      queryFn: async () => getCourseAssessments(course.id),
      queryKey: queryKeys.courseTests(course.id),
      staleTime: 30_000
    }))
  });

  const groups = courses.map((course, index) => {
    const query = assessmentQueries[index];
    const courseMatchesSearch = search.length === 0 || course.title.toLowerCase().includes(search);
    const chapters = filterChapters(query?.data ?? [], filters, courseMatchesSearch);

    return {
      chapters,
      course,
      // `isLoading`, not `isPending`: a disabled query — a course nobody has
      // opened — stays pending forever, and that is not a row still loading.
      isLoading: Boolean(query?.isLoading),
      matches: chapters.length > 0
    };
  });

  const visibleGroups = isSearching
    ? groups.filter((group) => group.isLoading || group.matches)
    : groups;
  const matchCount = visibleGroups.reduce((total, group) => total + countExams(group.chapters), 0);

  const toggleCourse = (courseId: string): void => {
    setOpenCourseIds((current) => {
      const next = new Set(current);

      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }

      return next;
    });
  };

  const kinds: readonly { label: string; value: ExamKindFilter }[] = [
    { label: t("exams.filterAll"), value: "ALL" },
    { label: t("exams.filterMcq"), value: "MCQ" },
    { label: t("exams.filterWritten"), value: "WRITTEN" }
  ];
  const statuses: readonly { label: string; value: ExamStatusFilter }[] = [
    { label: t("exams.filterAll"), value: "ALL" },
    { label: t("exams.filterPublished"), value: "PUBLISHED" },
    { label: t("exams.filterDraft"), value: "DRAFT" }
  ];

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t("exams.title") }} />
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={26} width="45%" />
          <SkeletonBlock height={96} />
          <SkeletonBlock height={72} />
          <SkeletonBlock height={72} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("exams.title") }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading>{t("exams.title")}</Heading>
        <Body muted>{isStudent ? t("exams.studentLead") : t("exams.staffLead")}</Body>

        {courses.length === 0 ? (
          <EmptyState message={t("exams.noCourses")} />
        ) : (
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchWrap}>
                <Ionicons color={colors.mutedFaint} name="search" size={18} />
                <TextInput
                  accessibilityLabel={t("exams.search")}
                  onChangeText={(value) => setFilters({ ...filters, search: value })}
                  placeholder={t("exams.search")}
                  placeholderTextColor={colors.placeholder}
                  selectionColor={colors.accent}
                  style={styles.searchInput}
                  value={filters.search}
                />
              </View>
              <Pressable
                accessibilityLabel={t("exams.title")}
                accessibilityRole="button"
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsFilterSheetOpen(true);
                }}
                style={({ pressed }) => [
                  styles.filterButton,
                  isSearching ? styles.filterButtonActive : null,
                  pressed ? { opacity: 0.7 } : null
                ]}
              >
                <Ionicons color={isSearching ? colors.onAccent : colors.ink} name="options" size={18} />
                {isSearching ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>•</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {isSearching ? (
              <View style={styles.matchRow}>
                <Caption tone="faint">
                  {t("exams.matchCount", { count: format.number(matchCount) })}
                </Caption>
                <Pressable onPress={() => setFilters(emptyExamFilters)}>
                  <Text style={styles.clearLink}>{t("exams.clearFilters")}</Text>
                </Pressable>
              </View>
            ) : null}

            <BottomSheet
              isPresented={isFilterSheetOpen}
              onDismiss={() => setIsFilterSheetOpen(false)}
              showDragIndicator
            >
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Title>{t("exams.title")}</Title>
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
                  <Text style={styles.sheetLabel}>Kind</Text>
                  <View style={styles.pillRow}>
                    {kinds.map((kind) => (
                      <FilterPill
                        isSelected={filters.kind === kind.value}
                        key={kind.value}
                        label={kind.label}
                        onPress={() => setFilters({ ...filters, kind: kind.value })}
                      />
                    ))}
                  </View>
                </View>
                {isStudent ? null : (
                  <View style={styles.sheetSection}>
                    <Text style={styles.sheetLabel}>Status</Text>
                    <View style={styles.pillRow}>
                      {statuses.map((status) => (
                        <FilterPill
                          isSelected={filters.status === status.value}
                          key={status.value}
                          label={status.label}
                          onPress={() => setFilters({ ...filters, status: status.value })}
                        />
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.sheetFooter}>
                  <Button
                    label={t("exams.clearFilters")}
                    onPress={() => {
                      setFilters(emptyExamFilters);
                      setIsFilterSheetOpen(false);
                    }}
                    variant="outline"
                  />
                  <View style={{ flex: 1 }}>
                    <Button label={t("common.close")} onPress={() => setIsFilterSheetOpen(false)} />
                  </View>
                </View>
              </View>
            </BottomSheet>

            {visibleGroups.length === 0 ? (
              <EmptyState message={t("exams.noMatches")} />
            ) : (
              visibleGroups.map((group) => (
                <CourseExamGroup
                  chapters={group.chapters}
                  courseTitle={group.course.title}
                  isOpen={isSearching || openCourseIds.has(group.course.id)}
                  isPending={group.isLoading}
                  isStudent={isStudent}
                  key={group.course.id}
                  onToggle={() => toggleCourse(group.course.id)}
                  subtitle={group.course.subtitle}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clearLink: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  content: { gap: spacing.md, padding: spacing.lg },
  filterBadge: {
    alignItems: "center",
    backgroundColor: colors.onAccent,
    borderRadius: radius.full,
    height: 12,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 12
  },
  filterBadgeText: { color: colors.accent, fontFamily: fonts.displayBold, fontSize: 8 },
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
  matchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingVertical: spacing.md
  },
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
    justifyContent: "space-between",
    paddingBottom: spacing.md
  },
  sheetLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 11,
    letterSpacing: 0.66,
    textTransform: "uppercase"
  },
  sheetSection: { gap: spacing.xs }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
