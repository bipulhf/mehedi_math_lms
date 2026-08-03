# Genex migration plan

Converting **Mehedi's Math Academy** into **Genex**, rebuilding the web UI on the
`design_handoff_genex/` design language.

This document is the plan. `design_handoff_genex/README.md` is the design
authority; where the two disagree, the handoff wins on visuals and this document
wins on scope.

---

## 1. Locked decisions

| # | Decision | Value |
| --- | --- | --- |
| 1 | Language | **Bilingual** — Bangla default, English switchable. UI chrome only; see §4 |
| 2 | Level vs subject | **Reuse the category tree.** Root category = level, child category = subject |
| 3 | Responsive | **Fully mobile responsive.** The 1440px design is the desktop breakpoint, not the only one |
| 4 | Rename scope | **Everywhere** — packages, env, database, docs, repo |
| 5 | Progress bar | **Chunked**, restyled into the Genex palette |

### Why the category tree (decision 2)

The handoff filters on two axes — লেভেল (5 values) and বিষয় (7 values). The
schema already has `categories.parentId` with an index, a nesting-aware admin
manager (`components/categories/category-tree.tsx`), and `lib/category-tree.ts`
on the web side.

- Root categories become levels: স্কুল ও কলেজ, ভর্তি পরীক্ষা, পরীক্ষা ব্যাচ, জব স্কিল.
- Child categories become subjects: ফিজিক্স, কেমিস্ট্রি, গণিত, বায়োলজি, ইংরেজি, প্রোগ্রামিং, ফ্রিল্যান্সিং.
- `courses.categoryId` points at whichever node the course actually belongs to.
  Level is derived as `parent ?? self`, so a course filed straight under a level
  is legal and needs no "General" placeholder child.

No migration, no new column, and the counts in the filter rail come from one
group-by.

**Watch out:** `courses.isExamOnly` and a "পরীক্ষা ব্যাচ" level category are two
ways to say a similar thing. They stay separate on purpose — the category is the
*display* axis (what a student browses), `isExamOnly` is the *behavioural* flag
(course has tests and no lectures). Seeding must keep them consistent.

---

## 2. Cut from the design

These appear in the handoff and have no support in the data model. They come out
of the rebuilt screens rather than being faked with hardcoded values.

| # | Feature | Appears in | Note |
| --- | --- | --- | --- |
| 1 | Live classes / লাইভ ব্যাচ | public nav, both dashboard sidebars, course-detail batch panel, hero copy | no schema, no video provider |
| 2 | Instalments | student পেমেন্ট view, due-instalment card | `payments` is one row, one amount |
| 3 | Seat limits | "মাত্র ১৮টি সিট", builder step 3 | no column |
| 4 | Batch start date | course cards, ব্যাচের তথ্য | no column |
| 5 | Discount / struck-through price / % ছাড় | every card, buy rail, builder step 3 | `courses.price` only |
| 6 | Coupons | admin sidebar | nothing behind it |
| 7 | Referral discount | course detail note, payment history row | nothing behind it |
| 8 | Institutions / seat licences | entire admin প্রতিষ্ঠান view | nothing behind it |
| 9 | 70/30 split and payouts | teacher আয় view, builder helper lines | no revenue-share model |
| 10 | Exam rank / leaderboard | student র‍্যাংক stats, results table | never computed |
| 11 | Weekly study-hours strip | student sidebar 7-square | progress is a boolean per lecture, not watch time |
| 12 | Exam centres stat | homepage stat row | nothing behind it |

### Kept, with a substitution

- **Course length "৬ মাস"** → total hours, summed from `lectures.videoDuration`.
- **"ক্লাস দেখার হার ৭৮%"** → lecture completion rate from `course_progress`.
- **Teacher আয় view** → gross course revenue from `analytics-service`, with the
  split lines removed.
- **Refund KPI** → real, derived from `payments.status = 'REFUNDED'`.
- **ফ্রি lesson pill** → real, `lectures.isPreview`.
- **কোর্স অনুমোদন queue** → real, `courses.status = 'PENDING'`. "ফেরত পাঠাও"
  gains a reason field, because `courses.reviewFeedback` exists and the design's
  one-click reject would throw the reason away.

---

## 3. Added to the design

