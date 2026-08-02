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

## Findings that are not blockers

- **A cancelled checkout is stored as `FAILED`.** `payment_status` has no `CANCELLED` member
  (`PENDING | SUCCESS | FAILED | REFUNDED`), so `handlePaymentCallback` writes `FAILED` and preserves the
  distinction in `metadata.lastCallbackStatus` and the return redirect. Deliberate, not a defect. Pinned by
  a characterisation test.

## Open blockers

None so far.
