# Drift report

> **Resolved 3 August 2026.** Every finding below has been closed. This file is kept as the record of
> what was found and why it mattered — the fixes are in git and the rules are in `PLAN.md` and the
> workspace `AGENTS.md` files, but the reasoning is here.
>
> | Section | Where it went |
> | ------- | ------------- |
> | A1, A2 | `feat(web): render the homepage from real data`, `fix(seo): serve og:image as a 1200x630 PNG` |
> | A3–A5, A8 | `feat(mobile): load the real fonts, drop the spinner, add Google sign-in` |
> | A6 | `fix(seo): give /login and /signup one canonical each` |
> | A7, C2, C3 | `chore(api): drop the dead email queue and fill the websocket directory` |
> | B2, B3, B4 | `fix(web): put validation red, chart colours and dividers back on the theme` |
> | B5 | `refactor(api): settle the layer file naming on one convention` |
> | B7 | `refactor: split the three largest server and messaging files`, `refactor(web): split the two builders over the line ceiling` |
> | D | `test: cover the shared validators and the enrolment and payment flows` |
> | B1, B6, B8, C1, F | `docs: reconcile PLAN.md with the code and settle the open rules` |
>
> Two things found on the way that DRIFT did not predict, both in the same family — a Zod helper that
> looks like it does the obvious thing and does not:
>
> - `.partial()` does not strip a `.default()`, so `updateCourseSchema` carried `isExamOnly: false` into
>   every patch and any course update silently cleared the exam-only flag.
> - `z.coerce.boolean()` is `Boolean(input)`, so `?flat=false` parsed as `true` — as did every other
>   non-empty value. `flat`, `includeInactive` and `mine` now use a shared `booleanQueryParamSchema`.

What the **initial** build plan asked for, and where the working tree does not match it.

**Method.** The initial plan is `PLAN.md` as first committed, `40cd8c4` (25 March 2026) — 21 phases plus a
17-section coding-standards appendix. It was compared against the working tree at `9cdf510`. Every finding
below was read out of the code, not inferred from a document. Line numbers are from `9cdf510`.

`PLAN.md` today has been rewritten to describe what exists, so it agrees with the code by construction.
This file exists because that rewrite also erased the record of what was asked for and never built.

Divergences that were made on purpose and are already written down — the six ADRs, the hand-rolled
SSLCommerz client, `pdf-lib` on the server, Expo SDK 57 instead of 54, the three mobile boundaries — are
**not** repeated here. See [BLOCKERS.md](./BLOCKERS.md) and [docs/adr/](./docs/adr/). Section E lists them
by name so they are not re-litigated.

---

## A. Functional gaps — a user or a crawler hits these

### A1. The homepage is entirely fabricated

The single most SEO-critical page in the product renders hardcoded fiction.

| File | What is fake |
| ---- | ------------ |
| `features/landing/components/courses-section.tsx` | Three invented courses — "Advanced Physics: Quantum Foundations", ৳4,500, taught by "Dr. Ryan Carter, Cambridge PhD". Header reads "Showcasing 1,240 courses". |
| `features/landing/components/stats-section.tsx` | "15k+ Active Learners", "1.2k Expert Ateliers", "4.9/5 Avg. Rating" |
| `features/landing/components/instructors-section.tsx` | Invented instructors with invented credentials |
| `features/landing/components/categories-section.tsx` | Category names hardcoded, not read from the `categories` table |

Phase 20's page table says the homepage's dynamic data is "Static + featured courses". Nothing on it is
fetched: `routes/index.tsx` has no `loader` and no `useQuery`, and none of the six sections takes a prop.

Two consequences beyond the obvious:

- **11 images are hotlinked from `lh3.googleusercontent.com/aida-public/…`** — a Google AI-Studio scratch
  CDN (`hero-section.tsx` ×1, `courses-section.tsx` ×6, `instructors-section.tsx` ×4). Those URLs are not
  ours, carry no guarantee, and can 404 without notice. Phase 20 asked for images served from S3 with
  `width`/`height` set.
- The page emits a real `Organization` JSON-LD block (`lib/seo.ts`) over fabricated ratings and enrolment
  counts. That is a structured-data claim about a business, and it is false.

**Fix:** give `routes/index.tsx` a loader that reads featured courses, live category counts and real
aggregates through `lib/ssr-api.ts` — the same path `courses/index.tsx:39` already uses — and pass them
down as props. Self-host or S3-host the imagery.

### A2. `og:image` serves SVG, so no share preview renders anywhere