The handoff covers 8 screens. The system is considerably larger, and the handoff
says so itself: *"Not designed yet: login/signup, checkout, video player,
question-answer composer, notifications, search results, certificate view."*

Each of these gets built in the Genex language, following the nearest design
precedent rather than inventing a new one.

### Surfaces with no Genex screen

| # | Surface | Routes | Nearest design precedent |
| --- | --- | --- | --- |
| 1 | Messaging | `dashboard/messages`, `admin/message-reports` | two-column list + thread, hairline rows |
| 2 | Notifications | bell, WS, FCM push, `dashboard/notifications/send` | admin card list + Ink action |
| 3 | SMS campaigns | `admin/sms` | admin table + status pills |
| 4 | Bug reports | `dashboard/bugs/*`, `admin/bugs/*` | admin approval cards |
| 5 | Tests | builder, submissions, grading, results | course-builder step pattern |
| 6 | Certificates | preview dialog, PDF | student dashboard action |
| 7 | Analytics | admin, accountant, teacher, per-course | the 8-bar chart from teacher আয় |
| 8 | Category admin | `admin/categories` | admin table |
| 9 | Auth | sign-in/up, Google, profile-complete wizard | builder's 4-step strip |
| 10 | Reviews, course notices, lecture discussion | across course routes | hairline row lists |
| 11 | User admin | `admin/users`, `admin/users/$id`, ban, staff | admin শিক্ষক table |
| 12 | About / Contact | public | marketing bands |
| 13 | Payments | SSLCommerz redirect, return, mock | buy card |
| 14 | Teacher index | **new** `/teachers` | Courses page grid |

### Model facts the design ignores

- **ACCOUNTANT** is a real fourth role with its own analytics page. The
  handoff's fourth role is an institution admin, which is cut. Nav, sidebar and
  role guards must account for ACCOUNTANT.
- **Multi-teacher courses** — `course_teachers` with OWNER/TEACHER. Every Genex
  screen assumes exactly one teacher per course. Cards and detail pages need a
  "+N more" treatment.
- **Chapter and lecture materials** — downloadable files, no design equivalent.
- **Course builder shape** — the system splits creation across `courses/new`,
  `courses/$id/edit` and `courses/$id/content`, over `chapters → lectures +
  tests`. Genex is one 4-step screen over `modules → lessons` with no tests.
  Reconciled as a **5-step** builder: তথ্য · ক্লাস · পরীক্ষা · দাম · প্রকাশ,
  with the existing three routes folded into it.

### API response gaps to verify per screen

The Genex cards want values the current list endpoints may not return: lecture
count, total duration, free-lesson count, teacher name(s), review average and
count. Confirm each against `course-service` before building the card, and add
to the response rather than firing a second request per card.

---

## 4. Bilingual

**Scope: UI chrome only.** Course titles, descriptions, category names, notices
and messages are user-authored and stay in whatever language they were written
in. Translating DB content means a translation table on every content entity and
an editor UI for each — out of scope here, and worth its own decision later.

- Catalogue lives in **`packages/i18n`** (new workspace) so `apps/web` and
  `apps/mobile` share one source. Typed keys, no runtime string lookup that can
  silently miss.
- `bn` is the default locale; `en` is the fallback and the switcher target.
- Locale is persisted per user (localStorage on web, SecureStore on mobile) and
  reflected in `<html lang>`.
- **Numerals**: `bn()` digit mapping from the handoff logic classes, plus
  currency (`৳` prefix) and date formatting, all locale-driven. These live next
  to `resolveProgressChunks` in shared code so both apps format identically.
- **Layout consequence**: some Bangla strings run ~20% longer than English and
  headings are sized for Bangla. No fixed-width text containers; test both
  locales at every breakpoint.
- SEO: `head:` output, `og-image-service` and JSON-LD are all locale-sensitive.
  Sitemap gains locale alternates.

---

## 5. Design tokens and the two documents that are now wrong

The Genex language is the inverse of the current one on almost every axis:

