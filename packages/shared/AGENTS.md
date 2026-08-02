# AGENTS.md — `@mma/shared`

The contract layer between the API, the web app, and scripts: Zod validators, shared types, and slug helpers. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```
src/validators/*.ts   One module per feature. index.ts re-exports all of them.
src/types/roles.ts    userRoleValues / userRoleSchema / UserRole.
src/constants/app.ts  appName, appDomain, appUrl.
src/slug.ts           slugifySegment, buildSerialSlugCandidate, generateUniqueSlug, slugifyWithRandomSuffix.
```

`src/index.ts` re-exports everything, so `import { createCourseSchema, type UserRole } from "@mma/shared"` is the normal form. Subpath exports (`@mma/shared/validators/*`, `@mma/shared/types/*`, `@mma/shared/constants/*`) also exist but are rarely used.

Zod v4. Only dependency.

## Rules

- **This package must stay runtime-agnostic.** It runs in the browser bundle, in Bun on the server, and in scripts. No `node:` imports, no DB access, no `process.env`, no Hono or React types.
- A schema defined here is the single definition of that shape. The API parses requests with it (`apps/api/src/routes/v1/*.route.ts`), and the web client derives its input types from it (`type CreateCategoryInput = z.infer<typeof createCategorySchema>`). Do not redeclare an equivalent interface on either side.
- New validator module: create `src/validators/<feature>.ts`, then add the `export *` line to `src/validators/index.ts`. It will not be reachable otherwise.
- Reuse the primitives in `src/validators/common.ts` — `idSchema` (uuid), `emailSchema`, `nonEmptyStringSchema`, `paginationSchema` (page/limit with defaults and a max of 100).
- Naming: `createXSchema`, `updateXSchema`, `xQuerySchema`, `xIdParamsSchema`, `slugParamsSchema`.

## Roles

```ts
userRoleValues = ["STUDENT", "TEACHER", "ACCOUNTANT", "ADMIN"] as const;
```

These strings are also the Better Auth role values and appear in the database. Adding or renaming one touches `packages/auth` (`defaultRole` / `adminRoles`), the API's `requireRole` call sites, and any existing rows. Treat it as a migration, not a constant edit.

## Slugs

`generateUniqueSlug(name, isTaken)` takes an async collision predicate and is the shared path for user, course, and category slugs. Callers supply the DB lookup. Note that `tooling/scripts/slug.ts` is a stale local copy of this module — see that workspace's `AGENTS.md`.
