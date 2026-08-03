# AGENTS.md — `@genex/web`

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
src/routes/api/      Server route handlers: the Better Auth catch-all, and two hops for the Expo app.
src/components/ui/   Primitives — button, card, input, label, badge, password-input, progress-track, responsive-image.
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

No shimmer either, and no motion of any kind: `DESIGN.md` §1 forbids animation
outright, so a skeleton is a still `#F1EEE9` block. If you are adding a keyframe
to `app.css`, you are doing something the design rejects.

Two skeleton patterns coexist, and which one applies is decided by the route, not by taste:

- A route **with a `loader`** declares a `pendingComponent` — the five public pages do this. `defaultPendingMs` means a fast navigation skips it.
- A route **without a loader** has nothing to be pending on. The dashboard fetches client-side with TanStack Query, so those pages render their skeleton inline from `isPending`, with a ternary rather than `&&`.

The plan originally said "every route". This split is the amended rule (`PLAN.md` §12); do not introduce a third pattern.

## Images

Never render an uploaded image with a bare `<img>`. Use `ResponsiveImage` from `src/components/ui/responsive-image.tsx` and give it a `sizes` — the API generates 400/800/1200-wide copies of every image it can resize and records them on the URL, and `sizes` is what lets the browser pick one before layout. Without it, every candidate is judged against the full viewport and the largest usually wins, which is the opposite of the point.

A URL with no marker — typed in by hand, pointing at another host, uploaded before any of this existed — renders with no `srcset` at all. That is the whole reason the marker exists rather than deriving variant URLs by convention: a candidate that 404s breaks the image, and the browser does not fall back to `src`.

`absolutePublicUrl` in `src/lib/seo.ts` strips the marker, so `og:image` and JSON-LD carry the plain URL. Crawlers fetch exactly what they are given and cache it against the page.

Bundled assets (the logo, the hero illustration) are plain `<img>` — they have no variants and never will.

## Progress

`ProgressTrack` from `src/components/ui/progress-track.tsx` is the chunked tracker DESIGN.md asks for: `accent` for what is done, `bar-track` for what is not, square chunks, no thin line. Pass `completed` and `total`; a caller holding only a percentage passes 100 as the total. The rounding rules live in `resolveProgressChunks` in `@genex/shared`, so web and mobile fill the same number of blocks.

The course player draws its own instead, and should keep doing so: there each chunk is a specific lecture and the one being watched gets a third colour, which is more than this primitive models.

## Server state

TanStack Query owns every server read. `src/routes/__root.tsx` creates the client
per render (never at module scope -- on the server that would share one user's
cache with the next request), `src/lib/query/query-client.ts` holds the defaults,
and `src/lib/query/keys.ts` is the single key factory. Use a key from that file
rather than typing an array inline, so a mutation's `invalidateQueries` cannot
drift out of sync with the query it is meant to invalidate.

Retry is off for 4xx and off for all mutations: the ky `afterResponse` hook has
already raised a toast, and a retry raises a second one.

`src/stores/ui-store.ts` (Zustand) is for genuinely global _UI_ state only --
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

`mobile-handoff.spec.ts` covers the two routes that redirect out of this app and
into the Expo one. It belongs in E2E rather than in a unit test because what is
being asserted is a `Location` header on a real response: that each route
redirects into `genex://` and refuses every target outside the allow-list, that an
anonymous auth handoff carries an error and never a token, and that one-time
tokens are not mintable over HTTP. **Redirects are never followed** — `genex://`
is not fetchable, and following would turn a passing assertion into a
connection error.

The dashboard chunk compiles on first navigation, so the guard-redirect
assertions allow 45s. Do not tighten that back to 15s: it made the suite fail
cold and pass warm.

## Talking to the API

Never call `fetch` directly for API data. Two clients, for two contexts:

**Browser** — `src/lib/api/client.ts` (ky). Use `apiGet`, `apiGetPaginated`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`. It sends `credentials: "include"`, resolves the base URL from `clientEnv.apiBaseUrl`, and on a failed response automatically shows a `sonner` toast with the API's `message`. **Do not add your own error toast on top of it** — you will get two.

**SSR / route loaders** — `src/lib/ssr-api.ts` (`ssrApiGet`, `ssrApiGetCourses`). It hits the API directly at `VITE_SSR_API_BASE_URL` (default `http://127.0.0.1:3001/api/v1`), bypassing the Vite proxy, and throws `SsrNotFoundError` on 404 so loaders can `throw notFound()`.