| | current (`DESIGN.md`) | Genex |
| --- | --- | --- |
| borders | 1px sectioning **prohibited** | 1px `#E8E4DE` hairlines everywhere |
| cards | radius `0.25rem`, tonal layering | **square 0px**, white on textured paper |
| depth | shadows plus surface tiers | **no shadows at all** |
| primary CTA | gradient primary → teal | flat Ink `#23211E` |
| palette | blue/indigo `#4648d4` on `#faf8ff` | warm paper `#FCFBF9` + accent `#EE5622` |
| type | Inter + Manrope | Hind Siliguri + Archivo |
| motion | `fade-in-up`, hover lift | **no animation**, colour/border transitions only |

Consequences:

- **`DESIGN.md` is replaced**, not amended. Every rule in it is contradicted.
- **`apps/web/AGENTS.md` §Styling is rewritten**, along with §Loading states
  (skeletons must lose their shimmer animation) and §Progress.
- The accent is a **theme variable**, not a hardcode. The handoff ships four
  alternates (`#EE5622`, `#23211E`, `#1F6F5C`, `#3B5BA5`).
- **Accent discipline**: 6–10 accent marks per page, never a large fill on
  marketing pages, exactly one accent button per app shell. The current
  `badge.tsx` tone set (amber/rose/emerald/violet/sky) violates this and needs
  replacing with a muted status set.

### Page background

One shared `PageBackground`: `#FCFBF9` base, 27px dot grid, three corner washes
(orange, sage, blue). Panels on top are translucent white so the texture shows;
cards inside them are solid `#FFFFFF` with a hairline border.

---

## 6. Shared components

Retoken first so every consumer inherits, then rewrite primitives in place, then
build screens. No screen work starts before §Phase 4 lands.

### Rewritten in place

| Component | Change |
| --- | --- |
| `styles/app.css` | whole `@theme` block replaced; Hind Siliguri + Archivo via `@fontsource`; radius 4px / 100px / 0; shadow utilities removed |
| `button.tsx` | variants become `ink` / `outline` / `ghost` / `accentLink`; drop `gradient`, shadows, `-translate-y` |
| `card.tsx` | square, white, 1px hairline, no shadow |
| `badge.tsx` | becomes `Pill` — transparent + hairline, selected `#EFEBE4` + Ink text |
| `input.tsx`, `label.tsx`, `password-input.tsx` | 4px radius, hairline border, `#B4AEA6` placeholder |
| `progress-track.tsx` | chunked logic kept; restyled — accent fill on `#F1EEE9` track, square chunks |
| `responsive-image.tsx` | kept as-is; placeholder fill becomes `#F1EEE9` |
| `common/skeletons.tsx` | shimmer animation removed — the design forbids motion |

### New primitives

`Pill` · `FilterPill` · `StatCard` · `Tabs` · `Accordion` · `DataTable` ·
`EmptyState` · `Checkbox` · `Avatar` · `DotRow` (the level selector) ·
`PriceText` · `SectionHeading`.

`select.tsx`, `textarea.tsx` and `skeleton.tsx` already exist and are rewritten
rather than added.

### Doodle set

All CSS, no illustration, from handoff §Doodles: `Ring` (hand-drawn circle
around one word) · `DotPatch` · `Arc` · `DiamondTrio` · `HatchedRule` ·
`StepCircle` · `PlayGlyph`. Sections owning a doodle are
`position: relative; overflow: hidden`.

### Icons

The design uses **zero icon font** — `+`/`–` are text, the play triangle is a
`clip-path`, checks are drawn. `lucide-react` stays for dashboard-only surfaces
that have no design precedent (messages, admin tooling), and is kept out of the
public pages.

### Layouts

- `public-layout` — 82px sticky header (logo lockup, 5 nav items, helpline, লগ ইন, Ink CTA) + 4-column footer on `#F7F5F1` with a hatched rule.
- `app-shell` / `dashboard-layout` — 74px bar + 238px sidebar with a context block (today's classes / today's status) + exactly one accent button.
- `auth-layout` — no design precedent; derive from the marketing bands.

### Responsive rules (decision 3)

Mobile-first, with the 1440px design as the `xl` target. From the handoff's own
fallback guidance:

- Two-column marketing bands collapse to one.
- Filter rail and dashboard sidebars become drawers.
- Tables become stacked cards.
- Touch targets ≥44px.
- Right rails (buy card, builder preview) move below the main column.

---

## 7. Rename

