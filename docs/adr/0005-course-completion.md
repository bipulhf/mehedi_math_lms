---
status: accepted
---

# Completion is caused by the student, and latches

A student completes a course by watching every Lecture and passing every published Test. One rule covers
ordinary and Exam-Only courses. Completion is only ever reached through something the student did, and once
reached it is permanent.

## Context

Completion was defined as watching every lecture, recomputed on every progress read
(`progress-service.ts:86`) and guarded by `totalLectures > 0`. Three problems followed from that.

An Exam-Only Course has no lectures, so it could never complete — no certificate, and no review either,
since `review-service.ts:76` requires a `COMPLETED` enrolment. An ordinary course could carry Tests that
counted for nothing, so a student could finish having failed every one. And because completion was
re-derived on read, deleting content could cause it: `course_progress.lectureId` cascades on lecture
delete, so removing the last unwatched lecture silently graduated every student who was waiting on it.

`tests.passingScore` existed but was never evaluated anywhere, so "passed" was not a concept the system
could express at all.

## Decision

- Complete when every Lecture is marked complete **and** every published Test is passed. Exam-Only courses
  need no special case — their lecture set is empty, so only Tests decide.
- Passing a Test means holding a graded submission scoring at least its `passingScore`. Retakes are
  unlimited and the best attempt counts. A null `passingScore` is passed by any graded submission, so
  existing tests do not silently become impossible.
- Promote to `COMPLETED` only on a student action — marking a lecture complete, or one of their
  submissions reaching `GRADED`. Reading progress never writes.
- Completion latches. Publishing new content never revokes it, and a refund cancels access without
  touching it.

## Considered options

- **Completion on submission rather than passing.** Rejected: a certificate granted for handing in blank
  papers asserts nothing.
- **Graded but no threshold.** Rejected: still waits on teacher marking, without buying the attainment
  guarantee that makes the wait worthwhile.
- **Tests count only in Exam-Only courses.** Rejected: two rules to explain, turning on a flag the student
  cannot see.

## Consequences

- A course containing a written Test cannot be completed until a teacher grades it. Certificate issuance
  now depends on marking latency, which is a real operational commitment.
- A student who has finished everything but never returns stays `ACTIVE` until they next touch the course.
  Accepted deliberately, as the price of never graduating anyone by deletion.
- `passingScore` becomes load-bearing. The builder currently defaults it to `0`, which behaves identically
  to null under this rule.
- Promotion moves out of the progress read. That also removes the write-from-a-GET that would otherwise
  have resurrected cancelled enrolments after a refund.
