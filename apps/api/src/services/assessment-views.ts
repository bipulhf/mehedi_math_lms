import type { SubmissionSummaryRecord } from "@/repositories/test-repository";

/**
 * The response shapes the assessment endpoints return, and the mapping from
 * repository records onto them. Dates become ISO strings here, which is the
 * service layer's job — see `apps/api/AGENTS.md`.
 */
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
  /** Completed attempts (SUBMITTED/GRADED) used so far. Null for a non-student view. */
  attemptsRemaining: number | null;
  attemptsUsed: number | null;
  chapterId: string;
  description: string | null;
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
  lockAnswerOnSelect: boolean;
  /** Null means unlimited retakes. */
  maxAttempts: number | null;
  passingScore: number | null;
  questionCount: number;
  sortOrder: number;
  title: string;
  totalMarks: number;
  type: "MCQ" | "WRITTEN" | "MIXED";
}

export interface AssessmentChapterSummary {
  chapterId: string;
  chapterTitle: string;
  tests: readonly AssessmentTestSummary[];
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
  /** Null when never graded. See `isTestPassed`. */
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
  gradedById: string | null;
  testId: string;
}

export interface AssessmentTestDetail extends AssessmentTestSummary {
  questions: readonly AssessmentQuestion[];
}

export function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

/**
 * A Test is passed when its score reaches the passing score. A null score
 * (never graded) has no verdict yet — callers that need a strict boolean
 * (course completion) must treat null as "not passed." A null or zero
 * passing score is a threshold nobody opted into, so any graded score
 * clears it. ADR-0005.
 */
export function isTestPassed(score: number | null, passingScore: number | null): boolean | null {
  if (score === null) {
    return null;
  }

  return score >= (passingScore ?? 0);
}

export function mapSubmissionSummary(
  record: SubmissionSummaryRecord,
  passingScore: number | null
): SubmissionSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    feedback: record.feedback,
    gradedAt: record.gradedAt?.toISOString() ?? null,
    id: record.id,
    maxScore: record.maxScore,
    passed: isTestPassed(record.score, passingScore),
    score: record.score,
    startedAt: record.startedAt?.toISOString() ?? null,
    status: record.status,
    submittedAt: record.submittedAt?.toISOString() ?? null,
    user: {
      email: record.userEmail,
      id: record.userId,
      name: record.userName
    }
  };
}

export function mapSubmissionDetail(
  record: SubmissionSummaryRecord,
  answers: readonly SubmissionAnswerView[],
  passingScore: number | null
): SubmissionDetail {
  return {
    ...mapSubmissionSummary(record, passingScore),
    answers,
    gradedById: record.gradedById,
    testId: record.testId
  };
}
