import type { MarkingReviewMode } from "@mma/shared";

import type { MarkingQueueView } from "@/src/lib/api/marking";

/** One answer waiting to be marked, in the order the teacher chose to work. */
export interface MarkingWorkItem {
  answerId: string;
  awardedMarks: number | null;
  lockedByName: string | null;
  marks: number;
  paperIndex: number;
  questionIndex: number;
  studentName: string;
  submissionId: string;
}

/**
 * The queue flattened into a work list — the same rule as the web app's
 * `marking-work-list`, over this app's own view types.
 *
 * The two review orders are one set of answers read two ways: down a student's
 * paper, or across everyone's answer to one question. Only attempted answers
 * appear; a question with no pages scores zero on its own at submit.
 */
export function buildMarkingWorkList(
  queue: MarkingQueueView | null | undefined,
  mode: MarkingReviewMode
): readonly MarkingWorkItem[] {
  if (!queue) {
    return [];
  }

  const items: MarkingWorkItem[] = [];

  queue.papers.forEach((paper, paperIndex) => {
    if (paper.status !== "SUBMITTED") {
      return;
    }

    paper.questions.forEach((question, questionIndex) => {
      if (question.answerId === null || question.pageCount === 0) {
        return;
      }

      items.push({
        answerId: question.answerId,
        awardedMarks: question.awardedMarks,
        lockedByName: question.lockedByName,
        marks: question.marks,
        paperIndex,
        questionIndex,
        studentName: paper.student.name,
        submissionId: paper.submissionId
      });
    });
  });

  return mode === "QUESTION"
    ? [...items].sort(
        (first, second) =>
          first.questionIndex - second.questionIndex || first.paperIndex - second.paperIndex
      )
    : items;
}

/** The next unmarked answer after `fromIndex`, wrapping once so the pile finishes. */
export function findNextUnmarked(
  items: readonly MarkingWorkItem[],
  fromIndex: number
): MarkingWorkItem | null {
  for (let offset = 1; offset <= items.length; offset += 1) {
    const candidate = items[(fromIndex + offset) % items.length];

    if (candidate && candidate.awardedMarks === null) {
      return candidate;
    }
  }

  return null;
}
