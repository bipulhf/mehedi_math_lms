import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { ExamStatusLine } from "@/components/exams/exam-status-line";
import { AccordionRow } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssessmentChapterSummary } from "@/lib/api/tests";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * One course in the exams list, with its exams inside it.
 *
 * The chapters arrive already filtered — the page owns the search box, so a
 * course that survived it has at least one exam worth showing.
 */
export function CourseExamGroup({
  chapters,
  courseTitle,
  isOpen,
  isPending,
  isStudent,
  onToggle,
  subtitle
}: {
  chapters: readonly AssessmentChapterSummary[];
  courseTitle: string;
  isOpen: boolean;
  isPending: boolean;
  isStudent: boolean;
  onToggle: () => void;
  subtitle: string;
}): JSX.Element {
  const t = useT();
  const format = useFormat();
  const examCount = chapters.reduce((total, chapter) => total + chapter.tests.length, 0);

  return (
    <AccordionRow
      isOpen={isOpen}
      meta={
        isOpen && !isPending ? t("exams.examCount", { count: format.number(examCount) }) : subtitle
      }
      onToggle={onToggle}
      title={courseTitle}
    >
      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : chapters.length === 0 ? (
        <p className="border border-dashed border-dot-idle px-4 py-6 text-center text-sm text-muted">
          {t("exams.noExams")}
        </p>
      ) : (
        <div className="space-y-5">
          {chapters.map((chapter) => (
            <div className="space-y-2" key={chapter.chapterId}>
              <p className="label-mono text-xs uppercase text-muted-faint">
                {chapter.chapterTitle}
              </p>

              {chapter.tests.map((test) => (
                <div
                  className="flex flex-col gap-3 border border-hairline bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={test.id}
                >
                  <div className="min-w-0 space-y-2">
                    <p className="break-words font-medium text-ink">{test.title}</p>
                    <p className="text-sm font-light text-muted">
                      {format.number(test.questionCount)} {t("ab.questions")} ·{" "}
                      {format.number(test.totalMarks)} {t("qe.marks")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* The kind is what a reader scans this list for, so it is
                          the one thing here wearing a colour. ADR-0011. */}
                      <Badge tone={test.type === "WRITTEN" ? "teal" : "indigo"}>
                        {test.type === "WRITTEN"
                          ? t("author.examKindWritten")
                          : t("author.examKindMcq")}
                      </Badge>
                      {isStudent ? null : (
                        <Badge tone={test.isPublished ? "neutral" : "attention"}>
                          {test.isPublished ? t("common.published") : t("common.draft")}
                        </Badge>
                      )}
                      <ExamStatusLine isStudent={isStudent} testId={test.id} />
                    </div>
                  </div>

                  <Button asChild className="shrink-0" variant="outline">
                    <Link params={{ testId: test.id }} to="/dashboard/exams/$testId">
                      {isStudent ? t("exams.seeResult") : t("exams.reviewAnswers")}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </AccordionRow>
  );
}
