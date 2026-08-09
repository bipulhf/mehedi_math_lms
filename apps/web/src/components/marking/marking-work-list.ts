import type { MarkingReviewMode } from "@mma/shared";

import type { MarkingQueueView } from "@/lib/api/tests";

/** One answer waiting to be marked, in the order the teacher chose to work. */
export interface MarkingWorkItem {
  answerId: string;
  awardedMarks: number | null;
  lockedByName: string | null;
  marks: number;
  paperIndex: number;
  questionIndex: number;
  questionText: string;
  studentName: string;
  submissionId: string;
}

/**
 * The queue flattened into a work list.
 *
 * The two review orders are the same set of answers read two ways: down one
 * student's paper, or across every student's answer to one question. Only
 * answers that were actually attempted appear — a question with no pages scores
 * zero on its own when the paper is submitted, so there is nothing to open.
 */
export function buildMarkingWorkList(
  queue: MarkingQueueView | null,
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
        questionText: question.questionText,
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

/**
 * The next answer still without a mark, starting after `fromIndex` and wrapping
 * once. Wrapping is what makes "save and next" finish the pile rather than
 * stopping at the end of it.
 */
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
