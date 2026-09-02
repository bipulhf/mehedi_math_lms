# AGENTS.md — `@mma/db`

Drizzle ORM schema, Postgres client, and migrations. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run db:generate   # drizzle-kit generate — writes SQL into src/migrations/
bun run db:migrate    # drizzle-kit migrate — applies pending migrations
bun run typecheck
```

Both are also available from the repo root via Turborepo.

## Layout

```
src/client.ts          Pool + drizzle instance. Validates DATABASE_URL with Zod at import time.
src/schema/*.ts        One file per table group. index.ts re-exports all of them.
src/schema/enums.ts    Shared pgEnum definitions.
src/schema/relations.ts  Drizzle relations, kept separate from table definitions.
src/migrations/        Generated SQL + meta journal.
drizzle.config.ts      Loads the root .env, points schema at src/schema/index.ts.
```

## The re-export surface

`src/index.ts` exports the client, the whole schema, **and a hand-picked list of drizzle-orm operators**:

```ts
export { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
```

Consumers import everything from `@mma/db` — `import { and, courses, db, eq } from "@mma/db"`. If a repository needs an operator that is not on that list (`gt`, `gte`, `sum`, `between`, ...), **add it to `src/index.ts`** rather than importing `drizzle-orm` directly in `apps/api`. Keeping one import surface is the point.

## Schema conventions

Follow `src/schema/categories.ts`:

- `pgTable("snake_case_plural", { ... }, (table) => [ ...indexes ])`.
- Primary keys: `uuid("id").defaultRandom().primaryKey()`.
- Column names are `snake_case` in SQL, camelCase in TS.
- Timestamps: `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()` — always `withTimezone`.
- Indexes and unique indexes are declared in the third callback argument, named `<table>_<column>_idx` / `<table>_<column>_unique_idx`.
- Foreign key columns are frequently declared as plain `uuid(...)` without an inline `.references()`; the relationship is expressed in `src/schema/relations.ts`. Match the surrounding file rather than mixing styles.

## Migrations

**Never write or edit files in `src/migrations/` by hand.** Change the schema, then run `bun run db:generate` and commit the generated SQL together with the schema change. `src/migrations/**` is excluded from ESLint.

`drizzle.config.ts` runs with `strict: true` and `verbose: true`, so generation will prompt on destructive changes. Read those prompts — this schema has production data behind it.

## Auth tables

`users`, `sessions`, `accounts`, and `verificationTokens` are owned by this package but consumed by Better Auth through the drizzle adapter in `@mma/auth`, which maps them to Better Auth's expected model names. Renaming a column on those four tables means updating the adapter mapping and `additionalFields` in every server config under `packages/auth/src/`.

Two of the indexes on them are load-bearing in a way that is not obvious from the column:

- `users.phone_number` carries a **unique** index and is nullable. Postgres counts nulls as distinct, so it constrains the people who have a number without demanding one from everyone. It is the account key for phone sign-in and is stored in exactly one shape, `8801XXXXXXXXX` — see [ADR-0016](../../docs/adr/0016-a-phone-number-is-a-second-front-door.md).
- `verification_tokens.token` carries a **plain** index and must not be made unique again. Better Auth's phone plugin stores an OTP there as `"123456:0"` and inserts a fresh row per request, so two people asking for a code at the same moment can draw the same six digits. Under a unique index that is a constraint violation on a request we have already paid an SMS for. Nothing reads a verification by that column; `identifier` is the key.

## Client

`db` is a module-level singleton over a `pg.Pool`. `DATABASE_URL` is parsed with Zod at import time, so importing `@mma/db` in a process without that variable throws immediately — which is intended. Scripts and workers must load the root `.env` before importing (`bun --env-file ../../.env`).
