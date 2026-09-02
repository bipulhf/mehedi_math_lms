import { describe, expect, test } from "bun:test";

import type { SubmissionSummaryRecord } from "@/repositories/test-repository";
import { buildLeaderboard } from "@/services/assessment-leaderboard";

/**
 * The ranking rules, stated once. Everything here is about the order two rows
 * come out in, which is the only thing a leaderboard actually promises.
 */

interface AttemptSpec {
  id: string;
  minutes?: number | null;
  score: number | null;
  status?: "STARTED" | "SUBMITTED" | "GRADED";
  submittedAt?: string;
  userId: string;
}

function attempt(spec: AttemptSpec): SubmissionSummaryRecord {
  const submittedAt = new Date(spec.submittedAt ?? "2026-01-01T10:00:00.000Z");
  const minutes = spec.minutes === undefined ? 10 : spec.minutes;
  const startedAt =
    minutes === null ? null : new Date(submittedAt.getTime() - minutes * 60 * 1000);

  return {
    createdAt: submittedAt,
    feedback: null,
    gradedAt: submittedAt,
    gradedById: null,
    id: spec.id,
    maxScore: 10,
    score: spec.score,
    startedAt,
    status: spec.status ?? "GRADED",
    submittedAt,
    testId: "test-1",
    updatedAt: submittedAt,
    userEmail: `${spec.userId}@example.test`,
    userId: spec.userId,
    userName: spec.userId
  } as SubmissionSummaryRecord;
}

describe("buildLeaderboard", () => {
  test("ranks by score, highest first", () => {
    const board = buildLeaderboard(
      [
        attempt({ id: "a", score: 4, userId: "amina" }),
        attempt({ id: "b", score: 9, userId: "bashir" }),
        attempt({ id: "c", score: 7, userId: "chandra" })
      ],
      "amina"
    );

    expect(board.map((entry) => entry.user.id)).toEqual(["bashir", "chandra", "amina"]);
    expect(board.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  test("an equal score is broken by the faster attempt", () => {
    const board = buildLeaderboard(
      [
        attempt({ id: "a", minutes: 30, score: 9, userId: "amina" }),
        attempt({ id: "b", minutes: 6, score: 9, userId: "bashir" })
      ],
      "amina"
    );

    expect(board.map((entry) => entry.user.id)).toEqual(["bashir", "amina"]);
    expect(board[0]?.durationMs).toBe(6 * 60 * 1000);
  });

  test("a missing start time never outranks a recorded one", () => {
    const board = buildLeaderboard(
      [
        attempt({ id: "a", minutes: null, score: 9, userId: "amina" }),
        attempt({ id: "b", minutes: 45, score: 9, userId: "bashir" })
      ],
      "amina"
    );

    expect(board.map((entry) => entry.user.id)).toEqual(["bashir", "amina"]);
    expect(board[1]?.durationMs).toBeNull();
  });

  test("a true tie shares a rank and the next one skips", () => {
    const board = buildLeaderboard(
      [
        attempt({ id: "a", minutes: 10, score: 9, userId: "amina" }),
        attempt({ id: "b", minutes: 10, score: 9, userId: "bashir" }),
        attempt({ id: "c", minutes: 10, score: 5, userId: "chandra" })
      ],
      "amina"
    );

    expect(board.map((entry) => entry.rank)).toEqual([1, 1, 3]);
  });

  test("a student appears once, on their best attempt, with the count of the rest", () => {
    const board = buildLeaderboard(
      [
        attempt({ id: "first", minutes: 20, score: 4, userId: "amina" }),
        attempt({ id: "second", minutes: 12, score: 8, userId: "amina" }),
        attempt({ id: "third", minutes: 5, score: 6, userId: "amina" })
      ],
      "amina"
    );

    expect(board).toHaveLength(1);
    expect(board[0]?.submissionId).toBe("second");
    expect(board[0]?.attempts).toBe(3);
  });

  test("an attempt still open is not on the board", () => {
    const board = buildLeaderboard(
      [
        attempt({ id: "a", score: null, status: "STARTED", userId: "amina" }),
        attempt({ id: "b", score: 3, status: "SUBMITTED", userId: "bashir" }),
        attempt({ id: "c", score: 3, userId: "chandra" })
      ],
      "amina"
    );

    expect(board.map((entry) => entry.user.id)).toEqual(["chandra"]);
  });

  test("the reader is marked, and nobody else is", () => {
    const board = buildLeaderboard(
      [
        attempt({ id: "a", score: 4, userId: "amina" }),
        attempt({ id: "b", score: 9, userId: "bashir" })
      ],
      "amina"
    );

    expect(board.filter((entry) => entry.isCurrentUser).map((entry) => entry.user.id)).toEqual([
      "amina"
    ]);
  });
});
