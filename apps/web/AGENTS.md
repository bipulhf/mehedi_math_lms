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
src/components/ui/   Primitives — button, card, input, label, select, textarea, checkbox, switch, badge, pill, skeleton,
                     password-input, progress-track, responsive-image, avatar, tabs, accordion, data-table,
                     empty-state, stat-card, dot-row, price-text, section-heading, doodles, field (shared classes).
src/components/<feature>/  Feature components (auth, courses, tests, profile, certificates, ...).
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

## Motion

Two rules, and which one applies depends on who is looking:

- **Inside the app shell** — anything behind the login — `DESIGN.md` §1 stands:
  colour and border transitions on hover, nothing else. No entrance animation,
  nothing lifts or scales.
- **On the public marketing pages** motion is allowed and deliberate (ADR-0012).
  The vocabulary is two primitives in `src/components/marketing/` — `Reveal` and
  `CountUp` — plus one rule, `.slide-rise`, which staggers the landing
  carousel's copy each time a slide takes its turn. All three are switched off
  under `prefers-reduced-motion` in one block at the bottom of `app.css`. Adding
  a fourth effect is a decision, not a detail.

The landing page is built from `LandingSection`, which fixes the band's padding,
container width and heading rhythm. A section that sets its own is how the page
drifted into looking like a stack of unrelated pages. One band is deliberately
not a `LandingSection` and has no heading: the full-bleed course carousel the
page opens on. There is no hero and no closing band — the owner asked for the
catalogue to be the first thing on the page, for nothing to sit above it, and
for the FAQ to be the last thing before the footer.

## Loading states

No spinners, anywhere — `animate-spin` and "Loading…" are both absent from this workspace and must stay that way.

No shimmer either: a skeleton is a still `#F1EEE9` block, on every page including
the public ones. That fill comes from `Skeleton` itself — do not override it with
`bg-chip-active` or anything else, or the page loads in two different greys.

**A skeleton mirrors the layout it stands in for**, not a generic idea of one.
Same container and gutters, same grid and column count, same card chrome
(`border-hairline bg-card`, square), same breakpoint behaviour. Three failures
worth naming because all three shipped once:

- A public page's placeholder that omits `PublicLayout`, so the header and
  footer appear only when the loader resolves and the page jumps.
- A placeholder for a page whose layout it has never had — a centred
  `max-w-3xl` column standing in for a two-column workspace.
- A fixed width wider than a phone (`w-96` is 384px), which scrolls the page
  sideways before the content arrives. Use fractional widths with a `max-w-`.

A page whose data can be empty needs to tell "loading" apart from "nothing
here". Showing the empty state while a query is still pending tells a teacher
there are no papers to mark when there are.

Two skeleton patterns coexist, and which one applies is decided by the route, not by taste:

- A route **with a `loader`** declares a `pendingComponent` — the five public pages do this. `defaultPendingMs` means a fast navigation skips it.
- A route **without a loader** has nothing to be pending on. The dashboard fetches client-side with TanStack Query, so those pages render their skeleton inline from `isPending`, with a ternary rather than `&&`.

The plan originally said "every route". This split is the amended rule (`PLAN.md` §12); do not introduce a third pattern.

## Maths

Question text, options and marking guides may contain LaTeX between dollars — `$x^2$` inline, `$$…$$` on its own line. ADR-0014 explains why it is stored that way; what matters when editing this app is the order:

`sanitizeHtml` first, **then** the maths pass. `RichTextContent` does that, and `MathText` does the same for plain fields like an MCQ option. The KaTeX markup that reaches the page is minted by `src/lib/katex.ts` from a LaTeX string, so no author bytes are re-injected as HTML and the allowlist in `src/lib/html.ts` never has to grow a `span` or a `class`. Rendering anything of the author's with `dangerouslySetInnerHTML` *after* the maths pass would undo that.

Two things that look like polish and are not. A one-line context — the marking workspace's question strip — must pass `mathDisplay="inline"`, or a stored `$$…$$` renders as a centred block and breaks the row. And a label or a truncated row uses `richTextToPlainText` from `@genex/shared`, not `stripHtml`, which would print the raw `$\frac{a}{b}$`.

