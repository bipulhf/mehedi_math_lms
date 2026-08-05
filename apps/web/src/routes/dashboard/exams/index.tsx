import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { CourseExamGroup } from "@/components/exams/course-exam-group";
import { ExamFilterBar } from "@/components/exams/exam-filter-bar";
import {
  countExams,
  emptyExamFilters,
  type ExamFilterState,
  filterChapters,
  isFiltering
} from "@/components/exams/exam-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CourseSummary } from "@/lib/api/courses";
import { listCourses } from "@/lib/api/courses";
import { listMyEnrollments } from "@/lib/api/enrollments";
import { getCourseAssessments } from "@/lib/api/tests";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/** The course list endpoint's own maximum. */
const pageSize = 50;

export const Route = createFileRoute("/dashboard/exams/")({
  head: () =>
    seo({
      description: "Every exam on your courses, in one place.",
      path: "/dashboard/exams",
      title: "Exams"
    }),
  component: ExamsPage,
  errorComponent: RouteErrorView
} as never);

/**
 * Every course the caller can manage, not just the first page of them.
 *
 * The list endpoint caps a page at 50, so an admin with more courses than that
 * would otherwise silently lose the tail — and a course missing from this list
 * is a course whose exams nobody can reach.
 */
async function listAllStaffCourses(mine: boolean): Promise<readonly CourseSummary[]> {
  const firstPage = await listCourses({ limit: pageSize, mine, page: 1 });
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.pagination.pages - 1) },
    (_unused, index) => index + 2
  );
  const rest = await Promise.all(
    remainingPages.map(async (page) => listCourses({ limit: pageSize, mine, page }))
  );

  return [firstPage, ...rest].flatMap((response) => response.data);
}

interface ExamCourse {
  id: string;
  subtitle: string;
  title: string;
}

/**
 * Exams, course by course, on one page.
 *
 * The same list for everyone — a teacher opens a course to mark its papers and a
 * student opens it to see how they did — so the page is the reader's courses
 * either way, and only the source and the actions differ.
 */
function ExamsPage(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useAuthSession();
  const role = session?.session.role;
  const isStudent = role === "STUDENT";
  const isStaff = role === "TEACHER" || role === "ADMIN";
  const [openCourseIds, setOpenCourseIds] = useState<ReadonlySet<string>>(new Set());
  const [filters, setFilters] = useState<ExamFilterState>(emptyExamFilters);

  const staffCourses = useQuery({
    enabled: isStaff,
    queryFn: async () => listAllStaffCourses(role === "TEACHER"),
    queryKey: queryKeys.courses.list({ exams: true, mine: role === "TEACHER" })
  });
  const enrollments = useQuery({
    enabled: isStudent,
    queryFn: async () => listMyEnrollments(),
    queryKey: queryKeys.enrollments.mine()
  });

  const isPending =
    isSessionPending ||
    (isStaff && staffCourses.isPending) ||
    (isStudent && enrollments.isPending);

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
        subtitle: `${course.category.name} · ${format.number(course.stats.lectureCount)} ${t("common.lessons")}`,
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
      queryKey: queryKeys.tests.byCourse(course.id),
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

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        description={isStudent ? t("exams.studentLead") : t("exams.staffLead")}
        title={t("exams.title")}
      />

      {courses.length === 0 ? (
        <EmptyState message={t("exams.noCourses")} />
      ) : (
        <>
          <ExamFilterBar filters={filters} isStudent={isStudent} onChange={setFilters} />

          {isSearching ? (
            <p className="label-mono text-xs uppercase text-muted-faint">
              {t("exams.matchCount", { count: format.number(matchCount) })}
            </p>
          ) : null}

          {visibleGroups.length === 0 ? (
            <EmptyState message={t("exams.noMatches")} />
          ) : (
            <div className="border-t border-hairline">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
