import type { z } from "zod";
import type {
  addScriptPageSchema,
  createQuestionSchema,
  createTestSchema,
  MarkingDocument,
  MarkingReviewMode,
  TestType,
  reorderCourseItemsSchema,
  reorderQuestionsSchema,
  reorderScriptPagesSchema,
  saveSubmissionAnswersSchema,
  setAnswerMarkSchema,
  submitPaperSchema,
  submitTestSchema,
  updateQuestionSchema,
  updateTestSchema
} from "@mma/shared";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";
import { clientEnv } from "@/lib/env";

export interface AssessmentOption {
  id: string;
  isCorrect: boolean | null;
  optionText: string;
  sortOrder: number;
}

export interface AssessmentQuestionImage {
  fileUrl: string;
  id: string;
  sortOrder: number;
}

export interface AssessmentQuestion {
  id: string;
  images: readonly AssessmentQuestionImage[];
  /** Staff only — the model answer. Null for a student. */
  markingGuide: string | null;
  marks: number;
  options: readonly AssessmentOption[];
  questionText: string;
  sortOrder: number;
}

export interface AssessmentTestSummary {
  attemptsRemaining: number | null;
  attemptsUsed: number | null;
  chapterId: string;
  description: string | null;
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
  lockAnswerOnSelect: boolean;
  maxAttempts: number | null;
  passingScore: number | null;
  questionCount: number;
  sortOrder: number;
  title: string;
  totalMarks: number;
  type: "MCQ" | "WRITTEN";
}

export interface AssessmentChapterSummary {
  chapterId: string;
  chapterTitle: string;
  tests: readonly AssessmentTestSummary[];
}

export interface AssessmentTestDetail extends AssessmentTestSummary {
  questions: readonly AssessmentQuestion[];
}

export interface ScriptPageView {
  fileUrl: string;
  height: number | null;
  id: string;
  marking: MarkingDocument;
  sortOrder: number;
  width: number | null;
}

export interface SubmissionAnswerView {
  awardedMarks: number | null;
  id: string;
  isCorrect: boolean | null;
  questionId: string;
  scriptPages: readonly ScriptPageView[];
  selectedOptionId: string | null;
}

export interface SubmissionSummary {
  attemptNumber: number;
  createdAt: string;
  feedback: string | null;
  gradedAt: string | null;
  id: string;
  maxScore: number | null;
  passed: boolean | null;
  score: number | null;
  startedAt: string | null;
  status: "STARTED" | "SUBMITTED" | "GRADED";
  submittedAt: string | null;
  user: {
    email: string;
    id: string;
    name: string;
  };
}

export interface SubmissionDetail extends SubmissionSummary {
  answers: readonly SubmissionAnswerView[];
  /** True only for the exact submission whose grading just finished the course. */
  courseCompletedJustNow: boolean;
  gradedById: string | null;
  testId: string;
}

/** One row of an MCQ test's board. Best attempt per student, ties share a rank. */
export interface LeaderboardEntry {
  attempts: number;
  durationMs: number | null;
  isCurrentUser: boolean;
  maxScore: number | null;
  rank: number;
  score: number;
  submissionId: string;
  submittedAt: string | null;
  user: {
    id: string;
    name: string;
  };
}

export type { TestType };

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ReorderCourseItemsInput = z.infer<typeof reorderCourseItemsSchema>;
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
export type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
export type SubmitTestInput = z.infer<typeof submitTestSchema>;
export type AddScriptPageInput = z.infer<typeof addScriptPageSchema>;
export type ReorderScriptPagesInput = z.infer<typeof reorderScriptPagesSchema>;
export type SetAnswerMarkInput = z.infer<typeof setAnswerMarkSchema>;
export type SubmitPaperInput = z.infer<typeof submitPaperSchema>;

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

export async function getCourseAssessments(
  courseId: string
): Promise<readonly AssessmentChapterSummary[]> {
  const response = await apiGet<readonly AssessmentChapterSummary[]>(`courses/${courseId}/tests`);

  return response.data;
}

export async function createTest(
  chapterId: string,
  values: CreateTestInput
): Promise<AssessmentTestSummary> {
  const response = await apiPost<CreateTestInput, AssessmentTestSummary>(
    `chapters/${chapterId}/tests`,
    values
  );

  return response.data;
}

export async function getTestDetail(
  testId: string,
  revealAnswers = false
): Promise<AssessmentTestDetail> {
  const response = await apiGet<AssessmentTestDetail>(
    `tests/${testId}${revealAnswers ? "?revealAnswers=true" : ""}`
  );

  return response.data;
}

export async function updateTest(
  testId: string,
  values: UpdateTestInput
): Promise<AssessmentTestSummary> {
  const response = await apiPut<UpdateTestInput, AssessmentTestSummary>(`tests/${testId}`, values);

  return response.data;
}

export async function deleteTest(testId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`tests/${testId}`);

  return response.data;
}

export async function createQuestion(
  testId: string,
  values: CreateQuestionInput
): Promise<AssessmentQuestion> {
  const response = await apiPost<CreateQuestionInput, AssessmentQuestion>(
    `tests/${testId}/questions`,
    values
  );

  return response.data;
}

export async function updateQuestion(
  questionId: string,
  values: UpdateQuestionInput
): Promise<AssessmentQuestion> {
  const response = await apiPut<UpdateQuestionInput, AssessmentQuestion>(
    `questions/${questionId}`,
    values
  );

  return response.data;
}

export async function deleteQuestion(questionId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`questions/${questionId}`);

  return response.data;
}

export async function reorderQuestions(
  testId: string,
  values: ReorderQuestionsInput
): Promise<AssessmentTestDetail> {
  const response = await apiPatch<ReorderQuestionsInput, AssessmentTestDetail>(
    `tests/${testId}/questions/reorder`,
    values
  );

  return response.data;
}

