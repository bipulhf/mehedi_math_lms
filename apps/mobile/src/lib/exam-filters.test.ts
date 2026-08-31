import type { AssessmentChapterSummary, AssessmentTestSummary } from "@/src/lib/api/tests";
import {
  countExams,
  emptyExamFilters,
  filterChapters,
  isFiltering
} from "@/src/lib/exam-filters";

/**
 * The exams list narrows entirely in memory — every filter reads something the
 * assessment list already carries — so the rules are asserted here rather than
 * through the screen.
 */

function exam(overrides: Partial<AssessmentTestSummary>): AssessmentTestSummary {
  return {
    attemptsRemaining: null,
    attemptsUsed: null,
    chapterId: "chapter-1",
    description: null,
    durationInMinutes: null,
    id: "test-1",
    isPublished: true,
    lockAnswerOnSelect: false,
    maxAttempts: null,
    passingScore: null,
    questionCount: 5,
    sortOrder: 1,
    title: "Vectors",
    totalMarks: 25,
    type: "MCQ",
    ...overrides
  };
}

const chapters: readonly AssessmentChapterSummary[] = [
  {
    chapterId: "chapter-1",
    chapterTitle: "Algebra",
    tests: [
      exam({ id: "mcq", title: "Vectors", type: "MCQ" }),
      exam({ id: "written", isPublished: false, title: "Integration", type: "WRITTEN" })
    ]
  }
];

describe("isFiltering", () => {
  test("the empty state is not a filter", () => {
    expect(isFiltering(emptyExamFilters)).toBe(false);
  });

  test("whitespace alone is not a search", () => {
    expect(isFiltering({ ...emptyExamFilters, search: "   " })).toBe(false);
  });
});

describe("filterChapters", () => {
  test("keeps only the chosen kind", () => {
    const kept = filterChapters(chapters, { ...emptyExamFilters, kind: "WRITTEN" }, false);

    expect(countExams(kept)).toBe(1);
    expect(kept[0]?.tests[0]?.id).toBe("written");
  });

  test("draft and published are separable", () => {
    const published = filterChapters(chapters, { ...emptyExamFilters, status: "PUBLISHED" }, false);
    const drafts = filterChapters(chapters, { ...emptyExamFilters, status: "DRAFT" }, false);

    expect(published[0]?.tests.map((item) => item.id)).toEqual(["mcq"]);
    expect(drafts[0]?.tests.map((item) => item.id)).toEqual(["written"]);
  });

  test("a search matching the course keeps every exam in it", () => {
    const kept = filterChapters(chapters, { ...emptyExamFilters, search: "higher maths" }, true);

    expect(countExams(kept)).toBe(2);
  });

  test("a search matching no exam empties the course", () => {
    const kept = filterChapters(chapters, { ...emptyExamFilters, search: "trigonometry" }, false);

    expect(kept).toHaveLength(0);
  });

  test("a chapter left with no exams is dropped rather than shown empty", () => {
    const kept = filterChapters(chapters, { ...emptyExamFilters, search: "vectors" }, false);

    expect(kept).toHaveLength(1);
    expect(kept[0]?.tests).toHaveLength(1);
  });
});
