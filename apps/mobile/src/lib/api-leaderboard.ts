import { apiGet } from "@/src/lib/api-client";

/**
 * The MCQ board, kept out of `api.ts` on purpose: that module is already past
 * the size a single file should be, and a board is a self-contained read with
 * one caller.
 */

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
export async function getTestLeaderboard(testId: string): Promise<readonly LeaderboardEntry[]> {
  return apiGet<readonly LeaderboardEntry[]>(`tests/${testId}/leaderboard`);
}
