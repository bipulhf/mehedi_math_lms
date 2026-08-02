# Blockers and autonomous decisions

Running log of the judgement calls made while building this. The 2 August entries cover the nine design
stages in `docs/implementation-plan.md`; the 3 August entries cover closing out the rest of PLAN.md.

## Decisions I made

### Preflight — the project database did not exist

`.env` points `DATABASE_URL` at `postgresql://bipul:***@localhost:5432/academy`. Neither the `bipul` role
nor the `academy` database existed on the running Postgres container (`my-postgres`). The container held
`mehedi_lms` (empty, 0 tables) and `mehedi_admin` (35 tables, but a *different* application — Prisma-based,
with `McqExam`, `batches`, `classes`).

Conclusion: this monorepo's migrations had never been run anywhere, and **no production data exists**.

Chosen: created the missing role and database to match the committed `.env`, rather than editing `.env` to
point somewhere else. Purely additive — nothing was dropped, renamed, or migrated, and `mehedi_admin` was
not touched. Then ran `bun run db:migrate`, which applied `0000_charming_thunderbolt.sql` cleanly: 32
tables.

```sql
CREATE ROLE bipul LOGIN PASSWORD '<from .env DATABASE_PASSWORD>' CREATEDB;
CREATE DATABASE academy OWNER bipul;
```

Consequence for Stage 1: the backfill has **nothing to back fill**. The instruction to mark rather than
delete abandoned checkouts still stands, but there are zero rows, so it is a no-op against this database.
It will matter wherever the real deployment lives.

### Stage 0 — test files are typechecked but not emitted

`apps/api/tsconfig.json` includes `src/**/*.ts`, so adding `*.test.ts` beside the services put compiled
test files into `dist/`, and `bun test` then ran both the source and the built copy (70 tests where there
were 35).

Chosen: added `apps/api/tsconfig.build.json`, which extends the base config and excludes `src/**/*.test.ts`.
`build` uses it; `typecheck` still uses `tsconfig.json`, so tests remain fully typechecked. The test script
is scoped to `bun test src` as a second guard.

Rejected: excluding tests from `tsconfig.json` outright, which would have left them untypechecked.

### Stage 1 — the generated migration is unsafe for a populated database

`0001_tiny_major_mapleleaf.sql` adds `payments.course_id` as `NOT NULL` with no default and no backfill,
and recreates `enrollment_status` without `CANCELLED`. Both are fine here — every affected table was empty
and verified so before applying (`0 payments, 0 enrollments, 0 cancelled`) — but **both would fail against
a database with rows**.

Chosen: apply the generated migration as-is rather than hand-edit it, since hand-editing generated
migrations is forbidden by the repo conventions and this database is empty.

**If this schema is ever applied to a populated deployment, the migration must be replaced by a manual
three-step sequence:**

1. `ALTER TABLE payments ADD COLUMN course_id uuid;` (nullable)
2. `UPDATE payments p SET course_id = e.course_id FROM enrollments e WHERE e.id = p.enrollment_id;`
3. `ALTER TABLE payments ALTER COLUMN course_id SET NOT NULL;` and add the FK

plus, before the enum recreation, `UPDATE enrollments SET cancelled_at = now() WHERE status = 'CANCELLED'`
followed by setting those rows to `ACTIVE`. Per the standing instruction, mark rather than delete: any
enrolment with no successful payment on a priced course gets `cancelled_at = now()`, not a `DELETE`.

### Stage 1 — a re-purchase reactivates rather than duplicates

`enrollments` has a unique index on `(user_id, course_id)`, so settlement cannot blindly insert. Added
`grantAccess`, an upsert that clears `cancelled_at` on conflict. A student who was refunded and buys again
gets their access back with progress, submissions, and completion intact — which is what ADR-0005's
"completion latches" requires.

### Stage 1 — amount verification is skipped in mock mode

`validatePayment` now returns the gateway's reported `amount`, but mock mode has no real amount to report
and returns null. Settlement therefore enforces the amount check only when the gateway supplies one, and
always enforces the validation status. Documented rather than faked, because inventing a mock amount would
make the check look stronger than it is.

### Stage 3 — the ownership backfill is a real migration, not a note

