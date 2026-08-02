# AGENTS.md — `@mma/web`

TanStack Start (React 19 + Vite 8) web frontend. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run dev        # vite dev --port 3000
bun run build
bun run typecheck
bun run lint
```

Requires the API running on `http://localhost:3001` — see the proxy note below.

## Layout

```
src/routes/          File-based routes. TanStack Router generates src/routeTree.gen.ts from these.
src/routes/api/      Server route handlers (currently only the Better Auth catch-all).
src/components/ui/   Primitives — button, card, input, label, select, textarea, badge, skeleton, password-input.
src/components/<feature>/  Feature components (courses, tests, profile, certificates, ...).
src/components/layout/     app-shell, public-layout, dashboard-layout, auth-layout.
src/components/common/     fade-in, route-error, data-table-skeleton.
src/features/landing/      Landing page sections. The only thing under features/ — see below.
src/lib/api/         One module per API feature. Thin typed wrappers over the shared client.
src/lib/             env, auth glue, seo, site config, ssr-api, category-tree, ws-url, utils, firebase, forms.
src/hooks/           React hooks — use-auth-session, use-messaging-socket.
src/styles/app.css   Tailwind v4 entry and the full design token set.
```

`src/routeTree.gen.ts` is **generated** — never edit it. It regenerates on dev/build.

There is no `src/providers/` directory — providers are composed in `src/routes/__root.tsx`, and the empty directory the plan asked for was deleted rather than left looking like unfinished work.

**Where a new component goes.** Domain components go in `src/components/<domain>/`, not in `src/features/`. `src/features/landing/` is the one exception and stays that way: it is a set of homepage sections, not a domain. Domain hooks go in `src/hooks/` — `use-messaging-socket.ts` is the pattern, extracted when a route file grew a cluster of state only one part of it read.

## Loading states

No spinners, anywhere — `animate-spin` and "Loading…" are both absent from this workspace and must stay that way.

Two skeleton patterns coexist, and which one applies is decided by the route, not by taste:

- A route **with a `loader`** declares a `pendingComponent` — the five public pages do this. `defaultPendingMs` means a fast navigation skips it.
- A route **without a loader** has nothing to be pending on. The dashboard fetches client-side with TanStack Query, so those pages render their skeleton inline from `isPending`, with a ternary rather than `&&`.

The plan originally said "every route". This split is the amended rule (`PLAN.md` §12); do not introduce a third pattern.

## Server state

TanStack Query owns every server read. `src/routes/__root.tsx` creates the client
per render (never at module scope -- on the server that would share one user's
cache with the next request), `src/lib/query/query-client.ts` holds the defaults,
and `src/lib/query/keys.ts` is the single key factory. Use a key from that file
rather than typing an array inline, so a mutation's `invalidateQueries` cannot
drift out of sync with the query it is meant to invalidate.

Retry is off for 4xx and off for all mutations: the ky `afterResponse` hook has
already raised a toast, and a retry raises a second one.

`src/stores/ui-store.ts` (Zustand) is for genuinely global *UI* state only --
currently the unread-message badge, which the messages page owns and the sidebar
renders. Never put server data there.

Two deliberate exceptions still hold local state: the messages thread, which is
driven by WebSocket events rather than fetches, and the admin moderation thread,
whose read writes an access-log row and therefore must never be refetched on a
focus event.

## Tests

`bun run test:e2e` runs Playwright against a real stack. It starts its own Vite
dev server on **3100** — not the 3000 that `bun run dev` uses, because Playwright
reuses whatever is already listening and on a shared machine that can be a
different project entirely. The API must be running on 3001, with Postgres and
Redis behind it.

E2E is deliberately outside the Turbo `test` task, which must stay runnable with
nothing else on the machine. Point `E2E_BASE_URL` at a deployed environment to
skip the local server.

The specs cover the public pages, the dashboard redirect, the crawler files, and
the two flows that move money (`enrollment.spec.ts`, `payment.spec.ts`). The
money-path assertions are about refusal — every enrolment and payment endpoint
rejects an anonymous caller, and a forged gateway callback for an unknown payment
is a 404 rather than a redirect that settles it. Assertions that need a published
course read the catalogue first and skip with a stated reason when an environment
has none.

The dashboard chunk compiles on first navigation, so the guard-redirect
assertions allow 45s. Do not tighten that back to 15s: it made the suite fail
cold and pass warm.

## Talking to the API

Never call `fetch` directly for API data. Two clients, for two contexts:

