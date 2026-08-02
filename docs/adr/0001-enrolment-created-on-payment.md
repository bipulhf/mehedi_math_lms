---
status: accepted
---

# Enrolments exist only once payment has cleared

An Enrolment now means one thing: a student's standing right to study a course. For a priced course it is
created by the payment-success handler and never before, so `enrollments` contains nothing but real
students and its mere presence grants access. Entitlement and progress are tracked on separate axes, so
neither can overwrite the other.

## Context

The previous model created the enrolment row up front, defaulted to `ACTIVE`, and gated access separately
in `hasCourseAccess` via a payment join. That was safe but ambiguous: `ACTIVE` meant "is studying" for a
free course and "opened the checkout page once" for a priced one. Consumers that forgot the join silently
counted abandoned checkouts as students — `admin-dashboard-repository.ts:25` did exactly that, so the
headline enrolment figure drifted permanently above reality and disagreed with revenue.

Separately, `enrollments.status` was carrying two unrelated facts — how far the student had progressed and
whether they were still entitled — in one column. Refunding was going to have to write that column, which
would have destroyed the completion record, and `progress-service.ts` re-derives `COMPLETED` on every
progress read and would have resurrected the cancelled access on the next page load.

## Decision

- A priced-course checkout creates only a payment. The enrolment is written by the payment-success
  handler.
- `payments.course_id` is added; `payments.enrollment_id` becomes nullable and is filled on success.
- `enrollments.status` keeps `ACTIVE | COMPLETED` and describes progress alone. A new `cancelledAt`
  timestamp records withdrawal of entitlement. The `CANCELLED` enum value is dropped.
- Refunding a payment cancels its enrolment in the same transaction. Access ends; the completion record
  and certificate survive.
- Access becomes "an enrolment row exists and `cancelledAt IS NULL`".

## Considered options

- **A `PENDING_PAYMENT` enrolment state.** Rejected: it keeps checkout litter in the enrolments table
  forever and every reader still needs to know which states mean access.
- **Keep enrolment-as-intent, fix each reader.** Rejected: leaves the trap armed. Every future query has to
  remember the payment join, and the one place that forgot is how the bug got in.
- **Derive entitlement from the payments table** (access = enrolled AND no refunded payment). Rejected: it
  reinstates the very join this decision removes.

## Consequences

- `payment-repository.ts:143` and `:183` derive `courseId`/`courseTitle` by subquery *through* the
  enrolment. Both must read `payments.course_id` directly, or they return null for pre-enrolment payments.
- `hasCourseAccess` collapses from a 25-line SQL `CASE` to an existence check.
- Existing rows need backfilling: set `payments.course_id` from the enrolment, and delete or mark
  enrolments that never had a successful payment.
- A refunded student who had finished the course is both Completed and Cancelled. That is intended — their
  certificate stays valid.
