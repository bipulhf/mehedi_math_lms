# Implementation plan — the fourteen decisions

Ordered sequence for the decisions taken on 2 August 2026 and recorded in [CONTEXT.md](../CONTEXT.md) and
[docs/adr/](./adr/). Nothing here is implemented yet.

Ordering principle: **money and certificates first, behind tests; new surface area last.** Stages 1–3
change paths that already run in production behaviour terms. Stages 5–7 add capability and can slip
without leaving anything inconsistent.

Each stage should land as its own commit, or its own small series. Stage 1 is the exception — it is
internally atomic and is actively harmful if split.

---

## Stage 0 — a safety net, before anything else

**Why first:** stages 1–3 rewrite enrolment, payment settlement, refunds, and completion. The repo has
**zero test files**, no `test` script in any workspace, and no `test` task in `turbo.json`. Changing the
code that takes money with no way to know what broke is the single biggest risk in this plan.

- Add a `test` script to `apps/api/package.json` (`bun test`) and a `test` task to `turbo.json`.
- Write **characterisation tests** — tests that pin current behaviour, so the diffs in later stages are
  visible rather than inferred. Priority order:
  1. `commerce-service.ts` `createEnrollment` — free course, priced course, repeat enrolment, existing
     access.
  2. `commerce-service.ts` `handlePaymentCallback` — success, failure, cancel, transaction mismatch.
  3. `commerce-service.ts` `refundPayment` — non-SUCCESS rejection, role guard, resulting state.
  4. `progress-service.ts` — promotion to `COMPLETED`, and the `totalLectures > 0` guard.
  5. `test-service.ts` — MCQ auto-grading, `SUBMITTED` vs `GRADED` branch at line 858.
- These are pure-logic units. No Postgres or Redis is required if the repositories are stubbed, which the
  constructor-injection layering already permits.

**Done when:** `bun run test` passes 1/1 workspaces and the five areas above are covered.

---

## Stage 1 — ADR-0001: enrolment on payment, refund, entitlement

**Atomic. Do not split.** Landing the refund change without the entitlement split nulls `completedAt` and
lets `progress-service.ts:86` resurrect cancelled access on the next read. Landing the enrolment change
without fixing `payment-repository.ts` returns null course titles in payment history.

### Migration

```
+ payments.course_id      uuid not null references courses(id)
~ payments.enrollment_id  uuid null            (was not null)
+ enrollments.cancelled_at timestamptz null
- enrollment_status enum value 'CANCELLED'
```

### Backfill

- `payments.course_id` from `enrollments.course_id` via the existing `enrollment_id`.
- Enrolments with no successful payment on a priced course: delete, or mark cancelled — decide against
  live data. These are the abandoned checkouts the old model accumulated.
- No existing rows should have `status = 'CANCELLED'`; nothing ever wrote it. Verify before dropping the
  enum value.

### Code

- `commerce-service.ts:177` `createEnrollment` — for a priced course, create the payment only. Stop
  calling `enrollmentRepository.create` at line 204.
- `commerce-service.ts:365` `handlePaymentCallback` — create the enrolment on settlement. **Also add the
  two missing verification checks** (see below).
- `commerce-service.ts:439` `refundPayment` — set `enrollments.cancelled_at` in the same transaction as
  the payment update.
- `enrollment-repository.ts:286` `hasCourseAccess` — collapse the SQL `CASE` to "row exists and
  `cancelled_at is null`".
- `enrollment-repository.ts:129` `updateStatus` — stop nulling `completedAt` on non-`COMPLETED` writes.
- `payment-repository.ts:143` and `:183` — read `payments.course_id` directly instead of subquerying
  through the enrolment.
- `admin-dashboard-repository.ts:25` — the unfiltered `count()` becomes correct for free, since the table
  now holds only real students. Verify rather than assume.

### Payment verification hardening

`handlePaymentCallback` currently accepts any validation response whose `tran_id` matches. Add, in the same
change:

- Assert the gateway validation status is `VALID` or `VALIDATED`. `sslcommerz-service.ts:197` already
  returns it; nothing reads it.
- Compare the validated amount against the course price before settling. `sslcommerz-service.ts:191`
  currently files `amount` into metadata and drops it.

