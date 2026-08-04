# AGENTS.md — `@genex/scripts`

One-off and maintenance scripts run directly with Bun. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run db:seed                  # bun --env-file ../../.env seed.ts
bun run db:seed-demo             # bun --env-file ../../.env seed-demo-data.ts
bun run db:backfill-user-slugs   # bun --env-file ../../.env backfill-user-slugs.ts
bun run typecheck
```

Also reachable from the repo root: `bun run db:seed`, `bun run db:seed-demo`, `bun run db:backfill-user-slugs`.

## Scripts

- **`seed.ts`** — idempotent. Creates or updates the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (Zod-validated), hashing via `createPasswordHash` from `@genex/auth/server` so the credential matches what Better Auth expects. It first checks that `public.users` exists and fails with a clear message telling you to run `db:migrate` — do not remove that guard. Safe against production; do not add course/catalogue content here.
- **`seed-demo-data.ts`** / **`seed-demo-fixtures.ts`** — the demo catalogue: categories, teachers, students, courses, chapters, lectures, tests and reviews. Refuses to run unless `NODE_ENV=development`. Idempotent by natural key (slugs, emails), with one exception: `reviews` is upserted (`onConflictDoUpdate` on the `(course, user)` unique index), not `onConflictDoNothing`, because review text is fixture content that must actually change when the fixture changes — a `doNothing` insert would leave stale review text sitting behind a satisfied unique constraint forever. Chapters are deleted and rebuilt per course on every run (cascades to lectures, tests, questions, options) rather than diffed, so the fixtures are always the truth for course content.
  - Every lecture's `videoUrl` is a real public YouTube watch URL (`https://www.youtube.com/watch?v=<id>`, picked from small per-subject pools in the fixtures file) — not a placeholder file. `getEmbedVideoUrl` (`apps/web/src/lib/video.ts`) turns that into an `/embed/<id>` URL for the player.
  - Every course's `coverImageUrl` and each teacher's `image` are real photos from Lorem Picsum (`https://picsum.photos/seed/<key>/<w>/<h>`), keyed by a stable seed in the fixture so the same course always gets the same photo.
  - Every chapter test inserts real `test_questions` **and** four `question_options` per question with exactly one `is_correct: true` — the grader (`apps/api/src/services/assessment-grading.ts`) reads `question_options.is_correct` / `selected_option_id`, not `test_questions.correct_answer`, so a seeded exam with questions and no options is not gradable. Do not go back to inserting bare questions without options.
- **`backfill-user-slugs.ts`** — fills `users.slug` for rows where it is null or empty. This exists because the web app's Better Auth config (`@genex/auth/tanstack-server`) has no slug-generation hook, while `@genex/auth/server` does. See `packages/auth/AGENTS.md`.

## Rules

- Scripts are **plain top-level modules run by Bun**, not compiled. They must be idempotent and safe to re-run: check for existing rows before inserting, and prefer `update` over blind `insert`.
- Env comes from the root `.env` via `bun --env-file ../../.env`. Validate any variable you read with a Zod schema at the top of the file, as `seed.ts` does. `@genex/db` throws at import time without `DATABASE_URL`, so the env file is not optional.
- A new script means: add the file here, add a script entry to this workspace's `package.json`, add a matching passthrough script to the root `package.json`, and register the task in `turbo.json` with `"cache": false`.
- These scripts run against real databases. Print what changed, and do not add destructive operations without an explicit confirmation flag.

## Known duplication

`slug.ts` here is a **stale local copy** of `packages/shared/src/slug.ts`. The shared version exports `slugifySegment` and `buildSerialSlugCandidate` publicly and adds `slugifyWithRandomSuffix`; this copy keeps them private and lacks the last function. Both `seed.ts` and `backfill-user-slugs.ts` import from the local copy.

Do not extend the local copy. If you need slug behaviour here, switch the import to `@genex/shared` (already a dependency of this workspace) and delete `slug.ts` as its own change.
