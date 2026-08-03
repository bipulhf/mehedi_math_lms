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
  chapterId: string;
  description: string | null;
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
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

export function mapSubmissionSummary(record: SubmissionSummaryRecord): SubmissionSummary {
  return {
    createdAt: record.createdAt.toISOString(),
    feedback: record.feedback,
    gradedAt: record.gradedAt?.toISOString() ?? null,
    id: record.id,
    maxScore: record.maxScore,
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
  answers: readonly SubmissionAnswerView[]
): SubmissionDetail {
  return {
    ...mapSubmissionSummary(record),
    answers,
    gradedById: record.gradedById,
    testId: record.testId
  };
}