Bijoy text is converted on paste, in the editor and in `OptionTextInput`, never on save. Every conversion is undoable and the automatic pass can be switched off from the toolbar.

## Images

Never render an uploaded image with a bare `<img>`. Use `ResponsiveImage` from `src/components/ui/responsive-image.tsx` and give it a `sizes` — the API generates 400/800/1200-wide copies of every image it can resize and records them on the URL, and `sizes` is what lets the browser pick one before layout. Without it, every candidate is judged against the full viewport and the largest usually wins, which is the opposite of the point.

A URL with no marker — typed in by hand, pointing at another host, uploaded before any of this existed — renders with no `srcset` at all. That is the whole reason the marker exists rather than deriving variant URLs by convention: a candidate that 404s breaks the image, and the browser does not fall back to `src`.

`absolutePublicUrl` in `src/lib/seo.ts` strips the marker, so `og:image` and JSON-LD carry the plain URL. Crawlers fetch exactly what they are given and cache it against the page.

Bundled assets (the logo, the hero illustration) are plain `<img>` — they have no variants and never will.

Script Pages are the one uploaded exception. They are stored sized-down with no original and no variants (ADR-0009), and `MarkingLayer` positions its overlay against the rendered box, so that one component draws the page with a plain `<img>`. Everywhere else a page is shown — the student's uploader, a thumbnail — still goes through `ResponsiveImage`.

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

## File watchers

Packages are consumed as TypeScript source, so the dev server follows the
`node_modules/@genex/*` symlinks out into `packages/` and watches the real
files — that is what makes a package edit hot-reload. `server.watch.ignored` in
`vite.config.ts` keeps it from descending into build output, caches and the
mobile app on the way.

That matters on Linux, where every watched file costs an inotify watch and the
per-user ceilings are low by default. If `bun run dev` dies with
`ENOSPC: System limit for number of file watchers reached`, the dev server is
rarely the culprit — check what else is holding watches first:

```bash
cat /proc/sys/fs/inotify/max_user_watches      # total watches allowed
cat /proc/sys/fs/inotify/max_user_instances    # watcher *instances* allowed
```

`watchman` (started by Expo) and an editor's indexer routinely hold tens of
thousands between them. Running only the workspaces you need helps:

```bash
bun run dev --filter=@genex/web --filter=@genex/api
```

Raising the ceilings is the durable fix and needs root — see the README.

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

## Phones

The narrow target is 360px. Two rules carry most of it:

- **Padding steps up, it does not start large.** `Card`'s header, content and
  footer are `p-4 sm:p-6`; a page-level card should do the same. 32px a side
  inside a 16px page gutter leaves a phone 272px of usable card.
- **A table stops being a table below `md`** and becomes one card per row —
  `DataTable` does this, and the hand-rolled tables in payments, admin courses,
  SMS, logs and bug reports now do too. `overflow-x-auto` on its own is not the
  answer: it hides the column carrying the decision off the right edge.

Components use `cva` for variants and `cn()` from `src/lib/utils.ts` to merge classes. Follow `src/components/ui/button.tsx` when adding a primitive.

Input, textarea, select and password-input all draw their surface from `fieldClassName` in `src/components/ui/field.ts`. They used to be four copies of the same class string, which is how three of them ended up with a focus glow the fourth did not have. Add a field variant there, not in one of the four.

`Button` still accepts `default`, `gradient` and `secondary`, and `Badge` still accepts `blue`, `gray`, `green`, `violet`, `amber` and `red`. Those are compatibility names for screens that have not been rebuilt yet — each resolves to its Genex equivalent and all of them go in Phase 12. New markup uses `ink` / `accent` / `outline` / `ghost` / `accentLink` / `underline`, and `neutral` / `quiet` / `attention` / `faded`.

Icons: the design uses none — `+`/`–` are text, the play triangle is a `clip-path`, checks are drawn. `lucide-react` stays for dashboard surfaces with no design precedent (messages, admin tooling).

The landing page's feature grid is the one public exception, and it is deliberate: a six-tile "what you get" grid with an icon on each tile is the section every Bangladeshi platform a student already uses runs, and a grid of six unmarked text blocks does not read as one (`docs/landing-bd-edtech-patterns.md` §8). Icons stay off the other public pages.

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