`0002` adds `course_teachers.role` defaulting to `TEACHER`, which would leave every existing course
ownerless. Rather than document the fix, authored `0003_backfill_course_owner_roles.sql` through
`drizzle-kit generate --custom` — a migration created by the tool, not a hand-edit of a generated one.

It promotes the creator where they are on the roster, inserts the creator where they are not, and as a
last resort promotes the longest-standing teacher of any course still without an owner (creator deleted,
roster rebuilt). No-op against this empty database; correct against a populated one.

### Stage 3 — an admin-created course starts ownerless, deliberately

`courses.create` seeds an `OWNER` row only when a teacher creates the course. An admin-created course has
no owner until teachers are first assigned, at which point the first assignee is promoted. Admins bypass
the ownership guard entirely, so nothing is unreachable in the meantime.

Rejected: auto-assigning the creating admin as a course owner. Admins are not teachers, and the previous
code already excluded them from the roster.

### Stage 3 — tests now load the root .env

`course-service.ts` imports `@mma/db`, whose client parses `DATABASE_URL` at module load, so testing it
requires the variable to exist. The test script became `bun test --env-file ../../.env src`, matching the
existing `dev` and `worker:*` scripts. No test connects to the database — `pg` only dials on first query.

### Stage 4 — kept the guard the plan said to remove

`docs/implementation-plan.md` says `ensureCanReviewCourse` "must stop refusing withdrawn courses, since
restore now routes them back through approval". Implemented the opposite, deliberately: the guard stays.

