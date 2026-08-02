# Implementation summary

Two runs, both driven from [PLAN.md](./PLAN.md). Every judgement call is in [BLOCKERS.md](./BLOCKERS.md);
the domain decisions behind them are in [CONTEXT.md](./CONTEXT.md) and [docs/adr/](./docs/adr/).

**The 21-phase plan is complete.** Nothing in it is outstanding. What remains is listed under "What still
needs a human" below, and none of it is code that can be written without credentials or a human judgement.

## 2 August 2026 — the nine design stages

Fourteen decisions taken during the audit, sequenced in
[docs/implementation-plan.md](./docs/implementation-plan.md) and implemented unattended.

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
| `74e49e8` | 8 | Documentation |

## 3 August 2026 — closing the plan

Everything the audit had left open: four incomplete phases, three cross-cutting concerns, and a
twenty-one-item polish backlog.

| Commit | What |
| ------ | ---- |
| `be59710` | **Phase 11.** The `file-processing` worker, plus a pure-TypeScript ISO base media parser — there is no ffmpeg on the API host, and the file is walked by ranged reads rather than downloaded. Backfill script for uploads that predate it. |
| `cc83fc0` | **Phase 15 + caching.** Read-through Redis cache over the public catalogue, category tree, analytics and comment threads, with index-based invalidation. |
| `c904d47` | **Phase 16.** The moderation UI: report dialog, admin queue, per-message hide, tombstones. The API had been complete and unreachable. |
| `0ed4a1f`, `cdbfd7d`, `2d23dc7` | **State management.** TanStack Query owns every server read on the web; Zustand holds the unread badge; the `window` CustomEvent bus is gone. |
| `86d384a` | **Testing.** 15 API integration tests over the real Hono app, 12 Playwright E2E specs. |
| `7cfe99a` | **Polish.** Crawler files on the public origin, a real 404 page, the missing skeletons, `pendingComponent`, image CLS, dead-code sweep. |
| `e0e8b34` | **Phase 21.** The mobile app. |

Final state: **lint 8/8, typecheck 8/8, build 7/7, 120 API tests passing, 12 E2E specs passing,
`bunx expo-doctor` 20/20.** Nothing was pushed red.

## Migrations applied

| File | Contents |
| ---- | -------- |
| `0000_charming_thunderbolt.sql` | Initial schema (pre-existing, applied for the first time — see below) |
| `0001_tiny_major_mapleleaf.sql` | `payments.course_id`, nullable `enrollment_id`, `enrollments.cancelled_at`, drop `CANCELLED` enum value |
| `0002_mushy_toxin.sql` | `course_teachers.role` and the `course_teacher_role` enum |
| `0003_backfill_course_owner_roles.sql` | Data migration promoting existing creators to `OWNER` |
| `0004_tough_wolfsbane.sql` | `conversation_reports`, `conversation_access_log`, `messages.hidden_at`/`hidden_by_id` |

34 tables. The 3 August work added no migrations — `conversationReportsRelations` is TypeScript-only.

## Bugs found and fixed that were not in the plan

Each was discovered while implementing something else.

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
   typecheck catches them: `DELETE /courses/:id` and `DELETE /admin/users/:id`.
6. **The admin report queue returned bare UUIDs.** `listOpenReports` had no names on it — nothing an admin
   could triage. It now joins the reporter and both participants.
7. **The router had no `defaultNotFoundComponent`.** Every 404, including the one a crawler sees, was a
   bare `<p>Not Found</p>`. Found by an E2E test, not by reading the code.
8. **Bun's isolated store put four copies of `expo` on disk.** React Native links exactly one copy of a
   native module. `bunfig.toml` now sets the hoisted linker; `expo-doctor` went from two failing checks to
   20/20.

## What still needs a human

Ordered by how much it matters.

1. **No live gateway has ever been exercised.** SSLCommerz remains sandbox/mock and Onecodesoft SMS has
   never been called with real credentials. Bug 1 above means the settlement path changed materially and
   has still only been proven against a mock. This is the biggest gap between "tested" and "known to work".
2. **Accessibility is unverified.** §17 of the plan has never been checked: no screen-reader pass, no
   keyboard-only run, no contrast audit. Everything else left on the list can be checked by a machine.
3. **Migration `0001` is unsafe against a populated database.** It adds `payments.course_id` as `NOT NULL`
   with no backfill. This database was empty and verified so before applying. BLOCKERS.md carries the
   manual three-step sequence required for any deployment that has rows.
4. **Blocking is not implemented.** A student who reports a teacher stays in a channel with them until an
   admin acts. Recorded in ADR-0004 as deliberately out of scope, and worth revisiting — it is the one
   safeguarding gap that a person, not a machine, has to decide about.
5. **The mobile app has no tests**, and three of its capabilities deliberately defer to the web app: video
   playback, profile completion, and realtime message delivery. Each has a note in the code saying why.
6. **Open Graph tags have never been through the platform validators.**

## The preflight finding worth knowing about

**This project's database did not exist.** `.env` pointed at `postgresql://bipul:***@localhost:5432/academy`
and neither the role nor the database was present on the running Postgres container. `mehedi_lms` was
empty; `mehedi_admin` is a different, Prisma-based application and was not touched.

So these migrations had never been run anywhere, and **no production data was at risk** — which is why the
destructive-looking parts of Stage 1 and Stage 3 were safe to apply as generated. If a real deployment
exists elsewhere, treat every migration here as unapplied and read BLOCKERS.md first.
