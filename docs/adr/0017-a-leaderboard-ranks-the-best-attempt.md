---
status: accepted
---

# A leaderboard ranks a student's best attempt, on MCQ tests only

Every MCQ test has a board, open to the students sitting it and the teachers
running it, showing the same rows to both. A student appears once, on their
best attempt. Written papers have no board.

## Context

An MCQ paper marks itself: `TestSubmissionService.submitTest` grades the
answers and writes `status: "GRADED"` in the same request, so a score exists
the moment the student presses submit. A written paper does not — it waits for
a teacher to mark it, sometimes for days, one answer at a time through the
marking workspace.

Retaking is a first-class part of the product: `tests.maxAttempts` is often
null, and the whole shape of the exam pages is built around a student sitting
the same test more than once and watching their score move.

Both facts constrain what a ranking can honestly say.

## Decision

- **The ranked attempt is the student's best, not their latest and not an
  average.** A board that ranked the latest attempt would punish the second
  try, which is the thing retakes exist to encourage; an average would punish
  it twice.
- **Score first, then time taken, then the earlier submission.** Two full
  marks are not the same achievement if one took four minutes and the other
  forty. Time comes from `submitted_at - started_at` on the ranked attempt
  alone. A student with no recorded start time cannot beat one who has a time —
  otherwise missing data would rank as infinitely fast — and a negative
  interval is read as unknown rather than as the fastest answer on the board.
- **Ties share a rank and the next rank skips**: 1, 2, 2, 4. Two entries tie
  only when both score *and* time are equal, so the common case of an equal
  score is not a tie at all.
- **MCQ only, enforced in the service and not just hidden in the UI.** A board
  built from a written test would rank whoever a teacher happened to mark
  first, and would read as a result long before it was one. The API answers a
  written test with a validation error; the clients do not offer the link.
- **Only graded attempts are on it.** On an MCQ test that is every submitted
  attempt, so in practice the only rows left out are the ones still open in
  somebody's browser.
- **A student sees the whole board, with names.** A ranking only the reader can
  see is not a ranking. Emails are not on it — a name and a score are what the
  board needs, and the email column stays on the teacher's submissions page,
  which is behind a different check.
- **The reader's own row is marked** (`isCurrentUser`), which is what makes the
  board readable on a phone without scrolling for your own name.

## Consequences

- A student can see how they placed against classmates by name. That is the
  feature, and it is the part to revisit first if a course ever wants a private
  exam — the switch would belong on the test, not on the endpoint.
- The board is read from the same query that backs the teacher's submissions
  page (`listSubmissionsByTestId`), so it costs no new index and no new SQL,
  and it is capped by the same thing that caps that page: nothing. A test with
  thousands of attempts returns thousands of rows to whoever opens the board.
  If that ever bites, the fix is a cap plus the reader's own row appended, not
  a different ranking.
- `buildLeaderboard` is a pure function over submission records
  (`apps/api/src/services/assessment-leaderboard.ts`), so the ordering rules
  above are testable without a database and are tested in
  `assessment-leaderboard.test.ts`.
