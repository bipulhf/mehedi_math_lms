# Coupons — build plan

Settled with the owner on 2026-08-05. The vocabulary is in [CONTEXT.md](../CONTEXT.md#coupons);
the decision and its rejected alternatives are in
[ADR-0013](./adr/0013-a-coupon-is-priced-at-checkout-and-recorded-on-the-payment.md).
This file is the how.

## What was decided

| Question | Answer |
| --- | --- |
| Kinds | `FLAT` (taka off) or `PERCENT`. "Usage" is a cap, not a kind |
| Who creates | Course Owner of that course, or an Admin. A Course Teacher cannot |
| Scope | One course, or — Admin only — every course |
| Code | Typed by the creator, uppercased, unique per course; Platform Coupon codes unique among themselves |
| Precedence | A course's own coupon beats a Platform Coupon of the same code |
| Stacking | One coupon per purchase |
| Usage counting | `SUCCESS` + `REFUNDED` forever, plus `PENDING` younger than 30 minutes |
| Per student | Once per coupon, fixed, not configurable |
| Lifecycle | Optional starts/expires, manual disable, delete only while never redeemed |
| Rounding | Two decimals, as the arithmetic falls |
| Zero payable | Allowed — settles locally, no gateway, provider `COUPON` |
| Refund | The Redemption stays consumed; the student may not redeem it again |
| Late callback | Honoured, never re-validated — caps may overshoot |
| Editing | Every field, at any time; payments keep their own snapshot |
| Student entry | A code field in the buy card and the phone bar; web and mobile |
| Advertising | Optional per coupon; one banner shows, the biggest saving wins |
| Staff UI | One `/dashboard/coupons` route, rows differ by role |
| Teacher sees | Their own (editable) and Admin coupons touching their courses (read-only) |
| Accountant | Read-only everywhere, including a coupon column on payments |
| Guessing | Signed-in students only, ~20 preview attempts per minute per IP |

## Schema

`packages/db/src/schema/coupons.ts`, new:

```ts
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Stored uppercase; every lookup uppercases first, so "save20" finds "SAVE20".
  code: varchar("code", { length: 32 }).notNull(),
  // NULL is a Platform Coupon: every course, including ones published later.
  // Only an Admin may write NULL here.
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  kind: couponKindEnum("kind").notNull(),
  // Taka for FLAT, percent for PERCENT. One column because a coupon is one kind
  // for its whole life.
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  // NULL is uncapped.
  maxRedemptions: integer("max_redemptions"),
  isPublic: boolean("is_public").default(false).notNull(),
  isDisabled: boolean("is_disabled").default(false).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: ..., updatedAt: ...
});
```

Two partial unique indexes, not one composite — Postgres treats NULLs as distinct,
so a plain `unique (course_id, code)` would let two Platform Coupons share a code:

```sql
create unique index coupons_course_code_unique_idx
  on coupons (course_id, upper(code)) where course_id is not null;
create unique index coupons_platform_code_unique_idx
  on coupons (upper(code)) where course_id is null;
```

Plus `coupons_created_by_id_idx`, `coupons_course_id_idx`.

New enum in `enums.ts`: `couponKindEnum = ["FLAT", "PERCENT"]`. And
`paymentProviderEnum` gains `"COUPON"` — a purchase that settled at zero without
a gateway (ADR-0013).

`payments` gains four columns and one index:

```ts
couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
// The code as typed, kept because a coupon may be renamed and a payment must
// still say what the student used.
couponCode: varchar("coupon_code", { length: 32 }),
// The price before the discount. `amount` remains the Payable.
listAmount: numeric("list_amount", { precision: 10, scale: 2 }),
discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }),
```

## Counting a Redemption

One predicate, used everywhere — the coupon list, the detail page, and the guard
at checkout:

```sql
status in ('SUCCESS', 'REFUNDED')
  or (status = 'PENDING' and created_at > now() - interval '30 minutes')
```

Total uses is that filtered over `coupon_id`; the per-student check is the same
predicate plus `user_id`. Both live in `coupon-repository.ts` so the thirty
minutes is written once.

## Applying a coupon

`CouponService.resolve(courseId, code, studentId)` runs in this order and throws
the first failure, because the message the student reads should be the first true
thing about their code, not the last:

1. Uppercase the code. Find a coupon on this course; failing that, a Platform
   Coupon. Nothing found → *no such code*.
2. Not disabled.
3. `startsAt` is null or past; `expiresAt` is null or future.
4. Total cap not reached.
5. This student has no counted Redemption of it.
6. The course is `PUBLISHED`, priced above zero, and the student is not already
   enrolled.

Then the arithmetic:

```
discount = kind === "FLAT" ? min(value, price) : round(price * value / 100, 2)
payable  = max(price - discount, 0)
```

Both the preview and `createEnrollment` call this. The preview's numbers are
never trusted — checkout recomputes from the course row.

`CommerceService.createEnrollment` gains an optional `couponCode`. When the
payable is zero it takes the free-course path: `grantAccess`, plus a payment row
of `0.00` / `SUCCESS` / `COUPON` carrying the coupon columns, so the Redemption
still counts and accounting still sees the sale.

## API

Staff, under `/api/v1/coupons`:

| Route | Who |
| --- | --- |
| `POST /` | Owner of the named course, or Admin (Admin only for `courseId: null`) |
| `GET /` — filters: `courseId`, `status`, `createdBy` | Teacher: own + read-only ones touching their courses. Admin: all. Accountant: all, read-only |
| `GET /:id` | As above; includes stats and the chart series |
| `GET /:id/redemptions` — paginated | As above |
| `PATCH /:id`, `DELETE /:id` | Creator or Admin. Delete refused once redeemed |

Student:

- `POST /api/v1/coupons/preview` — `{ courseId, code }` → `{ code, kind, value,
  listAmount, discountAmount, payable }`. Signed-in students only,
  `createRateLimitMiddleware({ keyPrefix: "coupon-preview", max: 20, windowMs: 60_000 })`.
- `POST /api/v1/enrollments` — gains optional `couponCode`.
- The best Public Coupon rides along on `GET /courses/by-slug/:slug` as
  `publicCoupon`, so the banner renders in the SSR pass with no second request
  and no flash. It is computed against that course's price, valid coupons only,
  biggest saving first, newest on a tie.

Schemas go in `packages/shared` beside the existing payment ones; the API and
both clients import them.

## Web

- `/dashboard/coupons` — one route, `_components/` beside it (the 800-line
  ceiling applies): a table above `md`, stacked cards below, a create/edit modal,
  and a derived badge per row — Scheduled, Active, Expired, Exhausted, Disabled.
  A teacher gets two sections, *My coupons* and *Affecting my courses*; the second
  has no action column at all rather than disabled buttons.
- `/dashboard/coupons/$couponId` — stat row (uses / cap, remaining, total
  discount given, revenue after discount), a recharts line of redemptions over
  time, a per-course bar for Platform Coupons, then the redemption table:
  student, course, date, discount, payment status. Its own skeleton mirroring
  that layout.
- Buy card and phone bar — a *have a coupon?* field, the applied state showing
  list price struck through, the discount line and the payable, and a remove
  button. The Public Coupon banner sits above the field with a one-tap apply.
- `/dashboard/payments` — a coupon column (code + discount) on the table and the
  card view; the payment detail shows list → discount → paid.
- Sidebar: a Coupons entry for teachers, admins and accountants.

## Mobile

`apps/mobile/app/courses/[courseId].tsx` gets the same field, the same breakdown
and the same banner. No staff screens — the app has none.

## i18n

Every string in `packages/i18n/src/messages/bn.ts` first, then the same keys in
`en.ts`; an orphan in either fails the build. Namespace `coupon.*`, with the
refusal messages spelled out — expired, used up, already used by you, not for
this course, no such code.

## Tests

- `coupon-service.test.ts` — the arithmetic (flat over price, percent rounding,
  zero payable), precedence, each refusal in order, the thirty-minute hold at its
  edges, a refunded payment still counting, and a coupon whose cap was lowered
  below its uses.
- `commerce-service.test.ts` — checkout with a coupon writes the four columns;
  zero payable skips the gateway and grants access; a callback for a coupon that
  has since expired still settles.

## Build order

1. Schema, enums, migration.
2. `coupon-repository.ts` with the counting predicate.
3. `coupon-service.ts` + shared schemas + tests.
4. Checkout path in `commerce-service.ts` + tests.
5. Routes and rate limiting.
6. Web staff pages.
7. Web buy card, banner, payments column.
8. Mobile.
