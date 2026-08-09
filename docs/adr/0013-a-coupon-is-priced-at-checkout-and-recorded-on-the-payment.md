---
status: accepted
---

# A coupon is priced at checkout and recorded on the payment

Coupons appeared in the design handoff with nothing behind them. They exist
now: a code reduces what a student pays for
one course purchase. The discount is computed by the server when checkout
starts, written onto the payment row along with the list price and the code as
typed, and never recomputed afterwards. There is no separate redemption table
and no discount column on `courses`.

## Context

ADR-0001 settled that a priced course produces no enrolment at checkout: the
payment row is created first, the student leaves for SSLCommerz, and the
enrolment comes into existence minutes later when the callback arrives — or
never. Every coupon question is really a question about that gap.

`courses.price` is a single `numeric(10,2)`. The gateway is handed one amount and
the callback guards `validation.amount < payment.amount`, so whatever the student
is charged has to be the amount stored on the payment. There is no job runner in
the API, so anything needing a sweep of expired reservations would need one built.

## Decision

- **The payment is the ledger.** `payments` gains `coupon_id`, `coupon_code` (a
  snapshot of the code as typed), `list_amount` and `discount_amount`. `amount`
  stays what it always was: the Payable, what the gateway is asked to collect.
  Usage is counted off `payments`; no second table can disagree with it.
- **A Redemption is counted by payment status.** `SUCCESS` and `REFUNDED` count
  against the cap forever. A `PENDING` payment counts for thirty minutes from
  creation and then stops — a hold that expires by clock, in the query, with
  nothing to clean up. A refunded Redemption is not returned to the pool and the
  refunded student may not redeem that coupon again.
- **A coupon is never re-validated after checkout starts.** The callback checks
  only that the gateway collected at least `payments.amount`. A coupon that
  expired or filled up while the student was on the gateway is honoured, so caps
  may end a use or two over.
- **Zero is a real Payable.** The discount is clamped so it never exceeds the
  list price. At zero the gateway is skipped entirely: a payment is written with
  `amount` `0.00`, status `SUCCESS`, provider `COUPON`, and the enrolment is
  granted on the spot. `payment_provider` gains that value.
- **Scope is one course, or all of them.** `coupons.course_id` nullable: set
  means that course, null means every course including ones published later, and
  only an Admin may create the null case. Codes are unique per course, and unique
  among Platform Coupons. A code on the course beats a Platform Coupon of the
  same code.
- **Creating one is a price decision.** Only the Course Owner (ADR-0006) or an
  Admin may create a coupon for a course; a Course Teacher may not.
- **Everything stays editable.** Including the code and the discount, at any
  point in a coupon's life. Past payments are unaffected because they hold their
  own snapshot. A coupon that has ever been redeemed cannot be deleted, only
  disabled.

## Considered options

- **A `coupon_redemptions` table.** Rejected — today a coupon only ever applies
  to a course purchase, which is exactly one payment row, so the table would
  duplicate state the payment already carries and give two places to disagree
  about how many uses are left.
- **Reserve a use at checkout, release it on failure.** Rejected — abandoned
  checkouts stay `PENDING` forever in this system, so every walked-away student
  would burn a use permanently. The thirty-minute hold gets most of the accuracy
  for none of the machinery.
- **Count only settled payments.** Rejected — a burst at the end of a campaign
  lets fifty people ride the last use at once.
- **Re-validate the coupon on the callback.** Rejected — the money has already
  moved. Refusing an enrolment because a rule changed while the student was
  typing their card number is not defensible, and it converts a race into a
  refund for the accountant to process.
- **Forbid a zero Payable.** Rejected — "free for the first fifty" is a thing
  the owner will want, and the alternative is a 10 BDT floor that exists only to
  keep the gateway in the loop.
- **A discount column on `courses`.** Rejected — that is a lower price, not a
  coupon, and the teacher can already set one.

## Consequences

- A coupon's remaining uses are a computed figure, not a counter, so the coupon
  list runs an aggregate over `payments`. It is indexed on `coupon_id`.
- Because caps may overshoot, "uses" in the admin view is what actually happened,
  and can read `102 / 100`. That is a true statement about the campaign, not a
  bug to guard against.
- `payment_provider` is no longer a synonym for "gateway" — `COUPON` means the
  purchase settled locally with no gateway involved. Accounting figures that
  filter on provider need to say which they mean.
- Changing a coupon's discount changes nothing about money already taken, but it
  does change what the admin's total-discount figure means over time. The
  per-payment snapshot is the only trustworthy history.
