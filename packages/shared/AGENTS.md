# AGENTS.md — `@genex/shared`

The contract layer between the API, the web app, and scripts: Zod validators, shared types, and slug helpers. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```
src/validators/*.ts   One module per feature. index.ts re-exports all of them.
src/types/roles.ts    userRoleValues / userRoleSchema / UserRole.
src/constants/app.ts  appName, appDomain, appUrl.
src/slug.ts           slugifySegment, buildSerialSlugCandidate, generateUniqueSlug, slugifyWithRandomSuffix.
src/image-variants.ts imageVariantWidths, buildImageVariantKey, withImageVariants, readImageVariants,
                      buildImageSrcSet, pickImageVariant.
src/progress-chunks.ts maxProgressChunks, resolveProgressChunks.
```

The last two are not validators, and they are here for the same reason the validators are: three runtimes have to agree.

- **Image variants.** The API marks an uploaded image's URL with the widths it generated; the web app turns that into a `srcset` and the Expo app picks one URL by device pixels. If each side derived variant URLs on its own, a rename on one would 404 on the others — and a `srcset` candidate that 404s breaks the image, because the browser does not fall back to `src`.
- **Progress chunks.** DESIGN.md's chunked tracker means turning a percentage into whole blocks, and the rounding rules — some progress never rounds to empty, nearly-done never rounds to full — are a product decision, not a rendering detail. Web and mobile draw different elements from the same numbers.

`src/index.ts` re-exports everything, so `import { createCourseSchema, type UserRole } from "@genex/shared"` is the normal form. Subpath exports (`@genex/shared/validators/*`, `@genex/shared/types/*`, `@genex/shared/constants/*`) also exist but are rarely used.

Zod v4. Only dependency.

## Tests

`bun run test` runs `bun test src`. Every validator with a rule in it has a suite beside it.

These schemas are the contract in both directions — the API validates requests with them and the web app resolves its React Hook Form fields against them — so a loosened `.min()` or a dropped `.uuid()` changes what the server accepts _and_ what the client blocks, in one edit. Tests here exist to make that edit visible. When you add or relax a rule, assert both sides of it: the value that now passes and the neighbouring one that must still fail.

Two traps the suite already pins:

- `.partial()` does **not** strip a `.default()`. `updateCourseSchema` is derived from a defaults-free field shape for exactly that reason — deriving it from `createCourseSchema` made every course patch carry `isExamOnly: false`.
- `z.coerce.boolean()` is `Boolean(input)`, so **every** non-empty query string — including `"false"` — becomes `true`. Use `booleanQueryParamSchema` from `common.ts` for any flag that arrives in a URL.

## Rules

- **This package must stay runtime-agnostic.** It runs in the browser bundle, in Bun on the server, and in scripts. No `node:` imports, no DB access, no `process.env`, no Hono or React types.
- A schema defined here is the single definition of that shape. The API parses requests with it (`apps/api/src/routes/v1/*.route.ts`), and the web client derives its input types from it (`type CreateCategoryInput = z.infer<typeof createCategorySchema>`). Do not redeclare an equivalent interface on either side.
- New validator module: create `src/validators/<feature>.ts`, then add the `export *` line to `src/validators/index.ts`. It will not be reachable otherwise.
- Reuse the primitives in `src/validators/common.ts` — `idSchema` (uuid), `emailSchema`, `nonEmptyStringSchema`, `paginationSchema` (page/limit with defaults and a max of 100), `booleanQueryParamSchema` (a flag in a query string).
- Naming: `createXSchema`, `updateXSchema`, `xQuerySchema`, `xIdParamsSchema`, `slugParamsSchema`.

## Roles

```ts
userRoleValues = ["STUDENT", "TEACHER", "ACCOUNTANT", "ADMIN"] as const;
```

These strings are also the Better Auth role values and appear in the database. Adding or renaming one touches `packages/auth` (`defaultRole` / `adminRoles`), the API's `requireRole` call sites, and any existing rows. Treat it as a migration, not a constant edit.

## Slugs

`generateUniqueSlug(name, isTaken)` takes an async collision predicate and is the shared path for user, course, and category slugs. Callers supply the DB lookup. Note that `tooling/scripts/slug.ts` is a stale local copy of this module — see that workspace's `AGENTS.md`.
