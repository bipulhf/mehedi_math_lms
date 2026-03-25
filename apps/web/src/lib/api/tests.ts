import type { z } from "zod";
import {
  createQuestionSchema,
  createTestSchema,
  gradeSubmissionSchema,
  reorderQuestionsSchema,
  saveSubmissionAnswersSchema,
  submitTestSchema,
  updateQuestionSchema,
  updateTestSchema
} from "@mma/shared";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";

export interface AssessmentOption {
  id: string;
  isCorrect: boolean | null;
  optionText: string;
  sortOrder: number;
}

export interface AssessmentQuestion {
  expectedAnswer: string | null;
  id: string;
  marks: number;
  options: readonly AssessmentOption[];
  questionText: string;
  sortOrder: number;
  type: "MCQ" | "WRITTEN";
}

export interface AssessmentTestSummary {
  chapterId: string;
  description: string | null;
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
  passingScore: number | null;
  questionCount: number;
  title: string;
  totalMarks: number;
  type: "MCQ" | "WRITTEN" | "MIXED";
}

export interface AssessmentChapterSummary {
  chapterId: string;
  chapterTitle: string;
  tests: readonly AssessmentTestSummary[];
}

export interface AssessmentTestDetail extends AssessmentTestSummary {
  questions: readonly AssessmentQuestion[];
}

export interface SubmissionAnswerView {
  awardedMarks: number | null;
  id: string;
  isCorrect: boolean | null;
  questionId: string;
  selectedOptionId: string | null;
  writtenAnswer: string | null;
}

export interface SubmissionSummary {
  createdAt: string;
  feedback: string | null;
  gradedAt: string | null;
  id: string;
  maxScore: number | null;
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
  gradedById: string | null;
  testId: string;
}

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
export type SaveSubmissionAnswersInput = z.infer<typeof saveSubmissionAnswersSchema>;
export type SubmitTestInput = z.infer<typeof submitTestSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

export async function getCourseAssessments(courseId: string): Promise<readonly AssessmentChapterSummary[]> {
  const response = await apiGet<readonly AssessmentChapterSummary[]>(`courses/${courseId}/tests`);

  return response.data;
}

export async function createTest(chapterId: string, values: CreateTestInput): Promise<AssessmentTestSummary> {
  const response = await apiPost<CreateTestInput, AssessmentTestSummary>(`chapters/${chapterId}/tests`, values);

  return response.data;
}

export async function getTestDetail(testId: string): Promise<AssessmentTestDetail> {
  const response = await apiGet<AssessmentTestDetail>(`tests/${testId}`);

  return response.data;
}

export async function updateTest(testId: string, values: UpdateTestInput): Promise<AssessmentTestSummary> {
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
  const response = await apiPost<CreateQuestionInput, AssessmentQuestion>(`tests/${testId}/questions`, values);

  return response.data;
}

export async function updateQuestion(
  questionId: string,
  values: UpdateQuestionInput
): Promise<AssessmentQuestion> {
  const response = await apiPut<UpdateQuestionInput, AssessmentQuestion>(`questions/${questionId}`, values);

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

export async function startSubmission(testId: string): Promise<SubmissionDetail> {
  const response = await apiPost<Record<string, never>, SubmissionDetail>(`tests/${testId}/submissions/start`, {});

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

export async function submitTest(testId: string, values: SubmitTestInput): Promise<SubmissionDetail> {
  const response = await apiPost<SubmitTestInput, SubmissionDetail>(`tests/${testId}/submit`, values);

  return response.data;
}

export async function listTestSubmissions(testId: string): Promise<readonly SubmissionSummary[]> {
  const response = await apiGet<readonly SubmissionSummary[]>(`tests/${testId}/submissions`);

  return response.data;
}

export async function getSubmissionDetail(submissionId: string): Promise<SubmissionDetail> {
  const response = await apiGet<SubmissionDetail>(`tests/submissions/${submissionId}`);

  return response.data;
}

export async function gradeSubmission(
  submissionId: string,
  values: GradeSubmissionInput
): Promise<SubmissionDetail> {
  const response = await apiPut<GradeSubmissionInput, SubmissionDetail>(
    `tests/submissions/${submissionId}/grade`,
    values
  );

  return response.data;
}
