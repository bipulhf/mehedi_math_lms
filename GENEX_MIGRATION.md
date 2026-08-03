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

`#FCFBF9` base, 27px dot grid, three corner washes (orange, sage, blue). Panels
on top are translucent white so the texture shows; cards inside them are solid
`#FFFFFF` with a hairline border.

Applied to `body` in `app.css` rather than to a `PageBackground` component, as
originally planned — the design puts it on the outermost container of all eight
screens, so there is no page that wants it and no page that does not.

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
| 3 | Design tokens: `app.css`, fonts, page background, brand assets | ☑ |
| 4 | Shared primitives — rewrites, new primitives, doodle set (§6) | ☑ |
| 5 | Layouts: public, app shell, auth. Responsive scaffolding. `/teachers` index and demo seed data, pulled forward | ☑ |
| 6 | Public screens: Homepage, Courses, Course Detail, Teacher Profile | ☑ |
| 7 | Teacher dashboard + the stepped course builder | ☑ |
| 8 | Student dashboard | ☐ |
| 9 | Admin dashboard + accountant analytics | ☐ |
| 10 | System-only surfaces restyled (§3): messages, notifications, SMS, bugs, tests, certificates, analytics, category admin, user admin, auth | ☐ |
| 11 | Mobile: token and i18n sync, deep-link scheme | ☐ |
| 12 | Cleanup: compatibility aliases, `FadeIn`, E2E updates, SEO / `og-image` restyle, `PLAN.md` reconciliation | ☐ |

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

**Phase 3** — the token set replaced. Hind Siliguri (300/400/500/600, Bengali
and Latin subsets) and Archivo (400/500/600) via `@fontsource`; Inter and
Manrope removed. The page texture went on `body` rather than into a component,
for the reason in §5.

The awkward part was that roughly fifty route files still name Material tokens
(`bg-surface-container-lowest`, `text-on-surface-variant`) and will not be
rebuilt for another seven phases. Deleting those names would have left the app
unstyled for most of the migration, so every old name is aliased to its nearest
Genex value in a block marked for deletion in Phase 12. Existing screens picked
up the warm palette the moment the aliases landed, and each phase replaces its
own class names with the real tokens as it goes.

Both keyframes are gone, which made two components lie: `Skeleton` swept a
gradient across itself and `FadeIn` ran an entrance animation. `Skeleton` is now
a still `placeholder-fill` block. `FadeIn` is a plain wrapper with a comment
saying so — deleting it would have meant editing twenty route files during a
token phase, so its uses come out as each phase reaches them. The
`animate-in` / `slide-in-from-*` classes scattered through the dashboard were
already inert: they come from a Tailwind plugin this project does not install.

`chart-theme.ts` was retargeted at the accent, the idle bar and the hairline —
it is the one place allowed to hold literal hexes, because Recharts writes
colours as SVG presentation attributes and those never resolve a CSS variable.
The favicon was the old indigo "M" mark and now points at the Genex mark.

Verified against a running stack: `body` computes to `rgb(252, 251, 249)`, the
font resolves to Hind Siliguri, `<html lang>` is `bn-BD` from the cookie, and
the switcher renders with বাংলা selected. Twenty-one woff2 files ship, twenty-five
`@font-face` rules, and no keyframes in the compiled CSS.

The hero illustration (`hero-atelier.svg`) is still the old indigo asset and
looks wrong against the new palette. It is homepage content — Phase 6.

Typecheck 9/9, lint 9/9, tests 8/8, web build clean.

**Phase 4** — eight primitives rewritten, thirteen added.

The four field components turned out to be four copies of one class string,
which is how three of them had a focus glow the fourth did not. They now share
`fieldClassName` in `ui/field.ts`.

`Button` and `Badge` keep their old variant names as aliases, because 73 files
pass `variant="outline"` and 38 pass a `tone`. Removing the names would have
meant editing every one of them inside a primitives commit. Each alias resolves
to its Genex equivalent and they all go in Phase 12.

`Badge`'s tone set was the sharpest conflict with the design. It had
amber/rose/emerald/violet/sky, and DESIGN.md §2 allows roughly 6–10 accent marks
per page with no other saturated colour at all. The replacement is
`neutral` / `quiet` / `attention` / `faded`: a stuck payment or an expiring
licence earns the accent, a *successful* payment does not, because nothing is
wrong and nothing should shout.

Two smaller judgements. `PasswordInput` lost its eye icon for the words
দেখাও / লুকাও — the design ships no icon font, and a crossed-out eye is the one
glyph people reliably read backwards. `ProgressTrack` gained an `isComplete`
flag that fills in `line-strong` instead of accent, because the design spends
accent on what still needs doing and a finished course does not.

`DataTable` renders a real table at `md` and up and one card per row below it,
from the same `columns` array — a table scrolling sideways inside a phone hides
the column carrying the decision. The doodle set is seven CSS-only marks, all
`pointer-events-none`; `RingedWord` wraps its word rather than being positioned
by hand, so it survives that word changing length between Bangla and English.

`TeacherAvatar` now delegates to the new `Avatar` and keeps its name, since the
landing sections ask for "the teacher's face" rather than a generic avatar.

Verified on a running stack at 1440 and 390 wide: no page errors, fields render
hairlined, and the password toggle reads দেখাও under the Bangla locale.

Typecheck 9/9, lint 9/9, tests 8/8.

**Phase 5** — one public chrome, one dashboard shell, one auth page.

There were **two** public layouts disagreeing with each other: a `LandingLayout`
with its own nav and footer, and a `PublicLayout` that wrapped its children in a
marketing hero. The design has one header and one footer, so `LandingLayout` is
deleted and its three routes moved over. The optional page-head block on
`PublicLayout` is what the other five callers were using, so none of them
changed.