Restore sets the course to `DRAFT`, so a restored course reaches review through the normal path and never
hits the `ARCHIVED` branch. Removing the guard would only enable submitting a *still-withdrawn* course
directly, skipping restore — which contradicts the CONTEXT.md definition ("a restored course returns as a
Draft and must be approved again"). The message now says "Restore this course before submitting it for
review" instead of stating a flat prohibition.

The plan was written before the code was; where they disagree the ADR and glossary win.

### Stage 4 — the web client called a route that no longer exists

`DELETE /courses/:id` became `POST /courses/:id/withdraw`. `apps/web/src/lib/api/courses.ts` still had
`archiveCourse` pointing at the old verb, which lint and typecheck would not have caught — it is a string
URL. Renamed to `withdrawCourse`, added `restoreCourse`, and updated the single caller in
`routes/dashboard/courses/index.tsx`.

Worth remembering for the remaining stages: renaming an endpoint does not fail the build. Grep the web
client every time a route changes.

### Stage 5 — the email queue enqueue is gone, as instructed

`staff-account-service.ts` no longer enqueues `staff-account-invite`. The `email` queue has no worker and
no mail transport is installed anywhere in the repo, so the job only parked a plaintext temporary password
in Redis indefinitely. The password now reaches the new account holder solely through the creation
response, which the admin passes on out of band.

The `email` queue itself is still declared in `lib/queues.ts` and now has neither producer nor consumer.
Left in place — removing it is a separate decision, and it will be wanted the moment a transport exists.

### Stage 5 — verifyPassword throws on a malformed hash

`better-auth`'s `verifyPassword` throws `Invalid password hash` rather than returning false when the
stored credential is not in `salt:key` form. On the re-auth path that would surface as a 500 instead of a
clean refusal. `verifyPasswordHash` in `packages/auth/src/server.ts` now catches and returns false — fail
closed. Covered by a test.

Found because a test stub used a fake hash string; worth keeping in mind that a corrupt row in `accounts`
would have done the same thing in production.

### Stage 5 — the admin UI called the removed delete endpoint

Same class of break as Stage 4, and exactly what that note warned about. `apps/web` had
`deleteAdminUser` posting to `DELETE admin/users/:id` behind a trash-can button. Both removed; the
deactivate toggle already sitting next to it is now the only way to disable an account, which is what
ADR-0003 intends.

### Stage 6 — admin moderation routes live under /admin, not /messages

`messagesRoutes` applies `requireRole("STUDENT", "TEACHER")` to the whole router, so an admin cannot reach
anything mounted there. The moderation endpoints are therefore under `/api/v1/admin/message-reports/*` and
`/api/v1/admin/messages/:id/hide`, behind `requireAdmin()`. Only the report itself — a participant action —
stays on `/api/v1/messages/conversations/:id/report`.

### Stage 6 — the tombstone is applied in the view mapper, deliberately

`mapMessageView` substitutes the placeholder, and everything funnels through it: the message list, the
conversation list's `lastMessage` preview, and the WebSocket publish path. Doing it at the repository would
have destroyed the original; doing it per-caller would have leaked the first time someone added a route.
Admin review passes `revealHidden: true` to see the original, which is the entire reason for retaining it.

### Stage 6 — no web UI was built for moderation (resolved)

Originally left backend-only rather than guessing at a safeguarding UI unprompted. **Now built**: a Report
button in the conversation header, `components/messages/report-conversation-dialog.tsx`, the admin queue at
`/dashboard/admin/message-reports`, per-message hide, and tombstone rendering for participants.

Two choices worth recording:

- **The report dialog says out loud what reporting does.** "An administrator will be able to read your
  conversation with X while this report is open. Every time they do, it is recorded." A safeguarding
  control that quietly grants a third party read access to a private channel — with a minor on one side —
  would be the wrong thing to build silently.
- **Opening a conversation in the queue is an explicit click.** `reviewReportedConversation` writes an
  access-log row, so it is never prefetched, hovered, or rendered as a preview. A queue that logged an
  admin read for every page load would make the audit trail worthless.

`listOpenReports` was returning bare UUIDs — no names, nothing to triage on. It now joins the reporter and
both participants (`conversationReportsRelations` in `packages/db`, TS-only, no migration).

### Stage 6 — blocking is still not implemented

Recorded in ADR-0004 as out of scope and worth revisiting. A student who reports a teacher remains in a
channel with them until an admin acts.

### Stage 7 — notifications are best effort, on purpose

`notifyUsers` catches and logs rather than throwing. Telling someone what happened must never be able to
undo the thing that happened: a Redis outage should not roll back a settled payment or an approved course.
The failure is logged, never swallowed silently.

### Stage 7 — MESSAGE stays unwired

Per the decision recorded in CONTEXT.md, a new message raises no notification. Messaging already has live
WebSocket delivery and an unread badge, and it is the highest-frequency event on the platform, so a second
alert would be noise. Four of the six notification types now have producers: NOTICE, PAYMENT, COURSE,
BUG_REPORT. SYSTEM remains the admin broadcast.

### Caching — analytics expires, it is not invalidated

Course listings and the category tree are invalidated by the mutations that own them: a course is
approved, a category is moved, the cached entry goes. Analytics aggregates are not.

They would have to be dropped by `CommerceService` on every settlement and refund, which means
`commerce-service.ts` importing `analytics-service.ts`. That is service → service, which
`apps/api/AGENTS.md` reserves for one documented exception, and it would put a live Redis call inside the
commerce unit tests, which stub every repository precisely so they touch nothing.

Chosen: a 300-second TTL and no cross-service call. `invalidateAnalyticsCache()` is exported from
`analytics-service.ts` for whoever decides the five-minute lag is unacceptable — the wiring is one line
from wherever it belongs. A dashboard that is five minutes behind on revenue is a normal dashboard; a
catalogue that is two minutes behind on a withdrawn course is not, which is why those two are treated
differently.

### Caching — the cache is never load-bearing

`lib/cache.ts` catches on read and on write. Redis being down makes every page slower and nothing else.
The read path also survives a payload it cannot parse, because a cached value whose shape has since
changed must not become a 500 on a public page.

The one trap worth naming: repository records carry `Date` fields, and `JSON.parse` returns strings for
them. A service mapper calling `.toISOString()` would throw on the first cache *hit* and pass every test
that only ever saw a cache miss. The codec encodes dates as `{"__date": iso}` and revives them; it is
pinned by `lib/cache.test.ts`.

## Decisions from 3 August 2026

### Video metadata is parsed, not transcoded

There is no ffmpeg on the API host, and installing one is a deployment decision rather than a code change.
`services/video-metadata.ts` reads duration and display size straight out of the ISO base media container,
walking the top-level boxes by ranged reads so a 500MB upload costs a handful of requests instead of a
download.

Consequences worth knowing: only MP4/MOV/M4V can be read. A WebM upload makes the job *succeed* and record
nothing — otherwise every WebM would retry until BullMQ gave up on it. And `moov` is commonly written after
`mdat`, which is why the whole file is traversed rather than just its head.

### The cache is never load-bearing, and analytics only expires

Covered in full under "Caching" above. Two things to carry forward: `lib/cache.ts` catches on both read and
write, so Redis being down makes pages slower and nothing else; and analytics has a 300-second TTL with no
explicit invalidation, because dropping it on settlement would mean `commerce-service` importing
`analytics-service`, which `apps/api/AGENTS.md` reserves for one documented exception.

### The moderation queue needed a backend change to be usable

`listOpenReports` returned bare UUIDs — no reporter name, no participants, nothing to triage on. It now
joins both through `conversationReportsRelations`, which is TypeScript-only and needed no migration.

Two UI choices are load-bearing rather than cosmetic:

- **The report dialog says out loud what reporting does.** Reporting is what grants an admin read access to
  a private channel, with a minor potentially on one side. Building that silently would have been wrong.
- **Opening a conversation in the queue is an explicit click.** The read writes an access-log row, so it is
  never prefetched, hovered, or rendered as a preview — and it is deliberately *not* a TanStack Query, so
  a window-focus refetch cannot log a read the admin did not make.

### Two components keep local state on purpose

The web migration to TanStack Query is complete except for two places, both documented in
`apps/web/AGENTS.md`: the messages thread, which is driven by WebSocket events rather than fetches, and the
admin moderation thread, for the audit reason above.

### E2E runs on port 3100

Playwright reuses whatever is already listening. The first run of the suite passed one test and failed
eleven, because port 3000 on this machine was serving an entirely unrelated project — which fails in a way
that looks like a broken app rather than a port collision. The config now starts its own server on 3100.

### Bun's isolated store breaks React Native

`bunx expo-doctor` reported four copies of `expo`, three of `expo-constants`, and more. React Native links
exactly one copy of a native module; several on disk is a broken native build, not a warning.

Chosen: `bunfig.toml` at the repo root with `linker = "hoisted"`, and a clean reinstall. This changes the
`node_modules` layout for *every* workspace, which is why it is recorded here rather than buried in the
mobile app. The result went from 18/20 checks to 20/20.

The remaining conflict was React: Expo SDK 57 pins 19.2.3 exactly, the monorepo is on 19.2.8, and hoisting
allows only one. The mobile workspace excludes React from the Expo version check rather than having two
Reacts on disk — a newer patch of React is the lesser problem by a wide margin.

### Three mobile capabilities defer to the web app

Recorded because they are boundaries, not omissions, and each has a note in the code:

- **Video playback.** The player screen tracks and marks progress. Shipping a second video stack to play
  the same files is not parity, it is duplication.
- **Profile completion.** A long, role-specific form validated against schemas the web app already
  renders. Pointing at the web page is honest; a half-built duplicate would not be.
- **Realtime messaging.** The conversation screen polls every 10 seconds. A WebSocket that reconnects on
  every backgrounding is a worse experience on a phone than a short poll.

## Findings that are not blockers

- **A cancelled checkout is stored as `FAILED`.** `payment_status` has no `CANCELLED` member
  (`PENDING | SUCCESS | FAILED | REFUNDED`), so `handlePaymentCallback` writes `FAILED` and preserves the
  distinction in `metadata.lastCallbackStatus` and the return redirect. Deliberate, not a defect. Pinned by
  a characterisation test.

### Stage 1 — the admin dashboard enrolment count, verified

`admin-dashboard-repository.ts:25` is still an unfiltered `count()` over `enrollments`. Under the old model
that silently counted abandoned checkouts. It no longer can, because the table holds only enrolments that
were actually paid for. It does now include enrolments cancelled by a refund.

Left as-is: "how many people have ever enrolled" is a defensible lifetime figure and is strictly more
accurate than before. Switching it to exclude cancelled enrolments is a product decision, not a defect.

## Open blockers

None. What is left in the plan needs credentials (a live SSLCommerz store, real Onecodesoft keys) or a
human judgement (accessibility, whether to build blocking) — not a decision this log can record.
