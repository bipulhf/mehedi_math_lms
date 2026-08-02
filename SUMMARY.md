# Implementation summary — 2 August 2026

Unattended run of [docs/implementation-plan.md](./docs/implementation-plan.md), which sequenced the
fourteen design decisions taken during the audit of the same date. Every judgement call is recorded in
[BLOCKERS.md](./BLOCKERS.md); the decisions themselves are in [CONTEXT.md](./CONTEXT.md) and
[docs/adr/](./docs/adr/).

**All nine stages completed. None were skipped.**

## What landed on main

| Commit | Stage | What |
| ------ | ----- | ---- |
| `2a364f8` | 0 | Characterisation tests and the test harness |
| `9383501` | 1 | Enrolment on payment, refund cancels, entitlement split (ADR-0001) |
| `570940a` | 2 | Completion rule: lectures watched and tests passed (ADR-0005) |
| `d0d2e49` | 3 | Course authority on the teacher roster (ADR-0006) |
| `a447bae` | 4 | Withdraw/restore; exam-only enforced |
| `80ae070` | 5 | Admins create admins; user deletion removed (ADR-0002, ADR-0003) |
| `b10e0e1` | 6 | Message moderation by report (ADR-0004) |
| `2e652ba` | 7 | Domain events raise notifications |
| this | 8 | Documentation |

Final state: **lint 7/7, typecheck 7/7, build 7/7, 84 tests 0 fail.** Every stage was verified green
before its commit; nothing was pushed red.

## Migrations applied

| File | Contents |
| ---- | -------- |
| `0000_charming_thunderbolt.sql` | Initial schema (pre-existing, applied for the first time — see below) |
| `0001_tiny_major_mapleleaf.sql` | `payments.course_id`, nullable `enrollment_id`, `enrollments.cancelled_at`, drop `CANCELLED` enum value |
| `0002_mushy_toxin.sql` | `course_teachers.role` and the `course_teacher_role` enum |
| `0003_backfill_course_owner_roles.sql` | Data migration promoting existing creators to `OWNER` |
| `0004_tough_wolfsbane.sql` | `conversation_reports`, `conversation_access_log`, `messages.hidden_at`/`hidden_by_id` |

34 tables.

## Bugs found and fixed that were not in the plan

Each of these was discovered while implementing something else.

1. **Settlement accepted an invalid gateway response.** `handlePaymentCallback` compared only the
   transaction id, so a validation response of `INVALID_TRANSACTION` with a matching `tran_id` still marked
   a payment `SUCCESS`. It now asserts the gateway's own status and that the paid amount covers the price.
2. **The sandbox flag could not be turned off.** `.env` documented `SSLCOMMERZ_IS_LIVE`, which nothing
   read, while the code read `SSLCOMMERZ_SANDBOX_MODE` through `z.coerce.boolean()` — where the string
   `"false"` coerces to `true`. The live gateway was unreachable by configuration.
3. **`replaceTeachers` would have demoted every owner.** It deleted and re-inserted the whole roster, so
   the ADR-0006 role column would have been silently wiped on any roster edit.
4. **`verifyPassword` fails open on a corrupt hash.** better-auth throws rather than returning false, which
   would have turned a malformed `accounts` row into a 500 on the re-authentication path.
5. **The web client called two removed endpoints.** Route renames are string URLs, so neither lint nor
   typecheck catches them: `DELETE /courses/:id` (Stage 4) and `DELETE /admin/users/:id` (Stage 5).

## What still needs a human

Ordered by how much it matters.

1. **Message moderation has no web UI.** The API is complete and tested, but `apps/web` has no report
   button, no admin report queue, and no hide control — so a student cannot actually report a
   conversation. This is the one item here that leaves a feature unusable by the person it exists for. It
   was left backend-only rather than guessing at a safeguarding interface unprompted.
2. **No live gateway has ever been exercised.** SSLCommerz remains sandbox/mock and Onecodesoft SMS has
   never been called with real credentials. Item 1 in the bug list above means the payment settlement path
   changed materially and has still only been proven against a mock.
3. **The `file-processing` worker was never written.** `upload-service.ts` enqueues
   `extract-video-metadata` on every confirmed video upload and nothing consumes it. This was in the
   original audit backlog and is outside the nine stages.
4. **Migration `0001` is unsafe against a populated database.** It adds `payments.course_id` as `NOT NULL`
   with no backfill. This database was empty and verified so before applying. BLOCKERS.md carries the
   manual three-step sequence required for any deployment that has rows.
5. **Blocking is not implemented.** A student who reports a teacher stays in a channel with them until an
   admin acts. Recorded in ADR-0004 as deliberately out of scope.
6. **Phase 21, the mobile app, is untouched.** `apps/mobile` is still the stock Expo template. It was never
   part of these nine stages.

## The preflight finding worth knowing about

**This project's database did not exist.** `.env` pointed at `postgresql://bipul:***@localhost:5432/academy`
and neither the role nor the database was present on the running Postgres container. `mehedi_lms` was
empty; `mehedi_admin` is a different, Prisma-based application and was not touched.

So these migrations had never been run anywhere, and **no production data was at risk during this run** —
which is why the destructive-looking parts of Stage 1 and Stage 3 were safe to apply as generated. If a
real deployment exists elsewhere, treat every migration here as unapplied and read BLOCKERS.md first.
