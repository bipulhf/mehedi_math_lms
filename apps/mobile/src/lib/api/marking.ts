import type { MarkingDocument, MarkingReviewMode } from "@mma/shared";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/src/lib/api-client";
import type { ScriptPageView } from "@/src/lib/api/tests";

/** The teacher's grading queue: claiming an answer, marking it, handing the paper back. */

export interface MarkingQuestionView {
  answerId: string | null;
  awardedMarks: number | null;
  id: string;
  lockedByName: string | null;
  markingGuide: string | null;
  marks: number;
  pageCount: number;
  questionText: string;
  sortOrder: number;
}

export interface MarkingPaperView {
  attemptNumber: number;
  isComplete: boolean;
  markedCount: number;
  questions: readonly MarkingQuestionView[];
  status: "STARTED" | "SUBMITTED" | "GRADED";
  student: { email: string; id: string; name: string };
  submissionId: string;
  toMarkCount: number;
}

export interface MarkingQueueView {
  mode: MarkingReviewMode;
  papers: readonly MarkingPaperView[];
  testId: string;
  testTitle: string;
  totalMarks: number;
}

export interface MarkingAnswerView {
  awardedMarks: number | null;
  id: string;
  lockedByName: string | null;
  markingGuide: string | null;
  marks: number;
  pages: readonly ScriptPageView[];
  questionId: string;
  questionText: string;
  student: { id: string; name: string };
  submissionId: string;
}

export async function getMarkingQueue(
  testId: string,
  mode: MarkingReviewMode
): Promise<MarkingQueueView> {
  return apiGet<MarkingQueueView>(`scripts/tests/${testId}/marking?mode=${mode}`);
}

/** Opening an answer claims it, so two teachers cannot mark the same one at once. */
export async function claimAnswer(answerId: string): Promise<MarkingAnswerView> {
  return apiPost<undefined, MarkingAnswerView>(`scripts/answers/${answerId}/claim`);
}

export async function renewAnswerClaim(answerId: string): Promise<{ expiresInMs: number }> {
  return apiPatch<Record<string, never>, { expiresInMs: number }>(
    `scripts/answers/${answerId}/claim`,
    {}
  );
}

export async function releaseAnswerClaim(answerId: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`scripts/answers/${answerId}/claim`);
}

export async function setAnswerMark(
  answerId: string,
  input: { awardedMarks: number }
): Promise<{ awardedMarks: number; id: string }> {
  return apiPut<typeof input, { awardedMarks: number; id: string }>(
    `scripts/answers/${answerId}/mark`,
    input
  );
}

export async function saveScriptPageMarking(
  pageId: string,
  marking: MarkingDocument
): Promise<{ id: string }> {
  return apiPut<{ marking: MarkingDocument }, { id: string }>(`scripts/pages/${pageId}/marking`, {
    marking
  });
}

export async function submitPaper(
  submissionId: string,
  input: { feedback?: string | undefined }
): Promise<{ score: number; submissionId: string }> {
  return apiPost<typeof input, { score: number; submissionId: string }>(
    `scripts/submissions/${submissionId}/marking/submit`,
    input
  );
}