`@mma/*` → `@genex/*`, across 8 workspace packages and roughly 160 files.

| Area | Change |
| --- | --- |
| packages | `@mma/api`, `@mma/auth`, `@mma/config`, `@mma/db`, `@mma/mobile`, `@mma/scripts`, `@mma/shared`, `@mma/web` |
| root package | `mehedis-math-academy` → `genex` |
| repo directory | `mehedi_math_academy` → `genex` |
| `siteConfig` | name, shortName, domain, url, description |
| env | `APP_NAME`, `APP_URL`, `DATABASE_NAME`, `BETTER_AUTH_URL`, plus `.env.example` and every Zod env schema |
| database | new database name; existing dev data is reseeded, not migrated |
| auth | Google OAuth redirect URIs and origins re-registered against the new domain |
| mobile | deep-link scheme `mma://` → `genex://`, plus `app.json` name/slug/bundle id |
| brand assets | `design_handoff_genex/brand/*` into `apps/web/public/`; the old logo removed |
| docs | `AGENTS.md` ×8, `CLAUDE.md` ×2, `README.md`, `PLAN.md`, `DESIGN.md` |
| tests | E2E specs referencing the old name or scheme |

Done as **one mechanical commit with no behaviour change**, so the diff stays
reviewable and a later `git log -S` still finds things.

> ⚠️ The brand assets were traced from a white-background JPG. Ask the client
> for the original vector before shipping.

---

## 8. Phases

Each phase is independently shippable and ends green on `bun run typecheck`,
`bun run lint`, `bun run test`.

| Phase | Work | Status |
| --- | --- | --- |
| 0 | Rewrite `DESIGN.md` for Genex; fix `apps/web/AGENTS.md` §Styling / §Loading / §Progress / §Layout | ☑ |
| 1 | Rename, everywhere (§7). Mechanical, no behaviour change | ☑ |
| 2 | `packages/i18n`: catalogue, locale provider, switcher, `bn()` numerals, currency and date formatters | ☑ |
| 3 | Design tokens: `app.css`, fonts, `PageBackground`, brand assets | ☐ |
| 4 | Shared primitives — rewrites, new primitives, doodle set (§6) | ☐ |
| 5 | Layouts: public, app shell, auth. Responsive scaffolding | ☐ |
| 6 | Public screens: Homepage, Courses, Course Detail, Teacher Profile, plus the new `/teachers` index | ☐ |
| 7 | Teacher dashboard + the 5-step course builder | ☐ |
| 8 | Student dashboard | ☐ |
| 9 | Admin dashboard + accountant analytics | ☐ |
| 10 | System-only surfaces restyled (§3): messages, notifications, SMS, bugs, tests, certificates, analytics, category admin, user admin, auth | ☐ |
| 11 | Mobile: token and i18n sync, deep-link scheme | ☐ |
| 12 | Cleanup: seed data, E2E updates, SEO / `og-image` restyle, `PLAN.md` reconciliation | ☐ |

Phases 0–5 are foundation and must land in order. 6–10 can be reordered or
parallelised once 5 is in.

### Phase log

**Phase 0** — `DESIGN.md` rewritten from scratch as the Genex system: warm-paper
palette, hairline sectioning, no shadows, no animation, square cards, accent
discipline, the doodle set, and a responsive section the handoff does not have.
`apps/web/AGENTS.md` §Styling rewritten against the new tokens, §Loading gained
the no-shimmer rule, and §Progress retargeted at accent-on-track. Root
`AGENTS.md` now points at this document first. Typecheck 8/8.

*Correction, made during Phase 2:* Phase 0 also "fixed" §Layout by removing
`select`, `textarea` and `skeleton` from the `components/ui/` list, on the
strength of a directory listing that had been truncated. All three exist. The
line is restored, and the claim is struck from §5 and §6 above.

**Phase 2** — `packages/i18n`, a ninth workspace with zero runtime
dependencies (it is imported by React Native, where a Node-only dependency is a
build failure).

`src/messages/bn.ts` is the source of truth and `MessageKey` derives from it, so
`en.ts` is typed as a complete record — a key added to one and forgotten in the
other fails the build instead of falling back silently. English is the
*fallback* locale, Bangla the default.

