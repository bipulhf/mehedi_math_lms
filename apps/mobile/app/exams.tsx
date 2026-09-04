import { useQueries, useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { CourseExamGroup } from "@/src/components/course-exam-group";
import { FilterSheet, type FilterSection } from "@/src/components/filter-sheet";
import { Caption, Card, EmptyState, IconButton, Screen, SkeletonBlock } from "@/src/components/ui";
import { CurvedHeader, HeaderBar } from "@/src/components/ui-layout";
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

import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

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
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
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
  // A student has no drafts to filter by, so that group is not shown to them.
  const activeFilterCount = [filters.kind !== "ALL", !isStudent && filters.status !== "ALL"].filter(
    Boolean
  ).length;
  const filterSections: readonly FilterSection[] = [
    {
      key: "kind",
      kind: "choice",
      label: t("qe.type"),
      onChange: (value) => setFilters({ ...filters, kind: value as ExamKindFilter }),
      options: kinds.map((kind) => ({ label: kind.label, value: kind.value })),
      value: filters.kind
    },
    ...(isStudent
      ? []
      : [
          {
            key: "status",
            kind: "choice" as const,
            label: t("mine.colStatus"),
            onChange: (value: string) =>
              setFilters({ ...filters, status: value as ExamStatusFilter }),
            options: statuses.map((status) => ({ label: status.label, value: status.value })),
            value: filters.status
          }
        ])
  ];

  const header = (
    <CurvedHeader overlap={false} style={styles.header}>
      <HeaderBar
        left={
          <IconButton
            accessibilityLabel={t("common.back")}
            icon="chevron-back"
            onPress={() => router.back()}
            tone="onPaper"
          />
        }
        right={
          <IconButton
            accessibilityLabel={t("exams.title")}
            badge={isSearching}
            icon="options"
            onPress={() => {
              void Haptics.selectionAsync();
              setIsFilterSheetOpen(true);
            }}
            tone="onPaper"
          />
        }
        subtitle={isStudent ? t("exams.studentLead") : t("exams.staffLead")}
        title={t("exams.title")}
      />

      <View style={styles.searchWrap}>
        <Ionicons color={colors.mutedFaint} name="search" size={19} />
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
    </CurvedHeader>
  );

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={96} />
          <SkeletonBlock height={72} />
          <SkeletonBlock height={72} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {courses.length === 0 ? (
          <EmptyState message={t("exams.noCourses")} />
        ) : (
          <>

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

            {visibleGroups.length === 0 ? (
              <EmptyState message={t("exams.noMatches")} />
            ) : (
              <Card flush>
                {visibleGroups.map((group) => (
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
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <FilterSheet
        activeCount={activeFilterCount}
        isPresented={isFilterSheetOpen}
        onClear={() => {
          setFilters(emptyExamFilters);
          setIsFilterSheetOpen(false);
        }}
        onDismiss={() => setIsFilterSheetOpen(false)}
        sections={filterSections}
        summary={t("exams.matchCount", { count: format.number(matchCount) })}
        title={t("courses.filters")}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  clearLink: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.lg, paddingBottom: spacing.lg },
  matchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  searchInput: {
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
