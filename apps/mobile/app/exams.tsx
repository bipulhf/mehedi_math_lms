import { useQueries, useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CourseExamGroup } from "@/src/components/course-exam-group";
import {
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Field,
  Heading,
  Screen,
  SkeletonBlock
} from "@/src/components/ui";
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
import { spacing } from "@/src/theme/tokens";

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
            <Card style={{ gap: spacing.md }}>
              <Field
                label={t("exams.search")}
                onChangeText={(value) => setFilters({ ...filters, search: value })}
                placeholder={t("exams.search")}
                value={filters.search}
              />

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

              {/* Draft/published is staff-only, because a student is never
                  shown a draft in the first place. */}
              {isStudent ? null : (
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
              )}

              {isSearching ? (
                <Button
                  label={t("exams.clearFilters")}
                  onPress={() => setFilters(emptyExamFilters)}
                  size="sm"
                  variant="ghost"
                />
              ) : null}
            </Card>

            {isSearching ? (
              <Caption tone="faint">
                {t("exams.matchCount", { count: format.number(matchCount) })}
              </Caption>
            ) : null}

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
  content: { gap: spacing.md, padding: spacing.lg },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
