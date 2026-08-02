# Blockers and autonomous decisions

Running log for the unattended implementation of `docs/implementation-plan.md`.

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

None so far.