**Also fix here** (backlog item 3 from the audit, same file's blast radius): `.env.example:42` documents
`SSLCOMMERZ_IS_LIVE`, which nothing reads, while `lib/env.ts:18` reads `SSLCOMMERZ_SANDBOX_MODE` through
`z.coerce.boolean()` — so `"false"` coerces to `true` and the live gateway is unreachable. Settle on one
name and parse it with `z.stringbool()`.

---

## Stage 2 — ADR-0005: completion

Depends on stage 1 for the `status` / `cancelledAt` split.

### Migration

None. `tests.passingScore` already exists.

### Code

- New predicate — a Test is passed when the student's best attempt is `GRADED` and
  `score >= passingScore`, with null or `0` passing on any graded score.
- `progress-service.ts:86` — completion becomes "every lecture complete **and** every published test
  passed". Drop the `totalLectures > 0` guard, which is what blocked exam-only courses.
- **Move promotion out of the read.** `GET /courses/:courseId/progress` must not write. Promote from
  `POST /progress/:lectureId/complete` and from the grading path (`test-service.ts:858` and `:1005`).
- `enrollment-pdf-service.ts:20` needs no change — it reads `status`, which now survives a refund.

### Tests

Exam-only completion, mixed course with a failed test, retake improving the best attempt, and the
regression that deleting a lecture no longer completes anybody.

---

## Stage 3 — ADR-0006: course ownership

### Migration

```
+ course_teachers.role  enum(OWNER, TEACHER) not null default 'TEACHER'
```

### Backfill

Set `role = 'OWNER'` where `course_teachers.teacher_id = courses.creator_id`. Insert a missing `OWNER` row
for any course whose creator is absent from the join table — check for these before assuming there are
none.

### Code

Split `course-service.ts:134` `ensureCanManageCourse` in two:

- `ensureCanEditContent` — owner, teacher, or Admin. Chapters, lectures, materials, tests, notices.
- `ensureCanAdministerCourse` — owner or Admin. Roster, price, submit for approval, withdraw, restore.

Refuse removal of the last remaining owner. `creatorId` stays as a historical record and stops gating
anything.

---

## Stage 4 — withdraw / restore, and exam-only enforcement

Two small independent changes, grouped because both touch the course lifecycle.

- `DELETE /courses/:id` becomes `POST /courses/:id/withdraw`; add `POST /courses/:id/restore` returning the
  course to `DRAFT`. `course-service.ts:376` already writes `ARCHIVED`; the enum value stays.
  `ensureCanReviewCourse` at line 175 must stop refusing withdrawn courses, since restore now routes them
  back through approval.
- Enforce exam-only: refuse `POST /chapters/:id/lectures` when the course is exam-only; refuse submitting
  an exam-only course that has lectures, or an ordinary one with none; refuse flipping the flag on a course
  that already has lectures.

---

## Stage 5 — ADR-0002 and ADR-0003: admin accounts

- Remove `DELETE /api/v1/admin/users/:id`, `admin-user-repository.ts:303` `softDeleteUser`, and the
  controller and route entries. Relabel the admin UI button to "Deactivate".
- Add `ADMIN` to `StaffRole` (`staff-account-repository.ts:3`) and to the role-update type at
  `admin-user-repository.ts:67`.
- Require the caller to re-enter their password when creating an Admin.
- Refuse deactivating the last active Admin, alongside the existing self-deactivation guard.

Decide here what to do with the `email` queue: `staff-account-service.ts:61` enqueues an invite containing
a plaintext temporary password onto a queue nothing consumes. Either write the worker and pick a transport,
or drop the enqueue.

---

## Stage 6 — ADR-0004: message moderation

The largest piece of genuinely new surface. Last, because nothing else depends on it.

### Migration

```
+ conversation_reports  id, conversation_id, reporter_id, reason,
                        created_at, resolved_at, resolved_by_id
+ conversation_access_log  id, conversation_id, admin_id, read_at
+ messages.hidden_at       timestamptz null
+ messages.hidden_by_id    uuid null references users(id)
```

### Code

- `POST /messages/conversations/:id/report`.
- Admin read access to a conversation, permitted only while a report is open, writing an access-log row on
  every read. `message-service.ts:155` restricts reads to participants today and needs the exception.
- Admin hide-message, rendering a tombstone. The original row is retained deliberately — see the ADR.
- Participants still cannot delete or edit. That rule does not change.

Blocking is deliberately **not** in scope; the ADR records it as worth revisiting.

---

## Stage 7 — notification wiring

Machinery is complete and unused. Add producers only.

- `notice-service.ts` — posting a Notice notifies everyone enrolled. This is the case where the missing
  wiring is unambiguously a bug: the `NOTICE` enum value exists for it.
- `commerce-service.ts` — payment settled, and payment refunded, notify the student.
- `course-service.ts` — approval and rejection notify the course's teachers.
- `bug-report-service.ts` — status change notifies the reporter.
- `MESSAGE` stays unwired by decision; the conversation's live badge covers it.

---

## Stage 8 — documentation

Rewrite `PLAN.md` so it describes the agreed design rather than the code as it was audited. Phases 7, 9,
10, 12, 13, 14, 16, 17, and 18 all contain statements these decisions invalidate, and the backlog needs
rebuilding around the stages above.