`Intl` turned out to already know everything the design needs: `bn-BD` gives
Bangla numerals and lakh/crore grouping (১,৮৪,০০০, not ১৮৪,০০০) with no digit
table of our own. Three things it does not do are composed by hand — the taka
sign tight against the number, paisa hidden when zero, and `toLocaleDigits` for
values that must be mapped without being regrouped (a phone number must not
become ১,৩৪,৬০,৫৬,৪৬৮). `en` maps to `en-GB` rather than `en-US` so dates read
"12 August" and mirror the Bangla "১২ আগস্ট" instead of inverting it.

On the web the locale is read from a cookie in the root route's `beforeLoad`,
not in an effect — an effect renders the page in one language and flips it after
hydration. `createIsomorphicFn` keeps `@tanstack/react-start/server` out of the
browser bundle; verified against a production build, where the client chunk
carries only the `document.cookie` branch.

The switcher shows both languages rather than toggling to the one you are not
in, which is a puzzle for a reader who cannot read the label. It is mounted in
the landing header and the dashboard shell, styled with the current tokens —
Phase 3 retokens it along with everything else.

Typecheck 9/9, lint 9/9, tests 8/8 (331 passing), web build clean.

**Phase 1** — rename across 182 files. `@mma/*` → `@genex/*` on all eight
workspaces, root package `mehedis-math-academy` → `genex`, `siteConfig` rebuilt
with the real helpline and address, `mehedismathacademy.com` → `genex.com.bd`.

Beyond the obvious string swap, five things carried real behaviour and would
have broken silently:

- `isAllowedAppRedirect`'s scheme allow-list — `mma:` → `genex:`. Left alone it
  would have refused every deep link from the renamed Expo app.
- Expo `scheme`, `slug`, `name` and both application ids (`com.genex.app`).
- Redis pub/sub channels (`genex:messages:events`, `genex:messages:presence`,
  `genex:notifications:events`) — publisher and subscriber have to agree.
- Mobile storage keys (`genex.session-cookie`, `genex.query-cache`). This
  invalidates any session stored on a device, which is fine on dev.
- The payment transaction-id prefix, `MMA-` → `GENEX-`.

The bundled `mma-logo.svg` (an "M" mark in the old indigo palette) is gone,
replaced by `genex-mark.png` from the handoff; the four brand files are also in
`apps/web/public/brand/`. Database recreated as `genex`, migrated and seeded —
the old `academy` database was left in place rather than dropped.

Typecheck 8/8, lint 8/8, tests 6/6 (309 passing).

---

## 9. Answered questions

1. **Contact details** — helpline `01346-056468`, address `চকবাজার, চট্টগ্রাম`. Both live in `siteConfig`, not in a component. Email is still a placeholder — see §10.
2. **Production data** — none. The database is renamed, dropped and reseeded.
3. **Public nav** — four items:

   | Item | Target |
   | --- | --- |
   | কোর্স | `/courses` |
   | ক্যাটাগরি | `/categories` (exists) |
   | শিক্ষক | `/teachers` (new, Phase 6) |
   | ফ্রি ক্লাস | `/courses?free=1` (new filter, Phase 6) |

   `ফ্রি ক্লাস` filters to courses owning at least one `lectures.isPreview` row.
4. **Seed data** — mixed. Some courses seeded in Bangla, some in English, so the
   bilingual chrome is exercised against genuinely single-language content.

---

## 10. Still open

1. **Support email** — no value given. Using `support@genex.com.bd` as a
   placeholder in `siteConfig`. Also determines the production domain, which
   feeds `BETTER_AUTH_URL` and the Google OAuth redirect URIs.
2. **Brand vector** — the logo assets were traced from a white-background JPG.
   Ask the client for the original SVG/AI before shipping.
3. **Repository directory** — still `mehedi_math_academy` on disk. Renaming it
   mid-session would invalidate every open path, so it is left for you:

   ```bash
   mv /media/bipulhf/Drive2/mehedi_math_academy /media/bipulhf/Drive2/genex
   ```

   Nothing in the code depends on the directory name.
4. **`BETTER_AUTH_URL`** — `.env` has it on `:3001`, the API port. Better Auth is
   served by the **web** app, so it should be `http://localhost:3000`. Predates
   this migration; flagged rather than changed.