`AppShell` lost every `backdrop-blur` panel. That styling had already cost one
real bug — blur creates a stacking context, which trapped the notification panel
inside the header and let the content card paint over it. With no blur and no
shadow, z-index means what it says.

Two items were **pulled forward** because Phase 5 could not honestly finish
without them:

- **`/teachers`**, with a new public `GET /profiles/teachers`. The header needs
  somewhere to point, and TanStack Router typechecks `to` — a nav item cannot
  wait for its route.
- **Demo seed data.** `seed.ts` creates one administrator and nothing else, so
  the catalogue was empty and every public page rendered its empty state. There
  was nothing to look at and no way to verify Phases 6–10. `seed-demo-data.ts`
  is a separate script that refuses to run outside `NODE_ENV=development` —
  `seed.ts` is production-safe, this one invents people and takes their money.
  It seeds 4 levels, 8 subjects, 4 teachers, 6 students, 8 courses (6 published,
  1 draft, 1 pending), 48 lessons, 26 enrolments, 26 payments and 14 reviews,
  mixed Bangla and English.

Writing the directory query surfaced a **live bug**: `listFeaturedTeachers`
counts a teacher's courses with `count(course_id)` while left-joining
enrolments, so each course fans out into one row per enrolled student. A teacher
with 2 courses and 7 enrolments was reported as having 7 courses — on the
homepage, in production. Both that query and the new one now use
`count(distinct courses.id)`.

**ফ্রি ক্লাস is not in the nav yet.** It needs the catalogue to filter to courses
with a preview lesson, which is Phase 6 work; a nav item that lands on an
unfiltered list is a link that lies. Three items ship now, four after Phase 6.

Typecheck 9/9, lint 9/9, tests 8/8. Verified on a running stack at 1440 and 390
wide: header lockup, Bangla nav, the HELPLINE label with Bangla digits, doodles,
the hatched rule above the footer, and course counts reading ২ কোর্স · ৪ শিক্ষার্থী.

**Phase 6** — the four public screens.

The API had to grow first. A catalogue card wants a lesson count, a total
duration, a free-lesson count and a review average, and `CourseSummary` carried
none of them. `CourseStatsRecord` now comes back with every course, aggregated
in two queries per page rather than two per card, and joined as `exists` rather
than a join so the page size and total count stay correct.

Three things found along the way that were wrong before this phase:

- **The buy card invented a discount.** It printed a struck-through "original"
  price of `price × 2.5` and a "65% OFF" badge. The schema holds one price and
  no discount, so both numbers were fabricated and shown to buyers as fact.
  Gone.
- **The class list was empty for everyone not signed in.** The detail page read
  `/courses/:id/content`, which requires a session, and the loader swallowed the
  401 into an empty array. The design makes that list the page's main selling
  surface. There is now a public `GET /courses/:id/outline` returning titles,
  ordering, lesson length and which lessons are free — and *not* `videoUrl`,
  lesson bodies or materials. Those are absent from the response type rather
  than stripped afterwards, so a field added later cannot leak by being
  forgotten. Published courses only; a draft outline is a 404.
- **Every seeded rating was exactly 4.0**, because the review branch only ran on
  even indices and then added `index % 2`. Ratings now alternate.

`format.rating` was added because `format.number` rounds to whole numbers, so a
4.8 average rendered as ৫ — flattering every course on the page.

ফ্রি ক্লাস is now in the nav, pointing at `/courses?free=true`, since the filter
it needs finally exists.

The homepage is rebuilt as the design has it: ringed hero word, a level picker
whose left column filters its right, three circled steps, the teacher strip, an
independent-row FAQ, and a closing band. `categories-section`, `courses-section`
and `stats-section` are deleted — the first two became the level picker and the
third folded into the hero. The hero's illustration slot is the design's
placeholder fill rather than the old indigo SVG.

Typecheck 9/9, lint 9/9, tests 8/8. Verified on a running stack.

**Phase 7** — the dashboard shell and the builder.

Most of this was a sweep. Fifty-six files carried decorative markup the design
forbids outright — `backdrop-blur-3xl`, `shadow-xl`, `rounded-4xl`, blurred
gradient orbs, `animate-in`, `hover:-translate-y`, `font-black` — so those class
names came out mechanically rather than page by page. One regex went too far on
the first pass: it matched an *opening* `<div>` that had children and orphaned
its closing tag, breaking five files. Restored and re-run with the pattern
narrowed to self-closing and empty divs.

**The builder is four steps, not the design's five.** Its "কোর্সের তথ্য" and
"দাম ও ব্যাচ" are separate screens because the second holds a discount, a seat
count and a batch date — none of which exist here. What is left of the pricing
step is one price field, which belongs on the details form. So: তথ্য ও দাম ·
ক্লাস · পরীক্ষা · প্রকাশ.

The steps are **routes**, not local state. Each already existed as its own page
with its own saving; folding four working forms into one component's state would
have risked the whole authoring flow to gain nothing a teacher can see. What was
missing was the strip that makes them read as one flow, and a প্রকাশ step — a
new route with the design's checklist (title length, description length,
modules, lessons, a free lesson, a price) and the submit-for-review action. The
checklist is advisory, as the design says: the API decides what is actually
required, this tells a teacher what a reviewer will look at.

The shell gained its one accent action — "+ নতুন কোর্স" for a teacher, and
nothing for the other roles, because DESIGN.md §1 allows exactly one and no
other role has an action that earns it. The sidebar nav now carries message keys
rather than English strings, so it is bilingual like the rest of the chrome, and
the accountant's rows are in it.

Typecheck 9/9, lint 9/9, tests 8/8. Verified signed in as a teacher.

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
