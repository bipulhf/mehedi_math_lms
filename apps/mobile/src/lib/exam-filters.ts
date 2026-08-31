import type { AssessmentChapterSummary, AssessmentTestSummary } from "@/src/lib/api/tests";

/**
 * The pure half of the exams list — what a filter keeps and what it drops.
 *
 * Kept beside the screen rather than shared with the web app for the same
 * reason `marking-work-list.ts` is: the two apps agree on the rule, not on the
 * view types it reads.
 */

export type ExamKindFilter = "ALL" | "MCQ" | "WRITTEN";
export type ExamStatusFilter = "ALL" | "DRAFT" | "PUBLISHED";

export interface ExamFilterState {
  kind: ExamKindFilter;
  search: string;
  status: ExamStatusFilter;
}

export const emptyExamFilters: ExamFilterState = { kind: "ALL", search: "", status: "ALL" };

export function isFiltering(filters: ExamFilterState): boolean {
  return filters.kind !== "ALL" || filters.status !== "ALL" || filters.search.trim().length > 0;
}

/**
 * The filters applied to one course's chapters.
 *
 * A search matches either the course or an exam inside it: typing a course name
 * should leave that course's exams alone rather than filtering them all away,
 * which is why the course match is passed in rather than re-derived here.
 */
export function filterChapters(
  chapters: readonly AssessmentChapterSummary[],
  filters: ExamFilterState,
  courseMatchesSearch: boolean
): readonly AssessmentChapterSummary[] {
  const search = filters.search.trim().toLowerCase();

  const matchesExam = (test: AssessmentTestSummary): boolean => {
    if (filters.kind !== "ALL" && test.type !== filters.kind) {
      return false;
    }

    if (filters.status === "PUBLISHED" && !test.isPublished) {
      return false;
    }

    if (filters.status === "DRAFT" && test.isPublished) {
      return false;
    }

    return search.length === 0 || courseMatchesSearch || test.title.toLowerCase().includes(search);
  };

  return chapters
    .map((chapter) => ({ ...chapter, tests: chapter.tests.filter(matchesExam) }))
    .filter((chapter) => chapter.tests.length > 0);
}

export function countExams(chapters: readonly AssessmentChapterSummary[]): number {
  return chapters.reduce((total, chapter) => total + chapter.tests.length, 0);
}
