# AGENTS.md — `@genex/scripts`

One-off and maintenance scripts run directly with Bun. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run db:seed                  # bun --env-file ../../.env seed.ts
bun run db:backfill-user-slugs   # bun --env-file ../../.env backfill-user-slugs.ts
bun run typecheck
```

Also reachable from the repo root: `bun run db:seed`, `bun run db:backfill-user-slugs`.

## Scripts

- **`seed.ts`** — idempotent. Creates or updates the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (Zod-validated), hashing via `createPasswordHash` from `@genex/auth/server` so the credential matches what Better Auth expects. It first checks that `public.users` exists and fails with a clear message telling you to run `db:migrate` — do not remove that guard.
- **`backfill-user-slugs.ts`** — fills `users.slug` for rows where it is null or empty. This exists because the web app's Better Auth config (`@genex/auth/tanstack-server`) has no slug-generation hook, while `@genex/auth/server` does. See `packages/auth/AGENTS.md`.

## Rules

- Scripts are **plain top-level modules run by Bun**, not compiled. They must be idempotent and safe to re-run: check for existing rows before inserting, and prefer `update` over blind `insert`.
- Env comes from the root `.env` via `bun --env-file ../../.env`. Validate any variable you read with a Zod schema at the top of the file, as `seed.ts` does. `@genex/db` throws at import time without `DATABASE_URL`, so the env file is not optional.
- A new script means: add the file here, add a script entry to this workspace's `package.json`, add a matching passthrough script to the root `package.json`, and register the task in `turbo.json` with `"cache": false`.
- These scripts run against real databases. Print what changed, and do not add destructive operations without an explicit confirmation flag.

## Known duplication

`slug.ts` here is a **stale local copy** of `packages/shared/src/slug.ts`. The shared version exports `slugifySegment` and `buildSerialSlugCandidate` publicly and adds `slugifyWithRandomSuffix`; this copy keeps them private and lacks the last function. Both `seed.ts` and `backfill-user-slugs.ts` import from the local copy.

Do not extend the local copy. If you need slug behaviour here, switch the import to `@genex/shared` (already a dependency of this workspace) and delete `slug.ts` as its own change.