**Browser** — `src/lib/api/client.ts` (ky). Use `apiGet`, `apiGetPaginated`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`. It sends `credentials: "include"`, resolves the base URL from `clientEnv.apiBaseUrl`, and on a failed response automatically shows a `sonner` toast with the API's `message`. **Do not add your own error toast on top of it** — you will get two.

**SSR / route loaders** — `src/lib/ssr-api.ts` (`ssrApiGet`, `ssrApiGetCourses`). It hits the API directly at `VITE_SSR_API_BASE_URL` (default `http://127.0.0.1:3001/api/v1`), bypassing the Vite proxy, and throws `SsrNotFoundError` on 404 so loaders can `throw notFound()`.

Feature modules in `src/lib/api/` unwrap the API envelope and return `response.data`, so components see plain domain types. Add new endpoints there, one module per API feature, and derive input types from the `@mma/shared` Zod schemas rather than redeclaring them:

```ts
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
```

### Base URL resolution

`src/lib/env.ts` forces `apiBaseUrl` to the relative `"/api/v1"` in dev so requests stay same-origin and flow through the Vite proxy (`vite.config.ts` proxies `/api/v1`, `/api/health`, `/robots.txt`, `/sitemap.xml` to `localhost:3001`). `VITE_API_BASE_URL` is only consulted in production builds. Env is read once through the Zod-validated `clientEnv` — do not touch `import.meta.env` in feature code.

## Routes

File-based, `createFileRoute`. Conventions in the existing routes:

- Data fetching lives in a `loader`, using `ssr-api`, not in a `useEffect`.
- SEO goes through `head:` plus the `seo()` helper in `src/lib/seo.ts`, which handles title/description truncation, Open Graph, and JSON-LD (`breadcrumbJsonLd`, `catalogItemListFromCourses`, ...).
- `errorComponent: RouteErrorView` on routes that can fail.
- 404s: `throw notFound()` from the loader.

Auth gating is **client-side**, in the layout route. `src/routes/dashboard.tsx` calls `useAuthSession()`, redirects to `/auth/sign-in` when there is no session, and forces incomplete profiles to `/dashboard/profile-complete`. Nested dashboard routes inherit that and should not re-implement it. Real authorization is enforced by the API — never rely on the client guard for access control.

## Auth

`src/lib/auth.ts` re-exports `authClient` from `@mma/auth/client`; `src/lib/auth-server.ts` re-exports the server `auth` from `@mma/auth/tanstack-server`. The Better Auth HTTP handler is served by **this app** at `src/routes/api/auth/$.ts`, which lazily imports the server module so it never reaches the browser bundle. Keep that dynamic import.

Read session state with `useAuthSession()` from `src/hooks/use-auth-session.ts`. Role lives at `session.session.role`.

## Styling

Tailwind v4, configured entirely in `src/styles/app.css` via `@theme` — there is no `tailwind.config.js`. The palette is a Material-style token set (`surface`, `surface-container-*`, `on-surface`, `primary`, `secondary-container`, `outline`, `error`, ...) plus `--radius-*`.

Use the semantic tokens (`bg-surface-container`, `text-on-surface-variant`) rather than raw Tailwind colours like `bg-gray-100` or an arbitrary `text-[#c4353b]`. Validation text is `text-error`.

Recharts is the one exception, and only because it writes colours out as SVG presentation attributes, which cannot resolve CSS custom properties. The handful of values the charts need are mirrored as literals in `src/lib/chart-theme.ts` — add to that file rather than retyping a hex in a route.

DESIGN.md's No-Line Rule holds: 1px solid borders are prohibited for sectioning, and where a border is genuinely needed it is `outline-variant` at 15% opacity — felt, not seen. Fonts: `font-sans` (Inter) for body, `font-display` (Manrope) for headings.

Components use `cva` for variants and `cn()` from `src/lib/utils.ts` to merge classes. Follow `src/components/ui/button.tsx` when adding a primitive. Icons come from `lucide-react`.

## Forms

`useZodForm` from `src/lib/forms/use-zod-form.ts` — react-hook-form with a `zodResolver`, taking the schema from `@mma/shared`:

```ts
const form = useZodForm({ schema: createCategorySchema, defaultValues: { ... } });
```

## Other notes

- Toasts: `sonner`. Charts: `recharts`. PDFs: `@react-pdf/renderer`.
- WebSocket URLs are built by `src/lib/ws-url.ts`; the API exposes `/api/v1/messages/ws` and `/api/v1/notifications/ws`.
- Firebase (`src/lib/firebase/`) is used for web push and is optional — it degrades when `VITE_FIREBASE_VAPID_KEY` and the Firebase config are absent. Keep new code tolerant of that.
- Components take explicit prop interfaces and an explicit `JSX.Element` return type.
