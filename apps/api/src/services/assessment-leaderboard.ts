import type { SubmissionSummaryRecord } from "@/repositories/test-repository";

/**
 * One student's place on one MCQ test.
 *
 * A leaderboard is built from a person's *best* attempt, not their latest and
 * not an average: retaking is allowed and encouraged, and a board that punished
 * a second try would quietly discourage the thing the retakes are for.
 */
export interface LeaderboardEntry {
  /** Graded attempts this student has made. Context for the score, not part of the ranking. */
  attempts: number;
  /** How long the ranked attempt took. Null when the attempt has no start time. */
  durationMs: number | null;
  isCurrentUser: boolean;
  maxScore: number | null;
  /** Shared by ties, and the next rank skips: 1, 2, 2, 4. */
  rank: number;
  score: number;
  submissionId: string;
  submittedAt: string | null;
  user: {
    id: string;
    name: string;
  };
}

interface RankedAttempt {
  attempts: number;
  durationMs: number | null;
  record: SubmissionSummaryRecord;
}

function durationOf(record: SubmissionSummaryRecord): number | null {
  if (!record.startedAt || !record.submittedAt) {
    return null;
  }

  const elapsed = record.submittedAt.getTime() - record.startedAt.getTime();

  // A clock that went backwards is not a fast answer. Treat it as unknown
  // rather than letting it win every tie on the board.
  return elapsed >= 0 ? elapsed : null;
}

/**
 * Which of two attempts by the same person is the one to show.
 *
 * Score first. Then time taken, because two full marks are not the same
 * achievement if one took four minutes and the other forty -- and a student
 * with no start time recorded cannot beat one who has a time, or the missing
 * data would rank as infinitely fast. Finally the earlier submission, so the
 * order is total and the board does not shuffle between reads.
 */
function compare(left: RankedAttempt, right: RankedAttempt): number {
  const leftScore = left.record.score ?? 0;
  const rightScore = right.record.score ?? 0;

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  if (left.durationMs !== right.durationMs) {
    if (left.durationMs === null) {
      return 1;
    }

    if (right.durationMs === null) {
      return -1;
    }

    return left.durationMs - right.durationMs;
  }

  const leftSubmitted = left.record.submittedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightSubmitted = right.record.submittedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

  return leftSubmitted - rightSubmitted;
}

function isBetter(candidate: RankedAttempt, incumbent: RankedAttempt): boolean {
  return compare(candidate, incumbent) < 0;
}

/**
 * The board for one test, best attempt per student, highest first.
 *
 * Only graded attempts with a score count. On an MCQ test that is every
 * submitted attempt -- the paper marks itself -- so in practice the only rows
 * left out are the ones still open in somebody's browser.
 */
export function buildLeaderboard(
  records: readonly SubmissionSummaryRecord[],
  currentUserId: string
): readonly LeaderboardEntry[] {
  const bestByUser = new Map<string, RankedAttempt>();

  for (const record of records) {
    if (record.status !== "GRADED" || record.score === null) {
      continue;
    }

    const candidate: RankedAttempt = {
      attempts: 1,
      durationMs: durationOf(record),
      record
    };
    const incumbent = bestByUser.get(record.userId);

    if (!incumbent) {
      bestByUser.set(record.userId, candidate);
      continue;
    }

    candidate.attempts = incumbent.attempts + 1;

    bestByUser.set(record.userId, isBetter(candidate, incumbent) ? candidate : {
      ...incumbent,
      attempts: candidate.attempts
    });
  }

  const ranked = [...bestByUser.values()].sort(compare);

  let lastScore: number | null = null;
  let lastDuration: number | null = null;
  let lastRank = 0;

  return ranked.map((attempt, index) => {
    const score = attempt.record.score ?? 0;
    const isTie = index > 0 && score === lastScore && attempt.durationMs === lastDuration;
    const rank = isTie ? lastRank : index + 1;

    lastScore = score;
    lastDuration = attempt.durationMs;
    lastRank = rank;

    return {
      attempts: attempt.attempts,
      durationMs: attempt.durationMs,
      isCurrentUser: attempt.record.userId === currentUserId,
      maxScore: attempt.record.maxScore,
      rank,
      score,
      submissionId: attempt.record.id,
      submittedAt: attempt.record.submittedAt?.toISOString() ?? null,
      user: {
        id: attempt.record.userId,
        name: attempt.record.userName
      }
    };
  });
}
