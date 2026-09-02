# Web ↔ Mobile parity — current state and the mobile work that remains

**Snapshot:** `main` @ `2024f32` (_Refactor validation schemas to use rich text handling_) **plus the
uncommitted working tree**, now including a second pass that closed the B2/B3/A3/A7 residue this
document itself called out, plus a fix to messaging presence.
**Verified:** 2026-08-04, by reading the files and re-running the gates after every change, not by
trusting the change list.
**Scope:** `apps/web` (TanStack Start) compared against `apps/mobile` (Expo SDK 57 / Expo Router),
with `DESIGN.md` as the authority on what either one is supposed to look like.

The first edition of this document described an app that had received nothing since `36a413e`
(_feat(mobile): move the app onto the Genex tokens and catalogue (Phase 11)_). The second edition
marked every item in the then-current working tree with what the code actually showed and found a
short residue: six unlocalised files, four tab titles, two stray headings, six raw date calls, nine
`hairlineWidth` borders, an unextracted filter chip, and an unsettled unread-badge colour. **This
edition closes that residue** and fixes one bug the earlier passes never surfaced: mobile's message
socket silently dropped every presence event.

Legend used throughout:

| Mark | Meaning |
| --- | --- |
| ✅ | Done and verified in the working tree |
| ◐ | Partly done — the residue is named explicitly, with `file:line` |
| ⬜ | Not started |
| ⛔ | Out of scope, permanently |

**Gate status as of this snapshot:** `bun run --filter @genex/mobile lint`, `typecheck` and `test`
are all green (lint exit 0, typecheck exit 0, 60 tests across 7 suites), `bun run --filter
@genex/web lint typecheck build` is green, `bun run --filter @genex/i18n lint typecheck test` is
green (24 tests, 2130 assertions), and `npx expo export --platform web` bundles all 27 routes with
no errors.

Read it in three passes:

1. **§1–§3** — what each app is, and what is left of the gap.
2. **§4–§8** — the differences, ordered design tokens → primitives → screens → data → brand.
3. **§9–§12** — the change list with per-item status, the residual work, and the decisions that are
   still open.

Related documents: [`DESIGN.md`](../DESIGN.md) (visual language), [`mobile-plan.md`](./mobile-plan.md)
(how the app got here, and what is still unverified on hardware),
[`apps/mobile/AGENTS.md`](../apps/mobile/AGENTS.md) (workspace rules that constrain every fix below).

---

## 1. What each app is today

| | `apps/web` | `apps/mobile` |
| --- | --- | --- |
| Framework | TanStack Start, React 19, Vite 8 | Expo SDK 57, Expo Router, React Native |
| Routes / screens | 61 route files (56 `.tsx`) | **23 route files** (was 15) |
| Source size | ~28,900 lines under `src/` | **~8,570 lines** under `src/` + `app/` (was ~6,400) |
| Audience | student, teacher, admin, accountant + anonymous public | student only |
| Styling | Tailwind v4, tokens in `src/styles/app.css` | `StyleSheet`, tokens in `src/theme/tokens.ts` |
| Localisation | bilingual, `useT` / `useFormat` everywhere | **bilingual everywhere** — see §2.1; only the on-device Bangla pass (B4) is left |
| Server state | TanStack Query + `queryKeys` factory | TanStack Query + `queryKeys` factory, persisted to AsyncStorage |
| UI primitives | 24 files under `components/ui/` | one file, `src/components/ui.tsx` (692 lines, 18 exports) |
| Icons | `lucide-react` on dashboard surfaces, none on public pages | **`react-native-svg` set** in `src/components/tab-icons.tsx` |
| Tests | Playwright E2E | 60 jest-expo tests across 7 suites, including screen renders |
| Shared catalogue | `packages/i18n` — **886 keys per locale** (was 786) | same catalogue, consumed via `useT` |

The asymmetry in audience is deliberate and stays: **mobile is a student client.** Course
authoring, moderation queues, admin CRUD and analytics are not coming to the phone. Nothing in
this document proposes otherwise. Everything below is about the student's path.

---

## 2. The headline: what closed, and what is left

### 2.1 Localisation — ✅ wired everywhere; only the on-device pass is left

`LocaleProvider` is mounted in `app/_layout.tsx`, a `LanguageSwitcher` lives in the profile tab
(`app/(tabs)/profile.tsx:30`, two always-visible pills calling `setLocale`), and every file that
renders user-facing copy calls `useT()`. `packages/i18n` grew from 786 keys per locale in the first
edition to **920**, all typed against `bn.ts` as the source of truth so a key added to one locale
and forgotten in the other fails the build.

The six files the previous edition found with no `useT()` at all — `course-reviews.tsx`,
`lecture-comments.tsx`, `lecture-player.tsx`, `route-error.tsx`, `app/profile-complete.tsx`,
`app/messages/[conversationId].tsx` — are now wired, including the literals that same edition's own
scan had missed inside them (`route-error.tsx`'s `"No connection"` / `"This screen stopped"`,
`lecture-player.tsx`'s two error/lead strings, `profile-complete.tsx`'s body copy, and five more
strings in the conversation screen — the disclaimer body, the report/typing text, the composer and
report-input placeholders). New keys landed under `review.*`, `comment.*`, `error.*`, plus a few
each in `detail.*`, `profile.*`, `msg.*` and `player.*` — reusing an exact-match existing key
(`disc.reply`, `disc.title`, `action.cancel`, `profc.title`, `password.placeholderNew`, …) wherever
one already said the same thing, rather than growing a duplicate.

