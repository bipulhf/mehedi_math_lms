import type { MarkingDocument } from "@mma/shared";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/src/lib/api-client";

/** Taking a test: the paper, the attempt, the answers and the answer script. */

export interface TestQuestionOption {
  id: string;
  isCorrect: boolean | null;
  optionText: string;
  sortOrder: number;
}

export interface TestQuestionImage {
  fileUrl: string;
  id: string;
  sortOrder: number;
}

export interface TestQuestion {
  id: string;
  images: readonly TestQuestionImage[];
  /** Staff only — the model answer. Null for a student. */
  markingGuide: string | null;
  marks: number;
  options: readonly TestQuestionOption[];
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
  questions: readonly TestQuestion[];
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
}

export interface SubmissionDetail extends SubmissionSummary {
  answers: readonly SubmissionAnswerView[];
  /** True only on the response to the submission that finished the course. */
  courseCompletedJustNow: boolean;
  gradedById: string | null;
  testId: string;
}

export async function getCourseAssessments(
  courseId: string
): Promise<readonly AssessmentChapterSummary[]> {
  return apiGet<readonly AssessmentChapterSummary[]>(`courses/${courseId}/tests`);
}

export async function getTestDetail(
  testId: string,
  revealAnswers = false
): Promise<AssessmentTestDetail> {
  return apiGet<AssessmentTestDetail>(
    `tests/${testId}${revealAnswers ? "?revealAnswers=true" : ""}`
  );
}

export async function startSubmission(testId: string): Promise<SubmissionDetail> {
  return apiPost<undefined, SubmissionDetail>(`tests/${testId}/submissions/start`);
}

export async function saveSubmissionAnswers(
  submissionId: string,
  input: {
    answers: readonly {
      questionId: string;
      selectedOptionId?: string | undefined;
    }[];
  }
): Promise<SubmissionDetail> {
  return apiPut<typeof input, SubmissionDetail>(`tests/submissions/${submissionId}/answers`, input);
}

/** Submitting is keyed on the *test*, and carries the answers with it. */
export async function submitTest(
  testId: string,
  input: {
    answers: readonly {
      questionId: string;
      selectedOptionId?: string | undefined;
    }[];
  }
): Promise<SubmissionDetail> {
  return apiPost<typeof input, SubmissionDetail>(`tests/${testId}/submit`, input);
}

/** The results screen. Returns the graded submission with per-answer marks. */
export async function getSubmissionDetail(submissionId: string): Promise<SubmissionDetail> {
  return apiGet<SubmissionDetail>(`tests/submissions/${submissionId}`);
}

/** Adds one photographed page to a question's Answer Script. */
export async function addScriptPage(
  submissionId: string,
  input: { questionId: string; uploadId: string }
): Promise<readonly ScriptPageView[]> {
  return apiPost<typeof input, readonly ScriptPageView[]>(
    `scripts/submissions/${submissionId}/pages`,
    input
  );
}

export async function reorderScriptPages(
  submissionId: string,
  input: { pageIds: readonly string[]; questionId: string }
): Promise<readonly ScriptPageView[]> {
  return apiPatch<typeof input, readonly ScriptPageView[]>(
    `scripts/submissions/${submissionId}/pages/order`,
    input
  );
}

export async function removeScriptPage(pageId: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`scripts/pages/${pageId}`);
}

/** Every attempt handed in on this test, for the staff who can mark it. */
export async function listTestSubmissions(testId: string): Promise<readonly SubmissionSummary[]> {
  return apiGet<readonly SubmissionSummary[]>(`tests/${testId}/submissions`);
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

/** MCQ tests only — the API rejects the rest, so do not offer the link for them. */
export async function getTestLeaderboard(
  testId: string
): Promise<readonly LeaderboardEntry[]> {
  return apiGet<readonly LeaderboardEntry[]>(`tests/${testId}/leaderboard`);
}

/** Every attempt the current student has made on this test, newest first. */
export async function listMySubmissions(testId: string): Promise<readonly SubmissionSummary[]> {
  return apiGet<readonly SubmissionSummary[]>(`tests/${testId}/submissions/mine`);
}