Feature modules in `src/lib/api/` unwrap the API envelope and return `response.data`, so components see plain domain types. Add new endpoints there, one module per API feature, and derive input types from the `@genex/shared` Zod schemas rather than redeclaring them:

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

`src/lib/auth.ts` re-exports `authClient` from `@genex/auth/client`; `src/lib/auth-server.ts` re-exports the server `auth` from `@genex/auth/tanstack-server`. The Better Auth HTTP handler is served by **this app** at `src/routes/api/auth/$.ts`, which lazily imports the server module so it never reaches the browser bundle. Keep that dynamic import.

Read session state with `useAuthSession()` from `src/hooks/use-auth-session.ts`. Role lives at `session.session.role`.

## The two hops for the mobile app

`src/routes/api/mobile-auth-handoff.ts` and `src/routes/api/payment-return.ts` exist for the same reason: the Expo app opens a browser for something it cannot do itself — an OAuth round trip, a payment gateway — and that browser ends up holding state the app cannot read. React Native has no cookie jar, and the gateway's callbacks are server-to-server. Each route is the last hop: it takes a deep link on the query string and 302s into it.

Both take the redirect target from a query parameter, so both go through `isAllowedAppRedirect` in `src/lib/app-link.ts`. **Do not inline that check or widen the scheme list.** Without it either route would bounce a signed-in user — one-time token and all — to any host an attacker named.

## Styling

Tailwind v4, configured entirely in `src/styles/app.css` via `@theme` — there is no `tailwind.config.js`. `DESIGN.md` is the authority on what the tokens mean; this section is only about how to reach them from code.

The palette is the Genex warm-paper set — `ink`, `ink-muted`, `muted`, `muted-light`, `muted-faint`, `paper`, `card`, `panel-warm`, `hairline`, `line-strong`, `chip-active`, `placeholder-fill`, `bar-track`, `bar-idle`, and `accent`.

Use the tokens (`bg-paper`, `text-muted`, `border-hairline`) rather than raw Tailwind colours like `bg-gray-100` or an arbitrary `text-[#c4353b]`. Validation text is `text-error` — the one surviving red.

**The accent is a variable.** `--color-accent` has four shipped alternates. Never type `#EE5622` into a component.

Recharts is the one exception to token discipline, and only because it writes colours out as SVG presentation attributes, which cannot resolve CSS custom properties. The values the charts need are mirrored as literals in `src/lib/chart-theme.ts` — add to that file rather than retyping a hex in a route.

Four rules from `DESIGN.md` that this codebase gets wrong most often:

- **Hairlines are the sectioning tool.** `1px #E8E4DE` everywhere. The old "No-Line Rule" is gone.
- **No shadows.** Not on cards, not on buttons, not on modals.
- **No animation.** Colour and border transitions on hover, nothing else. Nothing lifts, scales or fades in.
- **Cards are square.** `4px` is for buttons and inputs; `100px` for pills; `0` for cards.

Fonts: `font-body` (Hind Siliguri) for everything, `font-mono-label` (Archivo) for Latin numerals, IDs and small all-caps labels.

Components use `cva` for variants and `cn()` from `src/lib/utils.ts` to merge classes. Follow `src/components/ui/button.tsx` when adding a primitive.

Icons: the design uses none — `+`/`–` are text, the play triangle is a `clip-path`, checks are drawn. `lucide-react` stays for dashboard-only surfaces with no design precedent (messages, admin tooling) and is kept out of the public pages.

## Forms

`useZodForm` from `src/lib/forms/use-zod-form.ts` — react-hook-form with a `zodResolver`, taking the schema from `@genex/shared`:

```ts
const form = useZodForm({ schema: createCategorySchema, defaultValues: { ... } });
```

## Other notes

- Toasts: `sonner`. Charts: `recharts`. PDFs: `@react-pdf/renderer`.
- WebSocket URLs are built by `src/lib/ws-url.ts`; the API exposes `/api/v1/messages/ws` and `/api/v1/notifications/ws`.
- Firebase (`src/lib/firebase/`) is used for web push and is optional — it degrades when `VITE_FIREBASE_VAPID_KEY` and the Firebase config are absent. Keep new code tolerant of that.
- Components take explicit prop interfaces and an explicit `JSX.Element` return type.