The four `Tabs.Screen` titles in `app/(tabs)/_layout.tsx` were static English (`"Catalog"`, `"My
courses"`, …) even though the file sat one hook-call away from `useT()` — fixed by splitting the
`Stack` in the **root** `app/_layout.tsx` into its own `AppStack` component (`useT` needs a
descendant of `LocaleProvider`, and `RootLayout` itself renders the provider rather than sitting
inside it), which also caught eight more static `Stack.Screen` titles that were dead on every route
with its own `options={{ title: … }}` override but still failed the "no literal" grep. Also fixed:
two stray `<Title>` literals (`courses/[courseId].tsx:134`, `(tabs)/profile.tsx:175`), and three
literals in the sign-in/sign-up forms (`"Your name"`, `"Your password"`, `"At least N
characters"` / `"Passwords must be at least N characters."`) that neither edition's scan had
caught because they were placeholder/interpolated props, not `<Text>` children. `you@example.com`
is left as a literal deliberately — an email-format example, not prose.

`app/auth-callback.tsx`, `app/payment-callback.tsx`, `src/components/html-content.tsx`,
`src/components/tab-icons.tsx` and `src/components/ui.tsx` still have no `useT()` and still need
none — they render no copy of their own.

**Formatting** is on `useFormat` for currency, numbers, ratings and percentages (`PriceText` in
`ui.tsx:480` calls `format.currency`; `formatPrice` is gone), and now for dates too — the six raw
`toLocale*` calls the previous edition listed (`bug-report.tsx`, `(tabs)/messages.tsx`,
`(tabs)/notifications.tsx`, `messages/[conversationId].tsx`, `lecture-comments.tsx` ×2) are all on
`format.date` or `format.dateTime`. The acceptance grep is clean:

```
grep -rn "toLocaleString\|toLocaleDateString\|toLocaleTimeString\|formatPrice" apps/mobile/src apps/mobile/app
→ no matches
```

**Still not done: the both-locale pass on a device (B4).** Nothing has been looked at in Bangla on
hardware, and Bangla runs ~20% longer than English. Everything above is a typecheck-and-grep
guarantee that a `t(...)` call exists and resolves — not a guarantee that the Bangla string fits.

### 2.2 Design tokens — ✅ the half-migration is finished

`src/theme/tokens.ts` is now 92 lines of Genex values with **no Material aliases**. The acceptance
grep is clean:

```
grep -rn "surfaceContainer\|onSurface\|primaryContainer\|secondaryContainer" apps/mobile/src apps/mobile/app
→ no matches
```

Specifically fixed since the first edition:

- `radius` is `{ pill: 100, sm: 4, square: 0, full: 999 }`. Cards carry no `borderRadius` at all
  (`ui.tsx:580`), buttons carry `radius.sm` (`ui.tsx:547`).
- `Badge` tones are `neutral` / `quiet` / `attention` / `faded`, matching web. The green and amber
  status fills are gone; `attention` is accent **text** on card, not an accent fill.
- `ErrorNotice` is a hairline card with `colors.error` text — no pink surface.
- Message bubbles: the student's own messages fill `colors.chipActive`
  (`app/messages/[conversationId].tsx:229`), not accent.
- `ProgressTrack` chunks are square, on `barTrack`, with an `isComplete` variant filling
  `lineStrong` (`ui.tsx:681–691`).
- `SkeletonBlock` is a still block on `placeholderFill` — the Reanimated pulse is gone.
- Type scale is on target: display 26/500, title 20, body 17 at line-height 31, caption 15,
  `monoLabel` (Archivo) applied to field labels, eyebrows and stat labels.

Accent now fills exactly five things app-wide, all of them legitimate: the `accent` button variant,
the active tab underline, filled progress chunks, the player's done-chunk marker, and — as of this
edition — the unread-count badge and the online presence dot (§4.1, §6.5).

**Both token residues from the previous edition are closed:**

- **Border width — ✅.** The nine `StyleSheet.hairlineWidth` borders are all `1` now:
  `src/components/course-reviews.tsx:191`, `app/sign-in.tsx:108`, `app/sign-up.tsx:113`,
  `app/tests/[testId].tsx:337` and `:362`, `app/(tabs)/index.tsx:329` and `:346`,
  `app/messages/[conversationId].tsx:233`, `app/(tabs)/profile.tsx:203`. The acceptance grep —
  `grep -rn "hairlineWidth" apps/mobile/src apps/mobile/app` — is clean.