export async function reorderCourseItems(
  chapterId: string,
  values: ReorderCourseItemsInput
): Promise<{ chapterId: string }> {
  const response = await apiPatch<ReorderCourseItemsInput, { chapterId: string }>(
    `chapters/${chapterId}/items/reorder`,
    values
  );

  return response.data;
}

export async function startSubmission(testId: string): Promise<SubmissionDetail> {
  const response = await apiPost<Record<string, never>, SubmissionDetail>(
    `tests/${testId}/submissions/start`,
    {}
  );

  return response.data;
}

export async function saveSubmissionAnswers(
  submissionId: string,
  values: SaveSubmissionAnswersInput
): Promise<SubmissionDetail> {
  const response = await apiPut<SaveSubmissionAnswersInput, SubmissionDetail>(
    `tests/submissions/${submissionId}/answers`,
    values
  );

  return response.data;
}

export async function submitTest(
  testId: string,
  values: SubmitTestInput
): Promise<SubmissionDetail> {
  const response = await apiPost<SubmitTestInput, SubmissionDetail>(
    `tests/${testId}/submit`,
    values
  );

  return response.data;
}

/**
 * The same submit, sent from a document that is being torn down.
 *
 * `keepalive` is the whole point: a closing tab cancels its in-flight requests,
 * and this is the one that has to outlive the page. It goes through `fetch`
 * rather than the shared client because nothing here can be awaited or
 * retried, and there is no response to read.
 */
export function submitTestOnUnload(testId: string, values: SubmitTestInput): void {
  void fetch(`${clientEnv.apiBaseUrl}/tests/${testId}/submit`, {
    body: JSON.stringify(values),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST"
  }).catch(() => {
    // There is no page left to tell.
  });
}

export async function listTestSubmissions(testId: string): Promise<readonly SubmissionSummary[]> {
  const response = await apiGet<readonly SubmissionSummary[]>(`tests/${testId}/submissions`);

  return response.data;
}

export async function listMyTestSubmissions(
  testId: string
): Promise<readonly SubmissionSummary[]> {
  const response = await apiGet<readonly SubmissionSummary[]>(`tests/${testId}/submissions/mine`);

  return response.data;
}

/** MCQ tests only — the API rejects the rest, so do not offer the link for them. */
export async function getTestLeaderboard(
  testId: string
): Promise<readonly LeaderboardEntry[]> {
  const response = await apiGet<readonly LeaderboardEntry[]>(`tests/${testId}/leaderboard`);

  return response.data;
}

export async function getSubmissionDetail(submissionId: string): Promise<SubmissionDetail> {
  const response = await apiGet<SubmissionDetail>(`tests/submissions/${submissionId}`);

  return response.data;
}

export async function addScriptPage(
  submissionId: string,
  values: AddScriptPageInput
): Promise<readonly ScriptPageView[]> {
  const response = await apiPost<AddScriptPageInput, readonly ScriptPageView[]>(
    `scripts/submissions/${submissionId}/pages`,
    values
  );

  return response.data;
}

export async function reorderScriptPages(
  submissionId: string,
  values: ReorderScriptPagesInput
): Promise<readonly ScriptPageView[]> {
  const response = await apiPatch<ReorderScriptPagesInput, readonly ScriptPageView[]>(
    `scripts/submissions/${submissionId}/pages/order`,
    values
  );

  return response.data;
}

export async function removeScriptPage(pageId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`scripts/pages/${pageId}`);

  return response.data;
}

export async function getMarkingQueue(
  testId: string,
  mode: MarkingReviewMode
): Promise<MarkingQueueView> {
  const response = await apiGet<MarkingQueueView>(`scripts/tests/${testId}/marking?mode=${mode}`);

  return response.data;
}

/** Opening an answer claims it, so nobody else marks the same one at once. */
export async function claimAnswer(answerId: string): Promise<MarkingAnswerView> {
  const response = await apiPost<Record<string, never>, MarkingAnswerView>(
    `scripts/answers/${answerId}/claim`,
    {}
  );

  return response.data;
}

export async function renewAnswerClaim(answerId: string): Promise<{ expiresInMs: number }> {
  const response = await apiPatch<Record<string, never>, { expiresInMs: number }>(
    `scripts/answers/${answerId}/claim`,
    {}
  );

  return response.data;
}

export async function releaseAnswerClaim(answerId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`scripts/answers/${answerId}/claim`);

  return response.data;
}

export async function setAnswerMark(
  answerId: string,
  values: SetAnswerMarkInput
): Promise<{ awardedMarks: number; id: string }> {
  const response = await apiPut<SetAnswerMarkInput, { awardedMarks: number; id: string }>(
    `scripts/answers/${answerId}/mark`,
    values
  );

  return response.data;
}

export async function saveScriptPageMarking(
  pageId: string,
  marking: MarkingDocument
): Promise<{ id: string }> {
  const response = await apiPut<{ marking: MarkingDocument }, { id: string }>(
    `scripts/pages/${pageId}/marking`,
    { marking }
  );

  return response.data;
}

export async function submitPaper(
  submissionId: string,
  values: SubmitPaperInput
): Promise<{ score: number; submissionId: string }> {
  const response = await apiPost<SubmitPaperInput, { score: number; submissionId: string }>(
    `scripts/submissions/${submissionId}/marking/submit`,
    values
  );

  return response.data;
}

export async function reopenPaper(submissionId: string): Promise<{ submissionId: string }> {
  const response = await apiPost<Record<string, never>, { submissionId: string }>(
    `scripts/submissions/${submissionId}/marking/reopen`,
    {}
  );

  return response.data;
}
