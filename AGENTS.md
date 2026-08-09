# AGENTS.md — Mehedi's Math Academy

Monorepo for **mehedismathacademy.com**, an LMS. Bun + Turborepo + TypeScript.

Nested `AGENTS.md` files exist per workspace. Read the one for the workspace you are editing — it holds the layer rules that matter for that code:

| Path | Purpose |
| --- | --- |
| `apps/api/AGENTS.md` | Hono API — route → controller → service → repository layering |
| `apps/web/AGENTS.md` | TanStack Start web app |
| `apps/mobile/AGENTS.md` | Expo app (still template boilerplate) |
| `packages/db/AGENTS.md` | Drizzle schema + migrations |
| `packages/shared/AGENTS.md` | Zod validators, shared types |
| `packages/i18n/AGENTS.md` | Bilingual catalogue and locale formatters |
| `packages/auth/AGENTS.md` | Better Auth wiring |
| `packages/mailer/AGENTS.md` | SMTP transport and the password-reset mail |
| `tooling/scripts/AGENTS.md` | Seed and backfill scripts |

`packages/config` holds the shared `tsconfig.base.json`, `eslint.config.mjs`, and `prettier.config.mjs`. It has no other code and no nested `AGENTS.md`.

## Commands

Run from the repo root; Turborepo fans out to workspaces.

```bash
bun install
bun run dev          # all workspaces in parallel
bun run build
bun run lint
bun run typecheck
bun run db:generate  # drizzle-kit generate
bun run db:migrate   # drizzle-kit migrate
bun run db:seed
```

Single workspace: `bun run --filter @mma/api dev` (or `cd apps/api && bun run dev`).

**Package manager is `bun`, not npm.** The lockfile is `bun.lock`. Never hand-edit it.

## Workspace graph

```
apps/web  ──┬─> @mma/auth ──┬─> @mma/db
apps/api  ──┤                 ├─> @mma/shared
            │                 └─> @mma/mailer ─> @mma/i18n
            ├─> @mma/shared
            └─> @mma/i18n
tooling/scripts ─> @mma/auth, @mma/db, @mma/shared
apps/mobile — standalone, no workspace deps yet
```

Packages are consumed as **TypeScript source**, not built output — `exports` in each `package.json` points at `./src/*.ts`. There is no build step between a package edit and an app picking it up.

## Ports and environment

- Web: `http://localhost:3000` (Vite)
- API: `http://localhost:3001` (`API_PORT`, default 3001)
- Env lives in **one root `.env`**. Apps load it explicitly: the API via `bun --env-file ../../.env`, the web app via Vite's `envDir: repoRoot`. Do not add per-workspace `.env` files.
- `.env.example` is the contract. When you add a variable, add it there and to the matching Zod env schema — and to `.env.docker.example` too, unless it's one of the three (`DATABASE_URL`, `REDIS_URL`, `VITE_SSR_API_BASE_URL`) that `docker-compose.yml` overrides itself.
- Env is validated with Zod at module load: `apps/api/src/lib/env.ts`, `apps/web/src/lib/env.ts`, and inline schemas in `packages/db/src/client.ts` and `packages/auth/src/*.ts`. Never read `process.env` directly in feature code.
- Docker: `docker-compose.yml` + `apps/api/Dockerfile` + `apps/web/Dockerfile` run the whole stack in containers — see the README's "Running with Docker" section. `docker compose config` echoes real `env_file` contents; never run it (or `up`/`run`) against the real `.env` in a way whose output could leak into a shared transcript or log — swap in a placeholder file first if you need to validate the compose file itself.

### Auth topology (easy to get wrong)

Better Auth's HTTP handler is mounted in the **web app**, not the API — `apps/web/src/routes/api/auth/$.ts` serves `/api/auth/*` using `@mma/auth/tanstack-server`. `BETTER_AUTH_URL` therefore points at the web origin (`http://localhost:3000`).

The API does not serve auth endpoints. It only *verifies* sessions: `sessionContextMiddleware` calls `auth.api.getSession()` from `@mma/auth/server` and puts `authSession` / `authUser` on the Hono context. See `packages/auth/AGENTS.md` for why there are three near-identical server configs.

## Conventions

Enforced by `packages/config/tsconfig.base.json` and the shared ESLint config:

- **Strict TS**, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`. Optional properties need explicit `| undefined` in the type when they may be passed as `undefined`.
- `@typescript-eslint/no-explicit-any` is an **error**. No `any`.
- `consistent-type-imports` is an error — use `import type { ... }`.
- Prettier: double quotes, semicolons, `printWidth: 100`, `trailingComma: "none"`, 2-space indent.
- Path alias `@/*` maps to `./src/*` inside `apps/api` and `apps/web`. Packages use relative imports internally.
- Object literal keys and interface members are kept alphabetically sorted in most existing code. Match the surrounding file.
- Prefer `readonly T[]` for arrays that are returned and not mutated. Repositories and services do this consistently.
- Explicit return types on exported functions and public class methods.
- Async/await, never `.then()` chains.

## Working agreement

- Read the code before editing it. Do not infer behaviour from `PLAN.md`, `README.md`, or comments — those documents describe intent and drift from the implementation.
- Keep changes focused on the request. No drive-by refactors.
- One logical change per commit. Conventional Commits (`feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `perf`, `build`, `ci`).
- After a change, run `bun run typecheck` and `bun run lint` for the affected workspace at minimum.
- `bun run test` fans out to the workspaces that have tests: unit suites for `@mma/api` services and `@mma/shared` validators, plus the API's integration tests over the real Hono app. It needs Postgres; Redis only when `REDIS_ENABLED=true`, and the suite is expected to pass with it off. Playwright lives outside that task — `bun run --filter @mma/web test:e2e`.

## Reference documents

- `PLAN.md` — phased build roadmap (large; aspirational, not a spec of current state)
- `docs/mobile-plan.md` — the staged plan for `apps/mobile`, from "it compiles" to a shippable build
- `DESIGN.md` — the Mehedi's Math Academy design system. Authoritative on visuals.
- `README.md` — setup and command reference