`routes/v1/og-image.route.ts:11` sets `Content-Type: image/svg+xml`, and `lib/seo.ts:77,90,95,158` points
both `og:image` and `twitter:image` at it.

Facebook, X, LinkedIn, WhatsApp, Slack and iMessage all reject SVG for `og:image`. Every share of every
page — homepage, course, teacher — falls back to a bare text card. Phase 20 asked for a 1200×630 raster
stored in S3, with a dynamic overlay endpoint on top of it.

This is precisely the failure that SUMMARY.md item 6 ("OG tags have never been through the platform
validators") was holding open. It does not need a validator to confirm; the content type settles it.

**Fix:** rasterise. Either render the existing SVG to PNG server-side, or drop back to a static 1200×630
PNG in S3 as the default and use the course cover directly for course pages.

### A3. Mobile typography silently falls back to the system font

`src/theme/tokens.ts:55-60` sets `fontFamily: "Manrope"` and `"Inter"` on all six type styles.
`expo-font` is listed as a plugin in `app.json:29` — but no font file is bundled and nothing calls
`useFonts`. React Native does not warn on an unresolvable family name; it substitutes silently.

So the mobile app is running on Roboto/San Francisco while claiming to implement the Digital Atelier
type scale. Phase 21: "Manrope + Inter fonts via expo-font".

### A4. Reanimated is installed and never imported

`react-native-reanimated@4.5.1` and `react-native-worklets@0.10.1` are dependencies. Zero imports across
`apps/mobile/app` and `apps/mobile/src`. Phase 21 asked for "Reanimated 4 for 60fps native-thread
animations". Either use it or drop it — right now it is native code in every build for nothing.

### A5. The mobile app uses a spinner

`src/components/ui.tsx:185` renders `<ActivityIndicator size="large" />`.

Standards §12 forbids spinners in one of the plan's few absolute statements — "This applies to every
screen, every component, every data-fetching boundary — **web and mobile**". The web app is clean; every
`animate-spin` and "Loading…" string was removed. Mobile was never held to the same rule.

### A6. `/login` and `/signup` are indexable duplicates

`routes/login.tsx:16` declares `path: "/login"` and renders `SignInPage` from `routes/auth/sign-in.tsx`,
which declares `path: "/auth/sign-in"` (line 19). Each sets its own canonical, so two URLs serve identical
content and each claims to be the original. `services/sitemap-service.ts:62` then advertises `/login` to
crawlers.

Phase 20: "Every public page sets `<link rel="canonical">` with the full URL." The intent was one
canonical per piece of content.

**Fix:** point `/login` and `/signup`'s canonical at `/auth/sign-in` and `/auth/sign-up`, or make them
`301`s.

### A7. The `email` queue is dead but still connected

`lib/queues.ts:11` instantiates a BullMQ `Queue("email")` against Redis. Nothing enqueues to it — the
staff-invite producer was deliberately removed — and no worker consumes it. It holds a Redis connection
and appears in any queue dashboard as a real queue that never drains.

The removal was the right call. Leaving the queue behind was not.

### A8. Mobile has no Google OAuth

Phase 21 lists "Login / signup / Google OAuth" as a ported screen. `grep -ri google apps/mobile/src
apps/mobile/app` returns nothing. Email/password only. A user who signed up on the web with Google cannot
sign in on the phone at all — this is a lockout, not a missing convenience.

---

## B. Standards drift — rules in the plan's appendix that the code does not follow

### B1. `pendingComponent` is on 5 route files out of 50

Standards §12: "**Page-level skeletons** are defined per route via TanStack Router's `pendingComponent`.
Each route file exports its own skeleton matching that page's layout."

Reality: the five public loader routes have one. All 45 dashboard routes fetch client-side with
TanStack Query and render skeletons inline from `isPending` instead.

Inline skeletons are a legitimate pattern and the result is not broken — but it is a different pattern
than the one specified, and it was adopted by default rather than chosen. Note that today's `PLAN.md`
records this as "✅ done — `pendingComponent` is on every route with a loader". That qualifier was added
during the rewrite. It narrows the rule to fit the code; it does not report meeting it.

**Decide:** either amend §12 to say route-loader pages get `pendingComponent` and query pages get inline
skeletons, or add loaders where the page-level skeleton is worth having (`dashboard/learn/$courseId.tsx`
and `dashboard/messages.tsx` are the two where the whole page shell shifts).

### B2. Two routes have no error boundary

§6: "Error boundaries at every route level." 48 of 50 route files pass. Missing:

- `routes/dashboard/notifications/send.tsx`
- `routes/dashboard/admin/sms.tsx`

Both are admin bulk-send screens — the two places where an unhandled render error is most likely to be
mistaken for "the send failed".

### B3. Hardcoded hex, including a second error red

§13: "No hardcoded hex values in components." 12 files contain one. Most are unavoidable
(`@react-pdf/renderer` needs literal colours; Recharts strokes take no CSS variable). One cluster is not:

`--color-error: #ba1a1a` is defined in the theme and unused. Four form primitives hardcode a *different*
red for validation text:

- `components/ui/input.tsx:23` — `text-[color:#c4353b]`
- `components/ui/textarea.tsx:24` — `text-[#c4353b]`
- `components/ui/password-input.tsx:35` — `text-[#c4353b]`
- `components/ui/select.tsx:23` — `text-[#c4353b]`

Every validation message in the product is off-palette, and consistently so, which is why nobody noticed.

Also loose: `chartStroke = "#6061ee"` duplicated in `routes/dashboard/courses/$id/analytics.tsx:30` and
`routes/dashboard/accountant/analytics.tsx:28` (the theme has `--color-secondary-container: #6063ee` —
close but not equal), and `#e5e5e5` grid strokes in four places.

### B4. Sectioning borders, against the No-Line Rule

DESIGN.md line 15: "1px solid borders are **strictly prohibited** for sectioning." Line 46 allows a ghost
border at 15% opacity — "felt, not seen".

About 50 `border-b` / `border-t` dividers exist. Most are ghosted at `/10` or `/20` and are within the
spirit of the rule. These are not:

- `components/common/data-table-skeleton.tsx:29` — `border-b border-outline-variant` (full opacity)
- `components/notifications/notification-bell.tsx:192` — full opacity
- `components/certificates/certificate-preview-dialog.tsx:56` — full opacity
- `routes/courses/$slug.tsx:180` — `border-outline-variant/50`, on the public course hero

### B5. Backend layer naming contradicts itself

§4 specified `course.route.ts`, `course.controller.ts`, `course.service.ts`, `course.repository.ts`.

Routes kept the dot — `courses.route.ts`. Controllers, services and repositories dropped it —
`course-controller.ts`, `course-service.ts`, `course-repository.ts`. So the repo follows neither the plan
nor itself, and you have to know which layer you are in to guess a filename.

Low stakes, but it is a 100-file inconsistency and it only gets more expensive to settle.

### B6. `export default` in 14 mobile files

§3: "**Named exports only.** No `export default`."

Expo Router requires a default export per route file. This is forced, not sloppy — but the rule as
written admits no exception and nothing anywhere records one. Add the carve-out to `apps/mobile/AGENTS.md`
so the next reader does not "fix" it.

### B7. Five files over the 800-line ceiling

Not from the initial plan — from `~/.agents/AGENTS.md`, "Hard ceiling: 800 lines per source file." Same
question, so it belongs here:

| Lines | File |
| ----- | ---- |
| 1086 | `apps/web/src/components/courses/course-content-builder.tsx` |
| 1066 | `apps/api/src/services/test-service.ts` |
| 967 | `apps/web/src/components/tests/assessment-builder.tsx` |
| 960 | `apps/web/src/routes/dashboard/messages.tsx` |
| 932 | `apps/api/src/repositories/message-repository.ts` |

`routes/dashboard/messages.tsx` is the clearest: it holds the conversation list, the thread, the WebSocket
client, typing state, presence, search and the report dialog trigger in one file. The seams are already
visible — the WebSocket client and the thread pane are each independently extractable.

### B8. No environment tiers

§15 asked for `.env.development`, `.env.production`, `.env.test`, with `.env.example` documenting every
variable. Only `.env` and `.env.example` exist. `.env.example` is complete and accurate; the tiering is
absent.

---

## C. Structural drift — the tree does not match the plan's diagram

None of these is a bug. All four mean a newcomer reading the plan looks in the wrong place.

1. **`apps/web/src/features/` holds only `landing/`.** §5 laid out `features/courses/`,
   `features/messaging/`, `features/profiles/`, each with its own `components/`, `hooks/`, `utils/`.
   In practice feature components went to `apps/web/src/components/<feature>/` and the logic stayed in the
   route file. `routes/dashboard/messages.tsx` *is* the messaging feature, all 960 lines of it. This is
   the root cause of B7.
2. **`apps/web/src/providers/` is an empty directory.** Providers are composed in `routes/__root.tsx`.
3. **`apps/api/src/websocket/` is an empty directory.** The WebSocket code is real and works, but lives in
   `routes/messages-ws-app.ts` and `routes/notifications-ws-app.ts`.
4. **Route groups were never used.** §5 asked for `(public)`, `(auth)`, `(dashboard)`. Routing is flat
   with pathful layouts (`dashboard.tsx`, `auth.tsx`), which also means `/dashboard` is a real URL segment
   rather than an organisational one. That is a reasonable choice; it is just not the stated one.

Delete the two empty directories or fill them. An empty directory that a plan says should hold code reads
as unfinished work.

---

## D. Test coverage against the plan's own testing rule

The plan's cross-cutting testing entry asks for three things. One is met.

| Asked for | State |
| --------- | ----- |
| Unit tests for **services** | ✅ 8 service suites, 120 tests in `@mma/api` |
| Unit tests for **validators** | ❌ **Zero.** `packages/shared/src/validators/` has 20 modules and no test file. |
| Integration tests for API routes | ✅ 15, through the real Hono app |
| E2E for **auth** | ✅ `apps/web/e2e/auth-gating.spec.ts` |
| E2E for **enrollment** | ❌ Nothing |
| E2E for **payment** | ❌ Nothing |

Two things stand out.

**The validators are the shared contract.** They are imported by the API for request validation and by the
web app as React Hook Form resolvers. A loosened `.min()` or a dropped `.uuid()` changes what the server
accepts and what the client blocks, in one edit, with no test anywhere to catch it.

**Enrollment and payment are the two flows that move money**, they are the two the plan named explicitly,
and they are the two with no end-to-end coverage. Combined with the fact that no live gateway has ever
been exercised (SUMMARY.md item 1), the settlement path is currently proven by unit tests over a mock and
nothing else. `commerce-service.test.ts` is good, but it cannot see a broken redirect, a callback that
never arrives, or a return page that reads the wrong query parameter.

Also uncovered: `apps/mobile` has no test script and no tests; `apps/web` has no component tests.

---

## E. Divergences that are deliberate and recorded — do not re-flag

Listed so a future reader does not re-open them. Rationale in the linked documents.

| Divergence | Where it is justified |
| ---------- | --------------------- |
| Enrolment created on payment; `CANCELLED` enum dropped | ADR-0001 |
| Admins create admins | ADR-0002 |
| `DELETE /admin/users/:id` removed; no user deletion | ADR-0003 |
| Message moderation by report; blocking out of scope | ADR-0004 |
| Completion = lectures watched **and** tests passed | ADR-0005 |
| Course ownership on the teacher roster | ADR-0006 |
| Hand-rolled SSLCommerz client, not `sslcommerz-lts` | PLAN.md:241 |
| `pdf-lib` server-side, `@react-pdf/renderer` in the browser | PLAN.md:243 |
| Expo SDK 57 / RN 0.86.2, not SDK 54 / RN 0.81 | PLAN.md:399 |
| Video playback, profile completion and realtime messaging deferred to web on mobile | `apps/mobile/AGENTS.md` |
| `bunfig.toml` hoisted linker | BLOCKERS.md |
| Staff-invite email removed rather than given a transport | BLOCKERS.md |

---

## F. `PLAN.md` is stale in three places

The 3 August rewrite missed some audit-era text, so the document now contradicts itself:

- **line 340** — `workers/ # ONLY notification-worker.ts, sms-worker.ts`. There are three;
  `file-processing-worker.ts` was added in `be59710`, which the same document credits on line 33.
- **line 344 and the Phase 21 preamble (1545-1556)** — describes `apps/mobile/` as an "UNMODIFIED
  create-expo-app template" with "No `src/`, no features, no API client, no auth", and says
  `bunx expo-doctor` "currently reports 2 failures". All of that was true during the audit and none of it
  is true now: the app was built in `e0e8b34` and expo-doctor is 20/20.
- **line 336** — "32 services". There are 33.

Anyone reading Phase 21 top-to-bottom today is told to start work that is already finished.

---

## Suggested order

Ranked by consequence, not by effort.

1. **A2** — `og:image` (every share is broken; one content type)
2. **A1** — homepage fiction (public front door; false structured-data claims)
3. **D** — E2E for enrollment and payment, then validator unit tests
4. **A6** — canonical duplicates (cheap; compounds while indexed)
5. **A3, A5, A8** — mobile: fonts, spinner, Google sign-in (A8 is a lockout)
6. **B2, B3** — error boundaries and the error-colour token (both small and mechanical)
7. **F** — reconcile `PLAN.md` with itself
8. **B7 / C1** — split the five oversized files along the feature seams
9. **A4, A7, C2, C3** — remove what is installed or scaffolded and unused
10. **B1, B4, B5, B6, B8** — decide the rule, then either follow it or amend it