- **The unread badge — ✅ settled on accent, both apps.** `app/(tabs)/_layout.tsx:136` fills
  `colors.accent`; web's `notification-bell.tsx:183` moved off `bg-violet-600` onto `bg-accent
  text-ink`, the same pairing the rest of web's accent-fill surfaces already use.

### 2.3 Student capability — ✅ the named gaps are closed

Everything §2.3 of the first edition called missing now exists:

- **TEXT lectures, PDF lectures and materials** — `app/learn/[courseId].tsx` renders
  `lecture.type === "TEXT"` bodies, opens PDF materials through `expo-web-browser`, and renders
  both lecture and chapter `materials` lists (`:161–190`, `:430–487`).
- **Test results** — `app/tests/[testId]/results/[submissionId].tsx` (110 lines) exists, fed by
  `getSubmissionDetail`.
- **Payments** — `app/payments.tsx` (128 lines) on `listMyPayments`; receipts and certificates
  download through `src/lib/documents.ts` from `(tabs)/learning.tsx:114` and `:121`.
- **Free-lesson preview** — `app/courses/[courseId]/preview/[lectureId].tsx` (111 lines), a
  full-screen route rather than a dialog, handling PDF / TEXT / video.
- **Notices** — a mode toggle at the top of the player (`app/learn/[courseId].tsx:195`, `:358`),
  matching web's prominence, with pinned notices badged.

---

## 3. Route inventory

Web routes **not** in scope for mobile (teacher/admin/accountant tooling, SEO surfaces, server
handlers) are listed once at the end rather than line by line.

| Web route | Mobile screen | Status |
| --- | --- | --- |
| `/` (landing) | — | ⛔ Mobile opens on the catalogue tab. Settled: the store listing does the landing page's job |
| `/courses` | `app/(tabs)/index.tsx` | ✅ Parity, incl. level/subject split, sort, free-only, teacher avatars |
| `/courses/$slug` | `app/courses/[courseId].tsx` | ◐ Feature parity; **still addressed by id, web by slug** — §11 Q6 |
| `/categories`, `/categories/$slug` | — | ⛔ Mobile expresses categories as the level/subject chip pair |
| `/teachers`, `/teachers/$slug` | — | ⬜ Absent. Mobile shows avatar + name, no link — §11 Q4 |
| `/about`, `/contact` | — | ⛔ Web only |
| `/auth/sign-in` | `app/sign-in.tsx` | ✅ Rebuilt against the web redesign |
| `/auth/sign-up` | `app/sign-up.tsx` | ✅ Rebuilt |
| `/dashboard` (student overview) | resume card in `(tabs)/learning.tsx:141` | ✅ Settled as a card, not a sixth tab (§11 Q3) |
| `/dashboard/my-courses` | `app/(tabs)/learning.tsx` | ✅ Incl. receipt and certificate download |
| `/dashboard/learn/$courseId` | `app/learn/[courseId].tsx` (619 lines) | ✅ See §6.3 |
| `/dashboard/tests/$testId` | `app/tests/[testId].tsx` (369 lines) | ✅ One-at-a-time, autosave, auto-submit |
| `/dashboard/tests/$testId/results/$submissionId` | `app/tests/[testId]/results/[submissionId].tsx` | ✅ |
| `/dashboard/tests/$testId/leaderboard` | `app/tests/[testId]/leaderboard.tsx` | ✅ MCQ only, same rows for student and teacher — [ADR-0017](adr/0017-a-leaderboard-ranks-the-best-attempt.md) |
| `/dashboard/messages` | `(tabs)/messages.tsx` + `messages/[conversationId].tsx` + `messages/new.tsx` | ✅ Can now start a conversation |
| `/dashboard/profile` | `(tabs)/profile.tsx` + `app/change-password.tsx` | ◐ Password change ✅; **photo upload absent** — §11 Q5 |
| `/dashboard/profile-complete` | `app/profile-complete.tsx` | ✅ (not localised — §2.1) |
| `/dashboard/payments` | `app/payments.tsx` | ✅ |
| `/dashboard/bugs`, `/dashboard/bugs/report` | `app/bug-report.tsx` | ◐ List + form + `adminNotes` + `priority` ✅; **no screenshot upload** — §11 Q5 |
| notification bell (in `AppShell`) | `app/(tabs)/notifications.tsx` | ✅ Mark-all-read + tap-to-navigate |
| — | `app/courses/[courseId]/preview/[lectureId].tsx` | ✅ Mobile-only full-screen preview route |
| — | `app/auth-callback.tsx`, `app/payment-callback.tsx` | ✅ Mobile-only deep-link landing pads |

**Out of scope, permanently:** `/dashboard/courses/*` (authoring), `/dashboard/admin/*`,
`/dashboard/accountant/*`, `/dashboard/analytics`, `/dashboard/students/*`,
`/dashboard/notifications/send`, `/dashboard/tests/$testId/submissions*` (grading),
`/dev/seo-preview`, `robots.txt`, `sitemap.xml`, `/api/*`.

---

## 4. Design tokens — the diff

`DESIGN.md` column is the authority. "Web" is what `app.css` and the primitives actually ship.
"Mobile" is what `tokens.ts` + `ui.tsx` actually ship **now**.

### 4.1 Colour

| Role | DESIGN.md | Web | Mobile | Status |
| --- | --- | --- | --- | --- |
| Presence dot | none — "no red/green/amber status palette" (§2) | `bg-accent` online / `bg-dot-idle` offline | same, new in this edition (§6.5) | ✅ |
| Page background | `#FCFBF9` + 27px dot grid + three corner washes | ✓ on `body` | `#fcfbf9`, flat, no texture | ⬜ pending §11 Q1 |
| Card surface | `#FFFFFF`, `1px #E8E4DE`, square | ✓ | `colors.card`, `1px`, radius 0 | ✅ |
| Default badge | `Muted` on `Chip active` `#EFEBE4` | ✓ | `chipActive` fill, ink text | ✅ |
| "Positive" / "Warning" badge | do not exist | `neutral` / `attention` | tones deleted; `attention` = accent text on card | ✅ |
| Error surface | none; `#BA1A1A` **text** only | ✓ `text-error` | hairline card + `colors.error` text | ✅ |
| Selected pill / chip | `#EFEBE4` fill, ink text | ✓ `FilterPill` | `chipActive` fill (`(tabs)/index.tsx:333`) | ✅ colour; ◐ no shared primitive (§5) |
| Input fill | white `#FFFFFF` | ✓ `bg-card` | `colors.card` (`ui.tsx:633`) | ✅ |
| Input placeholder | `#B4AEA6` | ✓ | `colors.placeholder` | ✅ |
| Progress track | `#F1EEE9` (`bar-track`) | ✓ | `colors.barTrack` | ✅ |
| Progress fill | accent; `line-strong` when complete | ✓ | accent + `isComplete` → `lineStrong` | ✅ |
| Unread count badge | accent text (§2 "needs attention") | `bg-accent text-ink` | `colors.accent` fill | ✅ settled on accent, both apps |
| Skeleton fill | `#F1EEE9` placeholder-fill | ✓ | `colors.placeholderFill` | ✅ |

### 4.2 Shape

| | DESIGN.md | Web | Mobile | Status |
| --- | --- | --- | --- | --- |
| Cards | **0px** | `border`, no radius | no `borderRadius` on `styles.card` | ✅ |
| Buttons / inputs | 4px | `var(--radius)` = 4px | `radius.sm` = 4 | ✅ |
| Pills / chips | 100px | `--radius-pill` | `radius.pill` = 100 | ✅ |
| Dots, avatars | 50% | ✓ | `size / 2` in `Avatar`, `radius.full` for dots | ✅ |
| Borders | `1px #E8E4DE` | ✓ | `1` inside `ui.tsx`; **9 `hairlineWidth` left in screens** | ◐ §2.2 |
| Shadows | none | none | `shadow.card` is `{}` | ✅ |

### 4.3 Type — ✅ done

| Role | DESIGN.md (small-screen target) | Mobile today |
| --- | --- | --- |
| Screen h1 | 26px / 500 | `display` 26 / LH 36 ✅ |
| Section / card title | 20–24px / 500 | `title` 20 / LH 27 ✅ |
| Sub-head | 22–23px / 500 | `heading` 22 / LH 30 ✅ |
| Body | 17–18px / 300, LH 1.8–1.9 | 17 / LH 31 (1.82) ✅ |
| Label, meta | 15–16px | `caption` 15 / LH 22 ✅ |
| Archivo label | 11–14px, `letter-spacing .06em` | `monoLabel` at 11–12px with `letterSpacing` .66–.72 on field labels, eyebrows, stat labels ✅ |

Font families are right and should not be touched: Hind Siliguri for everything set in words,
Archivo for Latin numerals and small all-caps labels, one family per weight because Android does
not synthesise a bold. See `apps/mobile/AGENTS.md` § Typography before editing `_layout.tsx`.

### 4.4 Motion — the conflict is now one-sided

Mobile has complied: `SkeletonBlock` is a still block and nothing else animates. **Web has not** —
`apps/web/src/styles/app.css` still defines `@keyframes fadeIn / fadeUp / floatSubtle / pulseGlow /
doodlePulse` (`:236` onward), a `.hover-lift` with a `box-shadow` (`:226`), and an `animation:
fadeIn` application at `:191`; `CourseCard` still ships `hover:-translate-y-1 hover:shadow-md`.

So the conflict is unchanged in substance but the burden has moved: the mobile app matches
`DESIGN.md` §1, and either `DESIGN.md` gets amended or the web utilities get removed. §11 Q1.

---

## 5. Primitives — web `components/ui/` vs mobile `src/components/ui.tsx`

Mobile deliberately keeps one file. It is now 740 lines with 23 exports, and covers every primitive
the change list called for.

| Web primitive | Mobile equivalent | Status |
| --- | --- | --- |
| `Button` — 6 variants, 5 sizes | `Button` — `ink` / `accent` / `outline` / `ghost` / `accentLink`, sizes `xs`/`sm`/`default`/`lg` | ✅ `accentLink` appends the `→` affordance |
| `Badge` — `neutral` / `quiet` / `attention` / `faded` | same four tones, same colours | ✅ |
| `Pill` + `FilterPill` | `FilterPill` (`ui.tsx:344`) | ✅ extracted this edition; the catalogue's six chip call sites (level / subject / free-only / sort) all render it, and its own inline `styles.chip` / `styles.chipActive` are gone |
| `PresenceDot` | `PresenceDot` (`ui.tsx:329`) | ✅ new this edition, §6.5 — `colors.accent` online, `colors.dotIdle` offline, matching web's own `bg-accent` / `bg-dot-idle` |
| `Card` + `CardHeader/Title/…` | `Card` + `SectionHeading` | ✅ composition is `gap`-based now, not spacer `View`s |
| `Input` / `Textarea` / `Select` / `PasswordInput` | `Field` (label + `TextInput`) | ◐ no select, no password reveal — `app/change-password.tsx` uses plain secure fields |
| `EmptyState` — dashed box, optional action | `EmptyState` — dashed `1px dotIdle`, optional `action` node | ✅ |
| `Skeleton` — still block | `SkeletonBlock` — still block | ✅ |
| `ProgressTrack` | square chunks, `barTrack`, `isComplete` | ✅ both use `resolveProgressChunks` |
| `Tabs` — 2px accent underline | `Tabs` (`ui.tsx:332`) | ✅ |
| `Accordion` | `AccordionRow` (`ui.tsx:374`), `+`/`–` text marker, independent rows | ✅ |
| `Avatar` | `Avatar` (`ui.tsx:417`), initials fallback on `placeholderFill` | ✅ |
| `PriceText` | `PriceText` (`ui.tsx:480`) via `format.currency` | ✅ |
| `SectionHeading` | `SectionHeading` (`ui.tsx:448`) — eyebrow / title / description / action | ✅ |
| `StatCard` | `StatCard` (`ui.tsx:470`) | ✅ |
| `DataTable` | `FlashList` rows | ⛔ correct divergence |
| `ConfirmDialog` | — | ⬜ acceptable; no destructive mobile action exists yet |
| `ResponsiveImage` | `CoverImage` | ✅ device-pixel sizing |
| `RichTextContent` | `HtmlContent` (`react-native-render-html`) | ✅ |
| `Doodles` (`RingedWord`, `RingedPlay`, dot patch, quarter arc) | — | ⬜ §11 Q2 |
| `route-error` | `route-error` | ✅ incl. offline branch (copy not localised — §2.1) |

---

## 6. Screen-by-screen

### 6.1 Catalogue — ✅ parity

`app/(tabs)/index.tsx` (357 lines) now carries the level/subject split (`levelId` / `subjectId`, the
subject narrowing the level exactly as `course-filter-rail.tsx` does), a three-way sort
(`newest` / `priceLow` / `priceHigh`), a free-only toggle, price bands, and a card with the meta
line (`length · lessons · free lessons`), teacher avatars at 28px, review count and `PriceText`.

Price bands remain a mobile-only idea and a good one — "a phone keyboard for a range is worse than
three taps."

All six chip strips (level, subject, free-only, sort) now render the shared `FilterPill` (§5); the
two borders that were `hairlineWidth` are `1`.

### 6.2 Course detail — ✅ parity, one addressing question

`app/courses/[courseId].tsx` (339 lines) has `Tabs` (curriculum / teacher / reviews), the curriculum
as `AccordionRow`s over `getCourseOutline`, free lessons routing into the preview screen
(`:265`), a teacher tab with `Avatar` + owner marker, and a buy card with `PriceText`, exactly one
action, and the "what's included" checklist (lifetime / certificate / tests / materials, `:139`).
Signed-out state routes to sign-in; staff get a notice rather than a dead button.

`CourseReviews` — the review-writing form mobile has and web does not — survives. It is still worth
porting back to web rather than removing.

Open: mobile addresses by id, web by slug (§11 Q6). `CourseSummary.slug` is already in the mobile
types (`src/lib/api.ts:15`), so the switch is a routing change, not a data one.

### 6.3 Course player — ✅ the gap is closed

`app/learn/[courseId].tsx` went from 286 to 619 lines.

| Capability | Web | Mobile | Status |
| --- | --- | --- | --- |
| Header stats row | 4 tiles | 4 `StatCard`s: completed, lectures, progress %, assessments (`:334`) | ✅ |
| Chunked progress | three states | same | ✅ |
| Chapter navigator | lectures **and** tests interleaved by `sortOrder` | same — items merged and sorted at `:242–256` | ✅ |
| Prev / next navigation | buttons + arrow keys | prev/next buttons (`:499`, `:505`); no key shortcuts (no keyboard) | ✅ |
| `VIDEO_UPLOAD` | `<video>`, `onEnded` | `expo-video`, 95% `timeUpdate` | ✅ mobile is better |
| `VIDEO_LINK` | iframe in place | opens the browser | ✅ accepted divergence |
| `TEXT` lecture | renders `lecture.content` | renders it (`:431`) | ✅ |
| PDF lecture | 70vh iframe | PDF material opened via `expo-web-browser` (`:67`, `:430`) | ✅ |
| Lecture / chapter materials | `MaterialLinks` cards | `Materials` list for both (`:161`, `:483`, `:487`) | ✅ |
| Notices | mode toggle, pinned ringed | mode toggle (`:195`, `:358`), pinned badged | ✅ |
| Lecture discussion | 500 lines: replies, edit, delete, pagination | `LectureComments`, 169 lines: post + one-level replies | ◐ no edit/delete UI, though `updateLectureComment` / `deleteLectureComment` are wrapped |
| "Mark as complete" | button + toast | button | ✅ |
| Last-viewed timestamp | shown | not shown | ⬜ minor |
| Link back to course overview | shown | not shown | ⬜ minor |

### 6.4 Test taking — ✅ including the two correctness bugs

`app/tests/[testId].tsx` (369 lines):

- **One question at a time**, `currentQuestionIndex` with a navigator and an answered counter
  (`:146`, `:219`).
- **Debounced autosave**, one 800ms timer per change, suppressed while the loaded answers hydrate
  the draft (`:110–130`).
- **Auto-submit at zero** — a dedicated effect fires `handleSubmit()` when `timeRemainingSeconds`
  reaches 0 (`:133–138`). The silent-loss bug is gone.
- **Results** — submit navigates to `app/tests/[testId]/results/[submissionId].tsx`, which shows
  status, score / max, and per-question answers with awarded marks.

MCQ options remain pressable rows and written answers a multiline `TextInput` — both better than
web's radio labels and single-line input on a phone.

Both `hairlineWidth` borders (`:337`, `:362`) are `1`.

Submit-button gating (last question only), a per-test attempt cap (`maxAttempts`), answer-locking
(`lockAnswerOnSelect`), and a computed Passed/Failed verdict on results are new as of the exam UX
overhaul and should be re-verified for web/mobile parity once QA'd end to end — this section's ✅
predates that work.

**Attempt history.** Every submission row already survives a retake (`maxAttempts` just gates
whether a new one can start), so a per-user attempt history was exposed on top of existing data:
`GET /tests/:id/submissions/mine` (student's own attempts) alongside the existing teacher/admin
`GET /tests/:id/submissions` (every student's attempts). Both responses now carry `attemptNumber`
(oldest attempt = 1, computed server-side per student, never globally). Web:
`/dashboard/tests/$testId/history` (student) plus attempt badges on the existing teacher submissions
list and both grading/results detail pages. Mobile: `app/tests/[testId]/history.tsx`, linked from
`learn/[courseId].tsx` and the results screen. Needs the same end-to-end re-verification as the rest
of this section.

### 6.5 Messages — ✅ all three gaps closed, plus a presence bug neither edition had found

- **Starting a conversation** — `app/messages/new.tsx` (126 lines), debounced
  `searchMessageParticipants` into `createConversation`.
- **Reconnect** — `src/lib/use-messaging-socket.ts` now layers exponential backoff (1s doubling to
  `RECONNECT_CAP_MS`, reset on a clean open, `:79–126`) **on top of** the `AppState` connect/disconnect
  model, which is the right shape for a phone.
- **Bubbles** — own messages fill `chipActive`, not accent.
- **Localisation and the composer border** — both closed (§2.1, §2.2).

**Presence was silently broken, and neither edition of this document had audited it** — §6.5 of the
previous edition only checked typing indicators, read receipts, the hidden-message tombstone and
reporting, and called the rest "present on both ✓" without checking online status specifically. The
bug: `apps/api/src/services/message-realtime-service.ts` broadcasts `presence:update` with
`conversationId: ""` — it is a global event, not scoped to one thread. Mobile's socket handler
checked `payload.conversationId !== conversationId` *before* branching on event type
(`use-messaging-socket.ts`, previously around `:141`), so `""` never matched the open conversation's
id and every presence event was discarded by that early return before it ever reached the
`presence:update` branch below it — which itself only did `return;`. The result: `MessageParticipant
.isOnline` was fetched from the API but never updated live, and nothing in the UI rendered it at all.

Fixed in this edition:

- `use-messaging-socket.ts` now branches on `payload.type === "presence:update"` **first**, before
  the conversation-scoping check, and patches both the `queryKeys.conversations()` list and the open
  `queryKeys.conversation(conversationId)` thread in the query cache via `setQueryData`.
- A new `PresenceDot` primitive (§5) renders in three places: the conversation list row
  (`app/(tabs)/messages.tsx`), the open conversation's header — a custom `headerTitle` replacing the
  plain string title, showing the peer's name plus an online/offline `Caption` (`app/messages/
  [conversationId].tsx`) — and the new-conversation participant search results (`app/messages/
  new.tsx`).
- **Not literally green.** `DESIGN.md` §2 has no red/green/amber status palette, and web's own
  `PresenceDot` (`conversation-list.tsx:11`) already draws this exact dot in `bg-accent` /
  `bg-dot-idle` rather than green/grey, with a comment saying so. Mobile's dot follows the same rule
  for the same reason: `colors.accent` fills it when online, `colors.dotIdle` when offline —
  consistent with every other status affordance this document has been steering onto the accent
  scale (the unread badge, the "attention" badge tone).

### 6.6 Profile, notifications, bug reports

| | Web | Mobile | Status |
| --- | --- | --- | --- |
| Profile view | all role fields, photo upload, change password, teacher preview | read-only card, `LanguageSwitcher`, link to completion form, link to `app/change-password.tsx` | ◐ **no photo upload** — deliberate, see `src/lib/profile-form.ts:82` |
| Profile completion | multi-step | one screen, one save | ✅ simpler on purpose |
| Notifications | list, mark all read, tap navigates, push state | `markAllNotificationsRead` mutation (`:77`, `:129`) and `router.push(href)` per item (`:94`), routed by id | ✅ |
| Bug reports | list + form, rich text, screenshot, admin response | one screen: form, list, `priority` badge (`:144`), `adminNotes` rendered as rich text (`:157`) | ◐ **no screenshot upload** — §11 Q5 |
| Language | `LanguageSwitcher` in both shells | `LanguageSwitcher` in the profile tab | ✅ |

---

## 7. Data layer — ✅ done

`src/lib/api.ts` grew from 33 to **77 exported functions and interfaces** (635 lines).

**Types widened:** `ContentLecture` carries `type`, `content`, `materials`, `sortOrder` and
`videoDuration`; `ContentChapter` carries `materials` and `sortOrder`; `SubmissionDetail` extends
`SubmissionSummary` with per-answer views; `AssessmentTestSummary` carries the counts and
`sortOrder` the interleaved navigator needs; `BugReportRecord` carries `adminNotes` and `priority`;
`CourseSummary.stats` carries `lectureCount`, `freeLessonCount`, `reviewAverage`, `reviewCount`.
New: `ContentMaterial`, `CourseOutlineChapter` / `CourseOutlineLesson`, `CourseLecturePreview`,
`MessageParticipant`, `PaymentHistoryItem`.

**Endpoints wrapped since the first edition:**

| Endpoint | Wrapper | Needed for |
| --- | --- | --- |
| `GET /courses/:id/outline` | `getCourseOutline` | public curriculum |
| `GET /content/lectures/:id/preview` | `getLecturePreview` | free-lesson preview |
| `GET /tests/submissions/:id` | `getSubmissionDetail` | test results |
| `POST /notifications/read-all` | `markAllNotificationsRead` | mark all read |
| `GET /payments/me` | `listMyPayments` | payment history |
| `GET /enrollments/:id/{receipt,certificate}` | `src/lib/documents.ts` | PDF download + share |
| `GET /messages/participants`, `POST /messages/conversations` | `searchMessageParticipants`, `createConversation` | starting a conversation |
| `PATCH` / `DELETE` on comments | `updateLectureComment`, `deleteLectureComment` | wrapped, **not yet surfaced in the UI** |

Still unwrapped: `GET /profiles/teachers` and `/profiles/teachers/by-slug/:slug` — only needed if
§11 Q4 adopts teacher pages.

**Check the route before wrapping any more.** `apps/mobile/AGENTS.md` names four paths that are not
where you would guess (`courses/:id/progress`, `enrollments/courses/:id/me`,
`tests/submissions/:id/answers`, `tests/:testId/submit`); assume there are more.

---

## 8. Brand and app-shell assets — ◐ half done

**Done:** `apps/mobile/assets/images/` now contains `genex-mark.png` and `genex-wordmark.png`, and
`app/(tabs)/_layout.tsx:24` renders the lockup as the catalogue tab's `headerTitle` — mark at 24px,
wordmark at 15×72, 6px gap. `app.json` names the app `Genex`, slug `genex`, scheme `genex`, bundle
`com.genex.app`.

**Not done — the launcher and splash are still the Expo template:**

| `app.json` key | Current value | Should be |
| --- | --- | --- |
| `icon` | `./assets/images/icon.png` (template) | generated from the Genex mark |
| `android.adaptiveIcon.backgroundColor` | `#E6F4FE` (pale blue) | `#FCFBF9` |
| `android.adaptiveIcon.foregroundImage` | `android-icon-foreground.png` (template) | Genex mark |
| `expo-splash-screen.backgroundColor` | `#faf8ff` (lavender) | `#FCFBF9` |
| `expo-splash-screen.image` | `splash-icon.png` (template) | Genex mark |

Neither `#E6F4FE` nor `#faf8ff` appears anywhere in the Genex palette. This is the last thing
standing between the app and a build a human can look at without wincing.

⚠️ `DESIGN.md` §9 warns the current PNGs were traced from a white-background JPG. **Get the vector
from the client before generating icon sets** — an icon is expensive to change once a store listing
exists. This is why E1 is still open rather than merely unfinished.

---

## 9. The change list, with status

Sizes are rough: **S** ≤ half a day, **M** ≈ a day, **L** ≈ two or more.

### Group A — Tokens and primitives

| # | Change | Size | Status |
| --- | --- | --- | --- |
| A1 | Delete every Material alias; migrate all call sites | M | ✅ |
| A2 | `radius`: cards 0, buttons/inputs 4, `pill` 100, `full` for dots | S | ✅ |
| A3 | Borders → `1` everywhere | S | ✅ |
| A4 | `Badge` tones `neutral`/`quiet`/`attention`/`faded` | S | ✅ |
| A5 | `ErrorNotice`: hairline card + error text | S | ✅ |
| A6 | `Button`: 5 variants, 4 sizes, 4px radius | M | ✅ |
| A7 | `Pill` + `FilterPill` primitive, replacing inline chips | M | ✅ |
| A8 | `Field`: white fill, `placeholder`, Archivo label | S | ✅ |
| A9 | `SkeletonBlock`: still block | S | ✅ |
| A10 | `ProgressTrack`: square chunks, `isComplete` | S | ✅ |
| A11 | `EmptyState`: dashed box, optional action | S | ✅ |
| A12 | `Tabs`, `AccordionRow`, `Avatar`, `SectionHeading`, `StatCard`, `PriceText` | L | ✅ |
| A13 | Type scale per §4.3 | S | ✅ |

### Group B — Localisation

| # | Change | Size | Status |
| --- | --- | --- | --- |
| B1 | `LanguageSwitcher` in the profile tab | S | ✅ |
| B2 | Replace every literal with `useT`; add missing keys to `bn.ts` / `en.ts` | L | ✅ |
| B3 | Replace `formatPrice` / `toLocale*` with `useFormat` | M | ✅ |
| B4 | Check every screen at both locales on device | M | ⬜ |

### Group C — Data model

| # | Change | Size | Status |
| --- | --- | --- | --- |
| C1 | Widen `ContentLecture` / `ContentChapter` | S | ✅ |
| C2 | Widen `SubmissionDetail` and `AssessmentChapterSummary` | S | ✅ |
| C3 | `adminNotes` / `priority` on `BugReportRecord` | S | ✅ |
| C4 | Wrap the §7 endpoints, routes verified | M | ✅ (teacher endpoints deferred to Q4) |

### Group D — Screens

| # | Change | Size | Status |
| --- | --- | --- | --- |
| D1 | Player: TEXT, PDF, lecture + chapter materials | L | ✅ |
| D2 | Player: unified `sortOrder` navigator with prev/next | M | ✅ |
| D3 | Player: stats row | S | ✅ |
| D4 | Player: notices as a mode toggle | S | ✅ |
| D5 | Tests: one question at a time, navigator, counter | M | ✅ |
| D6 | Tests: debounced autosave; auto-submit at zero | M | ✅ |
| D7 | Tests: results screen | M | ✅ |
| D8 | Course detail: tabs + curriculum accordion | M | ✅ |
| D9 | Course detail: free-lesson preview | M | ✅ (full-screen route) |
| D10 | Course detail: buy panel with "what's included" | S | ✅ |
| D11 | Catalogue: level/subject split, sort, free-only, richer card | M | ✅ |
| D12 | My courses: receipt + certificate | S | ✅ |
| D13 | Student home / resume card | M | ✅ resume card, no sixth tab |
| D14 | Payments screen | M | ✅ |
| D15 | Notifications: mark-all-read + tap-to-navigate | S | ✅ |
| D16 | Bug report: `adminNotes` + `priority` | S | ✅ |
| D17 | Profile: change password | S | ✅ |
| D18 | Messages: start a conversation | M | ✅ |
| D19 | Messages: exponential-backoff reconnect | S | ✅ |
| D20 | Auth: rebuild sign-in / sign-up | M | ✅ |

### Group E — Shell and brand

| # | Change | Size | Status |
| --- | --- | --- | --- |
| E1 | Genex app icon, adaptive icon, splash | S | ⬜ blocked on the vector (§8) |
| E2 | Brand lockup in the tab header | S | ✅ |
| E3 | Real icon set for the tab bar | S | ✅ `react-native-svg`, `src/components/tab-icons.tsx` |
| E4 | Page texture | M | ⬜ pending §11 Q1 |

---

## 10. What is actually left

Everything the second edition punch-listed as gradeable code work — B2, B3, A3, A7, the unread-badge
colour, and (found only while doing that work) the messaging presence bug — is done and verified
against the gate status at the top of this document. What is left is materially smaller:

1. **B4 (M).** The both-locale pass, on a device: catalogue → course detail → enrol on a free course
   → player → lecture → test → submit → results → discussion → notices → messages (including the new
   presence dots) → notifications → profile → sign out, in **both locales**, on one emulator and one
   physical device. Nothing above has been looked at in Bangla on hardware.
2. **E1 (S once unblocked).** Icon, adaptive icon, splash — after the client's vector arrives (§8).
3. **Optional, small:** comment edit/delete UI (the API wrappers already exist), the player's
   last-viewed timestamp and back-to-course link.
4. **Whatever §11 unblocks:** E4 (texture), doodles, teacher pages, uploads, slug addressing (Q6 is
   now the more urgent of these — see §11).
5. **`bunx expo-doctor`** — not re-run since the working-tree changes; do this alongside B4.

**Acceptance for the whole programme**

- [x] `grep -rn "surfaceContainer\|onSurface\|primaryContainer\|secondaryContainer" apps/mobile/src apps/mobile/app` returns nothing.
- [x] No string literal renders in a `<Text>` in `app/**` outside a `t(...)` call, an interpolated
      value, or user-authored content.
- [x] Every price, date, count and percentage on mobile matches the web app's rendering of the same
      value in the same locale.
- [x] Every list that can be empty has a dashed `EmptyState`.
- [x] Every route still exports `ErrorBoundary` from `@/src/components/route-error`.
- [x] `lint`, `typecheck` and the 60 jest-expo tests are green — re-verified this edition, plus
      `@genex/web lint typecheck build` and `@genex/i18n lint typecheck test`, plus a full
      `expo export --platform web` bundle of all 27 routes.
- [ ] `bunx expo-doctor` stays at 20/20 — not re-run since the working-tree changes.

---

## 11. Decisions still open

**Q1 — Does `DESIGN.md` §1 "no animation, no shadow" still stand?** ⬜ open, now one-sided.
Mobile complied: the skeleton pulse is gone and nothing animates. Web still ships five `@keyframes`,
`.hover-lift` with a `box-shadow`, `hover:-translate-y-1 hover:shadow-md` on `CourseCard`, and a
shadowed notification panel. *Recommendation unchanged:* amend `DESIGN.md` to permit the entrance
fades web actually uses, keep "no shadow" and "nothing lifts", remove the web `hover-lift`. Blocks
E4 and the web cleanup.

**Q2 — Doodles on mobile.** ◐ half-answered. The tab bar got a real `react-native-svg` icon set
(E3 ✅), so the OEM-font problem is gone. The decorative set — ringed word, ringed play glyph, dot
patch, quarter arc — is still absent. *Recommendation:* reimplement the ringed word and play glyph
only (a rotated bordered `View` and a triangle); skip the rest.

**Q3 — Does mobile get a home tab?** ✅ **decided: no.** The resume card sits at the top of
"My courses" (`app/(tabs)/learning.tsx:141`) and the catalogue stays the landing tab.

**Q4 — Public/marketing surfaces on mobile.** ⬜ open. Teacher detail is still absent; the teacher
tab on course detail shows an `Avatar` and a name with nothing to tap, so it no longer dead-ends
into a broken link — it simply does not link. Adding it needs `GET /profiles/teachers/by-slug/:slug`
wrapped (§7). *Recommendation unchanged:* teacher detail only, the rest stays on web.

**Q5 — Uploads.** ⬜ open, and now the only capability gap left. No profile photo
(`src/lib/profile-form.ts:82` documents the omission), no bug screenshot. Both are optional in the
shared schemas, so nothing is broken — but a student photographing a bug on the device where it
happened is the natural flow. Needs the signed-upload flow, an image picker, and permissions on two
platforms. *Recommendation:* its own stage, after the §10 residue.

**Q6 — Course addressing.** ⬜ **open and now urgent.** Web routes by slug, mobile by id, and
notifications on mobile route by id (`app/(tabs)/notifications.tsx:94`). `slug` is already present on
`CourseSummary` and `CourseDetail` in the mobile types, so the change is routing-only — but every
stored deep link is invalidated the day it happens, and notification payloads are already in flight.
*Decide before the first store build.*

---

## 12. What this document does not cover

- **Teacher and admin tooling on mobile.** Out of scope, permanently.
- **Offline writes.** Reading offline works via the persisted query cache; a mutation queue is a
  different product.
- **API or database changes.** Everything above is client work against endpoints that already exist.
- **The web app's own drift** from `DESIGN.md` — the animation utilities, `hover-lift`, the violet
  notification badge, the ad-hoc `bg-card/80 border-hairline/40` styling in `dashboard/bugs/*` and
  `dashboard/payments/*`. Named here only where mobile would otherwise copy a mistake, or where the
  two apps now disagree (§4.4, the unread badge in §4.1); cleaning it up is separate work.
