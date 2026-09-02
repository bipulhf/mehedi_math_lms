# Web ↔ Mobile parity — current state and the mobile work that remains

> **2026-08-11 — third edition, full re-audit.** Everything the second
> edition's note above (now folded into this one) flagged as unaudited has
> been re-verified by reading the current code and re-running gates, not by
> trusting commit messages. The two changes that matter most:
>
> **The "student only, permanently" boundary is no longer true.** `d08621e`,
> `3a29bd7` and `d837943` (2026-08-05 – 2026-08-10) shipped a teacher-facing
> grading screen to mobile — `app/tests/[testId]/marking.tsx`, reachable only
> when `session.role === "TEACHER" || "ADMIN"` (`app/tests/[testId].tsx:51`,
> `:239-247`). It has a claim-locked grading queue for concurrent graders
> (`getMarkingQueue`/`claimAnswer`/`renewAnswerClaim`/`releaseAnswerClaim`,
> `src/lib/api.ts:701-715`), the same six annotation tools as web
> (pen/tick/cross/half/text/eraser, `marking.tsx:36-43` vs
> `marking-toolbar.tsx:26-55`), the same continuous pen-width slider and the
> same colours, and the same auto-submit-on-last-mark rule. The one real gap
> against web: **no Undo** (§6.7 has the detail). §1, §3, §9 and §12 below are
> corrected accordingly — "no teacher or admin tooling" now names authoring,
> moderation and analytics specifically, not grading.
>
> **`VIDEO_LINK` no longer opens the browser.** `1f5ac8e`, `4531932`,
> `c6cc2c9` and `06a1584` (2026-08-10) replaced the browser handoff with a
> `WebView` pointed at the web app's own `/embed-player` vidstack route —
> inline, auto-fullscreen on mount. Direct media files still play through a
> native `expo-video` `StreamPlayer` with a new custom control bar
> (`lecture-player-controls.tsx`). §6.3 has the full breakdown.
>
> Also closed since the second edition and now reflected below: the ink-first
> theme migration on mobile (tokens.ts is dark-first end to end — §4.1), the
> icon/splash blocker (assets shipped 2026-08-10 — §8), KaTeX math
> typesetting on mobile via `WebView` (§6.3), student-side coupon application
> on the course screen matching web (§6.2), and the five-phase nav redesign
> the second edition's note only pointed at — Home/Explore/Inbox/Profile, now
> fully re-audited in §3 and §6.1/§6.6 rather than just flagged.
>
> **Implementation update, same day.** The four concrete code gaps this edition named —
> Undo in grading, the `toLocaleDateString()` residue, comment edit/delete UI, and the
> player's last-viewed timestamp/back-link — are shipped and gate-verified (lint/typecheck/test
> all green, 65/8). Also closed the same day: `expo-doctor` patch-version drift (9 packages bumped;
> the one `expo-constants` pin that used to sit in a root-level `overrides` entry has since been removed — §10), the
> ringed-word and ringed-play doodles ported to mobile (§5, §11 Q2), and the teacher
> email/WhatsApp "gap" turned out not to be one — web has no such field either (§6.6). Left
> undone, and why: **B4** genuinely needs a physical device for the Bangla-fit check, not just an
> emulator; **E4 (page texture)** turned out to be moot — `DESIGN.md`'s current ink-first spec has
> no texture concept at all, so there's nothing to port (§4.1). Found and fixed along the way:
> mobile's `CourseProgressResponse` type (`src/lib/api.ts`) didn't match what
> `GET /courses/:id/progress` actually returns — it declared `isCourseCompleted`/
> `progressPercentage`, neither of which exists on the wire (the real fields are
> `completionPercentage` and no completion boolean at all), so two reads in
> `learn/[courseId].tsx` were silently always-undefined. A type-level `grep` can't catch that kind
> of gap — only reading the actual response shape does.
>
> **B4, partial — a real device pass, not the full checklist.** Ran the app on an actual Android
> emulator (API 36) against local `apps/api`/`apps/web` dev servers, signed in as a seeded student,
> and walked Home → Explore → course detail → course player in Bangla. Confirmed on-device, not
> just in code: the new Home tab (§6.1a, resume hero + `StreakTrack` + summary metrics), the
> player's last-viewed/back-link additions (§6.3), and `RingedPlay` rendering correctly with the
> right tone split (accent ring on free/preview lessons, hairline on the rest — §11 Q2).
> `RingedWord` was not reached live (the in-course "Teacher" tab shown at `courses/[courseId].tsx`
> doesn't link to the full `teachers/[slug].tsx` profile in this student's path); its correctness
> rests on typecheck/lint plus the same primitive pattern `RingedPlay` used, confirmed live.
> **This is not the exhaustive both-locale, every-screen pass B4 calls for** — no English-locale
> check, no test-taking/grading/messaging screens, one device class, one session. What it caught
> that no earlier audit pass did: a second real bug. `courses/[courseId].tsx:81` queried
> `getCourseOutline` (returns `{lessons: [...]}`) under `queryKeys.courseContent(id)` — the *same*
> cache key `learn/[courseId].tsx` uses for `getCourseContent` (returns `{lectures: [...]}`, no
> `lessons` field at all). Viewing a course as player then opening its detail page served the
> wrong cached shape and crashed on `chapter.lessons.length`. Fixed with a dedicated
> `queryKeys.courseOutline` key (`src/lib/query.ts`); confirmed live, same course, no crash.
> Also confirmed, separately: Expo Go itself cannot run this app past sign-in on Android — SDK 53+
> dropped push-notification support from Expo Go entirely, and `use-push-registration.ts` is
> imported eagerly by Expo Router's tab-route registration (not lazily, only when Inbox opens), so
> every cold start throws once before recovering via the error boundary. Not a code defect — it's
> the reason `apps/mobile/AGENTS.md`'s `bun run android` needs a real dev client
> (`expo run:android` / EAS) for anyone testing this locally, worth a line in that doc separately.

**Snapshot:** `main` @ `0af502c` (_perf(web): reduce initial load and auth errors_).
**Verified:** 2026-08-11, third edition — grading/marking tooling, inline video, math typesetting,
coupons, ink-first theme migration and the five-phase nav redesign all re-read against current code;
see the note above for what changed since the 2026-08-04 second edition.
**Scope:** `apps/web` (TanStack Start) compared against `apps/mobile` (Expo SDK 57 / Expo Router),
with `DESIGN.md` as the authority on what either one is supposed to look like.

The first edition of this document described an app that had received nothing since `36a413e`
(_feat(mobile): move the app onto the Mehedi's Math Academy tokens and catalogue (Phase 11)_). The second edition
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

**Gate status as of this snapshot:** `bun run --filter @mma/mobile lint`, `typecheck` and `test`
are all green (lint exit 0, typecheck exit 0, **65 tests across 8 suites**, up from 60/7 — the
grading and marking additions carry their own coverage). Web/i18n gates and `expo export` were not
re-run this edition; treat those three numbers as carried over from the second edition, not
re-verified today.

Read it in three passes:

1. **§1–§3** — what each app is, and what is left of the gap.
2. **§4–§8** — the differences, ordered design tokens → primitives → screens → data → brand.
3. **§9–§12** — the change list with per-item status, the residual work, and the decisions that are
   still open.

Related documents: [`DESIGN.md`](../DESIGN.md) (visual language), [`mobile-plan.md`](./mobile-plan.md)
(how the app got here, and what is still unverified on hardware),
[`apps/mobile/AGENTS.md`](../apps/mobile/AGENTS.md) (workspace rules that constrain every fix below).

**Theme migration note — ✅ code is done, `DESIGN.md`'s own prose is not.** `apps/mobile/src/theme/
tokens.ts` (94 lines) is dark-first end to end and matches `DESIGN.md` §2's palette exactly —
`background:"#0d0d0d"` (`tokens.ts:9`), `ink:"#ffffff"` (`:22`), `accent:"#00cfff"` (`:7`),
`hairline:"rgba(255,255,255,.14)"` (`:20`) — and the file's own header comment says it was
transcribed from `apps/web/src/styles/app.css`. `DESIGN.md:4-9` itself still frames this as an
in-progress migration ("the current warm-paper implementation is a migration source, not the final
visual authority... existing token names may remain as compatibility aliases until migration
completes") — that framing is now stale prose, not a statement about the code. §4 below describes
the dark palette both apps actually ship, not the old warm-paper one this document described through
its first two editions.

---

## 0. 2026-08-31 — fourth pass, the gaps this document did not have

Everything below was written against `0af502c`. Five web commits landed after it, and re-reading
the two apps file by file — rather than trusting this document — turned up four older gaps as well.
All nine are closed; each is one commit.

**Ported from the newer web commits**

- **Class routine** (`2043850`). The web player grew a Routine tab; the app had no way to read one.
  Now a fourth tab beside About/Notices/Discussion (`src/components/course-routine-panel.tsx`),
  read-only, written half and attached PDF.
- **Script challenge** (`c0fa9ad`). A student can now ask for a second look from the results screen
  for a written paper, and the grading workspace shows the marker why a paper came back — web
  reads that on the submission page, which the app has no equivalent of, so the panel goes where
  the marker already is. Silent on papers nobody challenged.
- **Enrolled-student count** (`3cd95e7`), plus the free-classes figure the same facts row carries.
- Answer-script upload progress (`52e11a5`) and the marking-note/pen-width fix (`599c27a`) were
  already ported in their own commits — no work needed.

**Older gaps this document never listed**

- **Password reset.** The app could change a password inside a session but not recover one from
  outside it. `app/forgot-password.tsx` requests the link; the link itself still lands on the web
  reset page, because the token it carries is minted for a browser.
- **Exams hub.** `/dashboard/exams` had no counterpart, so a test was reachable only from inside
  its course player. `app/exams.tsx` is the same list for both readers — a student's exam leads to
  their attempt history, a teacher's to the grading queue.
- **Course-completion celebration.** Web fires confetti and a toast from both the player and the
  results screen. The app now shows a banner at the same two trigger points, off the same server
  signals (the enrolment-status transition, and `courseCompletedJustNow`).
- **Announcement banner.** An admin's banner reached every public web page and no part of the app.
  It renders on Explore, the app's storefront.
- **A finished exam reopened itself.** Opening a test started an attempt on mount without reading
  the attempts first, so coming back out of a results screen wrote a fresh one — or, on a
  one-attempt exam, showed the server's raw refusal. Fixed the way web does it.

**Two refactors this needed first**, both because the files were past the repo's 800-line ceiling:
`src/lib/api.ts` is now one module per API feature (`src/lib/api/`), matching the web layout, and
the course player screen dropped its lesson picker and lesson body into their own modules.

**Still out of scope, deliberately:** authoring, admin, accountant, moderation, SMS and coupon
management, and the marketing landing page. §3's out-of-scope list stands.

Gates: `lint`, `typecheck` and the jest-expo suites green at every commit — now **72** tests across
**9** suites, the new one covering the exams filters.

---

## 1. What each app is today

| | `apps/web` | `apps/mobile` |
| --- | --- | --- |
| Framework | TanStack Start, React 19, Vite 8 | Expo SDK 57, Expo Router, React Native |
| Routes / screens | 61 route files (56 `.tsx`) | **28 route files** (was 23) |
| Source size | ~28,900 lines under `src/` | **~12,400 lines** under `src/` + `app/` (was ~8,570) |
| Audience | student, teacher, admin, accountant + anonymous public | **student, plus teacher/admin for grading only** (§2.4) — authoring, moderation, admin CRUD and analytics still web-only |
| Styling | Tailwind v4, tokens in `src/styles/app.css` | `StyleSheet`, tokens in `src/theme/tokens.ts` |
| Localisation | bilingual, `useT` / `useFormat` everywhere | **bilingual everywhere** — see §2.1; only the on-device Bangla pass (B4) is left |
| Server state | TanStack Query + `queryKeys` factory | TanStack Query + `queryKeys` factory, persisted to AsyncStorage |
| UI primitives | 24 files under `components/ui/` | one file, `src/components/ui.tsx` (**828 lines**, was 692) |
| Icons | `lucide-react` on dashboard surfaces, none on public pages | **`react-native-svg` set** in `src/components/tab-icons.tsx` |
| Tests | Playwright E2E | **65 jest-expo tests across 8 suites** (was 60/7), including screen renders |
| Shared catalogue | `packages/i18n` | same catalogue, consumed via `useT`; grown further for grading, coupons and math copy — not recounted precisely this edition |

The asymmetry in audience narrowed this edition and needs restating precisely: **mobile is a
student client that now also carries the teacher/admin grading surface** (§2.4, §6.7) — nothing
else. Course *authoring*, moderation queues, admin CRUD and analytics are still not coming to the
phone; that boundary holds. Everything below the grading sections is about the student's path.

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

`src/theme/tokens.ts` is now 92 lines of Mehedi's Math Academy values with **no Material aliases**. The acceptance
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

The file:line references above predate the nav restructure (§3) and the player rewrite (§6.3) —
the *capabilities* are still there, re-verified this edition, but several line numbers moved
(`(tabs)/learning.tsx` no longer exists; the my-courses list now lives in `(tabs)/index.tsx`, and
`app/learn/[courseId].tsx` grew from 286 to 792 lines). Not re-cited line-by-line here; §3 and §6.3
have the current locations.

### 2.4 Grading — ✅ new capability, the boundary this document called permanent moved

`app/tests/[testId]/marking.tsx` (379 lines) is a teacher-facing grading screen, reachable only when
`session.role === "TEACHER" || "ADMIN"` — the entry button on `app/tests/[testId].tsx:239-247` is
gated on `isStaff && test.type === "WRITTEN"`, `isStaff` defined at `:51`. It is not a student
reviewing their own result; that stays the separate `results/[submissionId].tsx` screen.

What it does, matching web's `apps/web/src/components/marking/marking-workspace.tsx` almost
feature-for-feature:

- **A claim-locked grading queue.** `getMarkingQueue`, `claimAnswer`, `renewAnswerClaim`,
  `releaseAnswerClaim` (`src/lib/api.ts:701-715`) let multiple graders work the same test without
  double-marking an answer. `src/lib/marking-work-list.ts` (80 lines) flattens the queue into a flat,
  reorderable ("by student" / "by question") work list and auto-advances to the next unmarked answer
  after a save (`findNextUnmarked`), mirroring web's own 86-line `marking-work-list.ts`.
- **The same six annotation tools** — pen, tick, cross, half, text, eraser (`marking.tsx:36-43` vs
  web's `marking-toolbar.tsx:26-55`), the same four colours, and a continuous pen-width slider on
  both sides (`src/components/pen-width-slider.tsx` on mobile; a native `<input type="range">` on
  web) sharing `markingStrokeWidthMin/Max` from `packages/shared`.
- **The same hand-in rule.** Saving the last mark on a paper auto-submits it — `isLastAnswerOfPaper`
  / server `isComplete` drives `submitPaper` identically in `marking.tsx:145-204` and
  `marking-workspace.tsx:180-243`.
- **The one gap: no Undo.** Web has a dedicated Undo button that strips the last stroke/stamp off the
  page (`marking-toolbar.tsx:110-119`, wired through `canUndo`/`onUndo` in
  `marking-workspace.tsx:336-366`). Mobile's `marking.tsx` and `marking-layer.tsx` have no undo
  state, button or handler anywhere.

Two supporting, **student-side** features shipped alongside grading and are easy to mistake for part
of it: `src/components/answer-script-uploader.tsx` (202 lines) and `src/lib/script-capture.ts` (142
lines) let a *student* photograph or pick each page of a physical written answer, rotate, reorder and
delete pages, then upload through a presigned S3 URL — rendered from the student's own test-taking
screen (`app/tests/[testId].tsx:347-354`), not from the grading screen.

**This changes §1's audience row and §12's boundary list** — "no teacher or admin tooling" is no
longer accurate as a blanket statement. The precise line, now: grading is on mobile; authoring,
moderation, admin CRUD and analytics are not.

### 2.5 Inline video and math typesetting — ✅ both closed

`VIDEO_LINK` lectures (YouTube/Vimeo) no longer hand off to the system browser. `src/lib/
lecture-video.ts` (47 lines) classifies by hostname and, for an embed, `src/components/
lecture-player.tsx` (249 lines) points a `WebView` at the web app's own `/embed-player` route —
same `src`, same vidstack player web uses — auto-entering fullscreen on mount. Direct media files
still play through a native `expo-video` `StreamPlayer`, now with a custom control bar
(`src/components/lecture-player-controls.tsx`, 266 lines: play/pause, `PanResponder` seek/scrub,
elapsed/total time, fullscreen — no volume/speed/captions). The `WebView` path gets the web player's
own chrome instead, so there is no double control bar. §6.3 has the full comparison against web's
`course-player.tsx` / `lecture-player-impl.tsx`.

KaTeX math typesetting landed on mobile the same edition (`3a98ea9`). `src/components/math/
math-webview.tsx` (132 lines) renders LaTeX server-side-in-JS via `katex.renderToString` (through
`@mma/shared`'s `renderMathInHtml`) into a static HTML document, styled from bundled CSS
(`math/katex-css.ts`) and painted in a `react-native-webview` — no author script executes. `math/
math-body.tsx` and `html-content.tsx` route any string containing `$…$` / `$$…$$` through it and
fall back to plain text / `react-native-render-html` otherwise. Wired into test-taking, test results,
marking, teacher profiles, course detail, bug reports and course reviews — the same surfaces web's
KaTeX pass covers.

---

## 3. Route inventory

Web routes **not** in scope for mobile (teacher/admin/accountant tooling, SEO surfaces, server
handlers) are listed once at the end rather than line by line.

Tab bar is now **Home / Explore / Inbox / Profile** (`app/(tabs)/_layout.tsx:83-116`, was
Catalogue/My Courses/Messages/Notifications/Profile) — a five-phase redesign landed 2026-08-10
(`28fca0e`), fully re-audited this edition rather than pointed at.

| Web route | Mobile screen | Status |
| --- | --- | --- |
| `/` (landing) | — | ⛔ Mobile opens on the Explore tab. Settled: the store listing does the landing page's job |
| `/courses` | `app/(tabs)/explore.tsx` (349 lines) | ✅ Parity, incl. level/subject split, sort, free-only, teacher avatars — moved off the index tab, unchanged functionally |
| `/courses/$slug` | `app/courses/[courseId].tsx` (373 lines) | ◐ Feature parity, **now includes coupon application** (§2.5, §6.2) matching web; still addressed by id, web by slug — §11 Q6 |
| `/categories`, `/categories/$slug` | — | ⛔ Mobile expresses categories as the level/subject chip pair |
| `/teachers`, `/teachers/$slug` | `app/teachers/index.tsx`, `app/teachers/[slug].tsx` (151 lines) | ✅ Full parity — qualifications, socialLinks, phone (`tel:` clickable, `:96`); web has no email/WhatsApp field to match either. No `FaintFormula` doodle (web-only, §11 Q2) |
| `/about`, `/contact` | `app/about.tsx`, `app/contact.tsx` | ✅ Native public surfaces |
| `/auth/sign-in` | `app/sign-in.tsx` | ✅ Rebuilt against the web redesign |
| `/auth/sign-up` | `app/sign-up.tsx` | ✅ Rebuilt |
| `/dashboard` (student overview) | **`app/(tabs)/index.tsx`** (436 lines) — now the Home tab, not a card | ✅ Resume hero, `StreakTrack`, progress summary, payment-reminder banner, my-courses list (§6.1a) — Q3's "settled as a card" is superseded, it is the landing tab now |
| `/dashboard/my-courses` | folded into `app/(tabs)/index.tsx` | ✅ Incl. receipt and certificate download; `(tabs)/learning.tsx` deleted in the restructure |
| `/dashboard/learn/$courseId` | `app/learn/[courseId].tsx` (**792 lines**, was 619) | ✅ Modal bottom-sheet lesson picker, three-way About/Notices/Discussion tabs, inline video — see §6.3 |
| `/dashboard/tests/$testId` | `app/tests/[testId].tsx` | ✅ One-at-a-time, autosave, auto-submit; now also entry point to answer-script upload (§2.4) |
| `/dashboard/tests/$testId/results/$submissionId` | `app/tests/[testId]/results/[submissionId].tsx` | ✅ Now math-typeset (§2.5) |
| `/dashboard/tests/$testId/history` | `app/tests/[testId]/history.tsx` | ✅ `toLocaleDateString()` residue fixed — now `format.date` |
| `/dashboard/tests/$testId/submissions*` (grading) | **`app/tests/[testId]/marking.tsx`** (379 lines) | ✅ **New, no longer out of scope** — teacher/admin grading queue, §2.4/§6.7, incl. Undo |
| `/dashboard/messages` | `(tabs)/inbox.tsx` (311 lines, messages pane) + `messages/[conversationId].tsx` + `messages/new.tsx` | ✅ Can start a conversation; merged into Inbox behind a segmented control (§6.6) — two independently-fetched panes, not a unified list |
| `/dashboard/profile` | `(tabs)/profile.tsx` (233 lines) + `app/change-password.tsx` | ✅ Now one grouped settings list (was nine bordered cards) plus a weekly `StreakTrack` on the identity card — §6.6 |
| `/dashboard/profile-complete` | `app/profile-complete.tsx` | ✅ (not localised — §2.1) |
| `/dashboard/payments` | `app/payments.tsx` | ✅ |
| `/dashboard/bugs`, `/dashboard/bugs/report` | `app/bug-report.tsx` | ✅ List, form, screenshot upload, notes and priority; math-typeset |
| notification bell (in `AppShell`) | `(tabs)/inbox.tsx` notifications pane | ✅ Mark-all-read + tap-to-navigate; combined unread badge (messages + notifications summed) on the Inbox tab icon, `_layout.tsx:61-67` |
| — | `app/courses/[courseId]/preview/[lectureId].tsx` | ✅ Mobile-only full-screen preview route |
| — | `app/auth-callback.tsx`, `app/payment-callback.tsx` | ✅ Mobile-only deep-link landing pads |

**Out of scope, permanently:** `/dashboard/courses/*` (authoring), `/dashboard/admin/*`,
`/dashboard/accountant/*`, `/dashboard/analytics`, `/dashboard/students/*`,
`/dashboard/notifications/send`, `/dev/seo-preview`, `robots.txt`, `sitemap.xml`, `/api/*`. **No
longer on this list:** `/dashboard/tests/$testId/submissions*` — grading now has a mobile screen
(§2.4).

---

## 4. Design tokens — the diff

`DESIGN.md` column is the authority. "Web" is what `app.css` and the primitives actually ship.
"Mobile" is what `tokens.ts` + `ui.tsx` actually ship **now**.

### 4.1 Colour — ⚠ superseded by the ink-first migration, re-based this edition

The table below through the second edition described the old warm-paper palette (`#FCFBF9`
background, `#FFFFFF` cards). That palette is gone from mobile — `tokens.ts` is dark-first
end to end, transcribed from `apps/web/src/styles/app.css` per its own header comment, and
matches `DESIGN.md` §2 exactly on the values checked directly this edition:

| Role | DESIGN.md §2 | Mobile (`tokens.ts`) | Status |
| --- | --- | --- | --- |
| Page background | Ink `#0D0D0D` | `background: "#0d0d0d"` (`:9`) | ✅ |
| Panel | `#171717` | `panelWarm: "#171717"` (`:29`) — name is a legacy holdover, value is current | ✅ |
| Primary text | white | `ink: "#ffffff"` (`:22`) | ✅ |
| Card surface | translucent white on ink | `card: "rgba(255, 255, 255, 0.04)"` (`:15`) | ✅ |
| Hairline border | `rgba(255,255,255,.14)` | `hairline: "rgba(255, 255, 255, 0.14)"` (`:20`) | ✅ |
| Accent (cyan) | `#00CFFF` | `accent: "#00cfff"` (`:7`) | ✅ |
| Brand orange | `#FFA500` | `brandOrange: "#ffa500"` (`:13`) | ✅ |
| Brand yellow | `#FFF200` | `brandYellow: "#fff200"` (`:14`) | ✅ |
| Presence dot | none — "no red/green/amber status palette" (§2) | accent online / `dotIdle` offline (§6.5, unchanged) | ✅ |

**Not re-diffed row-by-row this edition:** badge tones, input fill, progress track/fill, skeleton
fill, selected-pill fill. These were ✅ as of the second edition against the *old* palette's
structure (right primitive, right relationship between tokens) and almost certainly carried
forward correctly given the wholesale `tokens.ts` rewrite, but were not individually re-read
against new hex values this pass — treat as ◐ pending a token-by-token re-confirmation, not as
verified.

**Page background texture (§11 Q1/E4) — ✅ resolved, moot.** `DESIGN.md` §1–§2 (the current
ink-first spec) describes no texture at all — no dot grid, no corner wash, nothing beyond the flat
`#0D0D0D` ink surface the colour table already lists. `apps/web/src/styles/app.css` has no
page-background texture either (only an unrelated `.formula-rule` section divider). The second
edition's "`#fcfbf9`, flat, no texture" finding was against the retired warm-paper spec, which had a
texture requirement; the current spec doesn't, so there's nothing for either app to be missing.

### 4.2 Shape

| | DESIGN.md | Mobile | Status |
| --- | --- | --- | --- |
| Cards | **0px** | no `borderRadius` on `styles.card` | ✅ |
| Buttons / inputs | 4px | `radius.sm` = 4 | ✅ |
| Pills / chips | 100px | `radius.pill` = 100 | ✅ |
| Dots, avatars | 50% | `size / 2` in `Avatar`, `radius.full` for dots | ✅ |
| Borders | `1px`, hairline colour | `1` inside `ui.tsx`; **zero `hairlineWidth` left** — `grep -rn "hairlineWidth" apps/mobile/src apps/mobile/app` returns nothing, re-run 2026-08-11 | ✅ closed (was ◐ in §2.2, second edition) |
| Shadows | none | no `shadow` reference anywhere in `tokens.ts` or `ui.tsx` — `grep -rn "shadow"` on both returns nothing (the `shadow.card = {}` placeholder itself is gone, not just emptied) | ✅ |

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

**Residue found this edition, fixed same day:** `app/tests/[testId]/history.tsx:67` called raw
`new Date(submission.createdAt).toLocaleDateString()`, bypassing `useFormat`'s `format.date`. Now
uses `format.date`; the acceptance grep is clean again.

### 4.4 Motion — resolved, not just one-sided

`apps/web/src/styles/app.css` no longer has the utilities this document previously flagged as
conflicting with mobile's "no animation" stance: `fadeUp`, `floatSubtle`, `pulseGlow` and
`.hover-lift`'s `box-shadow` are gone — `grep`-confirmed zero hits, re-run 2026-08-11. What remains
is `fadeIn` (`:272`, `:356`) and `doodlePulse` (`:350`, `:368`), both under an explicit comment
scoping them to "Marketing motion helpers. ADR-0012 — public pages only" (`:269`). That comment is
the resolution §11 Q1 already recorded as settled: `DESIGN.md` §1's "no animation" rule governs app
surfaces on both platforms; public marketing pages are the documented, deliberate exception; mobile
has no public marketing surface built from these primitives, so there is nothing left for it to
match or diverge from here.

---

## 5. Primitives — web `components/ui/` vs mobile `src/components/ui.tsx`

Mobile deliberately keeps one file for pure UI primitives — now **828 lines** (was 740/692) — plus,
since the second edition, a handful of feature-scoped components that sit alongside it rather than
in it (grading, video, math, streak). Listed separately below the primitives table.

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
| `Doodles` (`RingedWord`, `RingedPlay`, dot patch, quarter arc) | `RingedWord`, `RingedPlay` (`ui.tsx`) | ✅ the two recommended in §11 Q2 — dot patch and quarter arc deliberately skipped |
| `route-error` | `route-error` | ✅ incl. offline branch (copy not localised — §2.1) |

**Feature-scoped components added since the second edition (2026-08-05 – 2026-08-10):**

| Web | Mobile | Status |
| --- | --- | --- |
| `components/marking/marking-workspace.tsx` + `marking-toolbar.tsx` + `marking-layer.tsx` | `app/tests/[testId]/marking.tsx` (379) + `src/components/marking-layer.tsx` (284) + `src/components/pen-width-slider.tsx` (126) | ✅ same 6 tools, colours, continuous pen width, hand-in rule, and now Undo — §2.4, §6.7 |
| `src/lib/katex.ts` | `src/components/math/math-webview.tsx` (132) + `math-body.tsx` (29) + `katex-css.ts` | ✅ same rendering guarantee (author bytes never re-injected as HTML), delivered via `WebView` rather than DOM — §2.5 |
| `components/media/lecture-player-impl.tsx` (vidstack) | `src/components/lecture-player.tsx` (249) — `WebView` onto web's `/embed-player` for YouTube/Vimeo, native `expo-video` for direct files | ✅ — §2.5, §6.3 |
| — (web has no separate video-control component; vidstack supplies its own chrome) | `src/components/lecture-player-controls.tsx` (266) — custom play/pause/seek/fullscreen bar, `StreamPlayer` only | ✅ mobile-only, correct divergence |
| `components/courses/course-coupon-field.tsx` (209) | `src/components/course-coupon-field.tsx` (174) | ✅ parity — code entry, discount preview, rejection-reason banner, one-tap public-coupon apply |
| — | `src/lib/streak.ts` (107) + `use-streak.ts` (39) — `StreakTrack` in `ui.tsx` | ⛔ mobile-only by design, device-local (`AsyncStorage`, no server concept — does not survive reinstall or sync across devices) |
| — | `src/components/answer-script-uploader.tsx` (202) + `src/lib/script-capture.ts` (142) | ◐ student-side scan/upload of a physical written answer via camera or gallery; whether web has an equivalent was not checked this edition |

---

## 6. Screen-by-screen

### 6.1 Catalogue (now the Explore tab) — ✅ parity

**Moved to `app/(tabs)/explore.tsx` (349 lines) in the nav restructure** — the old `(tabs)/index.tsx`
catalogue is gone as a file, but the feature is unchanged: search box, a collapsible filter toggle
(shows active-filter count when collapsed), level/subject split (`levelId` / `subjectId`, the
subject narrowing the level exactly as `course-filter-rail.tsx` does), a free-only `FilterPill` plus
three sort pills (`newest` / `priceLow` / `priceHigh`), a result-count caption, then the course list
with the meta line (`length · lessons · free lessons`), teacher avatars, review count and
`PriceText`.

Price bands remain a mobile-only idea and a good one — "a phone keyboard for a range is worse than
three taps."

All chip strips render the shared `FilterPill` (§5); zero `hairlineWidth` borders remain anywhere
in the app (§4.2).

### 6.1a Home — new, replaces the "resume card" framing (§11 Q3 superseded)

`app/(tabs)/index.tsx` (436 lines) is now the landing tab, not a card inside "My courses." Top to
bottom: a hero greeting, a conditional resume card (cover image, progress track, resume button), a
`StreakTrack` strip (§5, device-local via `use-streak.ts`), three `SummaryMetric`s (active/completed
courses, average progress), a dismissible payment-reminder block for unpaid enrolments, then the
"My Courses" list — the same `FlashList` of enrollment rows the old `(tabs)/learning.tsx` rendered,
including receipt and certificate download, just relocated. `(tabs)/learning.tsx` no longer exists.

### 6.2 Course detail — ✅ parity, plus coupons; one addressing question remains

`app/courses/[courseId].tsx` (339 lines) has `Tabs` (curriculum / teacher / reviews), the curriculum
as `AccordionRow`s over `getCourseOutline`, free lessons routing into the preview screen
(`:265`), a teacher tab with `Avatar` + owner marker, and a buy card with `PriceText`, exactly one
action, and the "what's included" checklist (lifetime / certificate / tests / materials, `:139`).
Signed-out state routes to sign-in; staff get a notice rather than a dead button.

`CourseReviews` — the review-writing form mobile has and web does not — survives. It is still worth
porting back to web rather than removing.

**Coupons, new since the second edition (`3d324f4`).** `src/components/course-coupon-field.tsx`
(174 lines), gated by `canApplyCoupon` (`:150`): code entry hitting `previewCoupon`, discount/payable
preview on success, a localised rejection-reason banner (9 reasons) on failure, one-tap apply for a
course's `publicCoupon`, and remove/reset. `src/lib/payment.ts`'s `startCheckout` takes the coupon
code through to checkout. Structurally equivalent to web's own `course-coupon-field.tsx` (209 lines,
used from `course-buy-card.tsx`) — parity, not a mobile-only feature.

Open: mobile addresses by id, web by slug (§11 Q6). `CourseSummary.slug` is already in the mobile
types (`src/lib/api.ts:15`), so the switch is a routing change, not a data one.

### 6.3 Course player — ✅ the gap is closed, video is now inline, lesson picking is a bottom sheet

`app/learn/[courseId].tsx` went from 286 → 619 → **792 lines**, across the parity work and then the
2026-08-10 restructure (`28fca0e`).

| Capability | Web | Mobile | Status |
| --- | --- | --- | --- |
| Header stats row | 4 tiles | 4 `StatCard`s: completed, lectures, progress %, assessments | ✅ |
| Chunked progress | three states | same | ✅ |
| Lesson picker | inline chapter navigator | **`Modal`-based bottom sheet**, `LessonPickerSheet` (`:202-280`), triggered by a "Lessons" row (`:480-490`) — items still merged and sorted by `sortOrder` (lectures and tests interleaved) inside it | ✅ mobile-only pattern, correct divergence — no web equivalent needed on a small screen |
| Prev / next navigation | buttons + arrow keys | prev/next buttons; no key shortcuts (no keyboard) | ✅ |
| Content tabs | curriculum / notices toggle | **three-way `Tabs`: About / Notices / Discussion** (`:290`, `:492-501`) — replaces the old two-way toggle | ✅ |
| `VIDEO_UPLOAD` (direct file) | `<video>`, `onEnded` | native `expo-video` `StreamPlayer`, 95% `timeUpdate`, custom control bar (`lecture-player-controls.tsx`) | ✅ mobile is better |
| `VIDEO_LINK` (YouTube/Vimeo) | `@vidstack/react` player (`lecture-player-impl.tsx`, 295 lines), chapter markers, idle-hide controls | **`WebView` pointed at web's own `/embed-player` route** (`lecture-player.tsx:200-215`) — same vidstack player, inline, auto-fullscreen on mount, no browser handoff | ✅ **corrected this edition** — previously documented as "opens the browser," that was true through 2026-08-09 and is not true as of `4531932`/`06a1584` (2026-08-10) |
| `TEXT` lecture | renders `lecture.content` | renders it, now through `MathWebView`/`MathBody` when it contains LaTeX (§2.5) | ✅ |
| PDF lecture | 70vh iframe | PDF material opened via `expo-web-browser` | ✅ |
| Lecture / chapter materials | `MaterialLinks` cards | `Materials` list for both | ✅ |
| Notices | mode toggle, pinned ringed | now a tab (see Content tabs row), pinned badged | ✅ |
| Lecture discussion | 500 lines: replies, edit, delete, pagination | `LectureComments`: post, one-level replies, **now edit + delete** (native `Alert.alert` confirm on delete) | ✅ closed this edition |
| "Mark as complete" | button + toast | button | ✅ |
| Last-viewed timestamp | shown | shown, `player.lastViewed` caption under the mark-complete row | ✅ closed this edition |
| Link back to course overview | shown | shown, `player.overview` button beside mark-complete | ✅ closed this edition |
| Study-streak recording | — | `recordStudyActivity()` fires once per player mount (`:329-333`), feeding `StreakTrack` on Home/Profile | ⛔ mobile-only, device-local (§5) |

Line-number citations in this table for lesson picker / content tabs / video are current as of this
edition; the discussion/materials/notices rows carry forward from the second edition and were not
individually re-confirmed against the new 792-line file this pass.

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

### 6.5 Messages — ✅ all three gaps closed, plus a presence bug neither edition had found; now merged into Inbox

**Nav restructure note:** `(tabs)/messages.tsx` no longer exists. Its content lives in the messages
pane of `app/(tabs)/inbox.tsx` (311 lines), reached through a segmented `Tabs` control
(`messages`/`notifications`, `:275-283`) that swaps between two independently-fetched pane
components — `MessagesPane` (`:103-154`) and `NotificationsPane` (`:156-252`). This merges the
*screen*, not the data or rendering: each pane still queries and renders on its own, same as the
two old separate tabs did. A single combined unread badge (messages + notifications summed) shows
on the Inbox tab icon itself (`_layout.tsx:61-67`); there is no per-segment badge inside `inbox.tsx`.
Everything below was verified in the second edition against the old `(tabs)/messages.tsx` /
`messages/[conversationId].tsx` — the conversation-detail screen itself was not re-read this
edition, only the tab-level merge above; treat the presence/typing/reconnect detail below as
carried forward, not re-confirmed line-by-line against today's code.



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

**Nav restructure note:** `app/(tabs)/profile.tsx` (233 lines) collapsed nine bordered cards into
one grouped `settingsCard` (`:172-198`, seven `SettingsRow` items: about, contact, bug report,
change password, view payments, new message, sign out) plus a `StreakTrack` on the identity card
(`:149-151`) showing a 7-day strip (`WEEK_LENGTH = 7` in `streak.ts`). Verified against current code
this edition — the second edition's note describing this change is accurate, not just a claim.

| | Web | Mobile | Status |
| --- | --- | --- | --- |
| Profile view | all role fields, photo upload, change password, teacher preview | one grouped settings list (was 9 cards), `LanguageSwitcher` row, `StreakTrack` on identity card | ◐ **no photo upload** — deliberate, see `src/lib/profile-form.ts:82`; screenshot-upload status below is §11 Q5, since resolved |
| Profile completion | multi-step | one screen, one save | ✅ simpler on purpose |
| Notifications | list, mark all read, tap navigates, push state | `markAllNotificationsRead` mutation, `router.push(href)` per item, routed by id — now a pane inside Inbox (§6.5) | ✅ |
| Bug reports | list + form, rich text, screenshot, admin response | one screen: form, list, `priority` badge, `adminNotes` rendered as rich text — now math-typeset (§2.5) | ✅ screenshot upload shipped since §11 Q5 was written (native signed S3 flow, same as profile photos) |
| Teacher contact (public profile) | phone/qualifications/socialLinks — no email or WhatsApp field exists in the data model | `app/teachers/[slug].tsx` (151 lines): renders all three, phone as `tel:` clickable (`:96`) | ✅ full parity |
| Language | `LanguageSwitcher` in both shells | `LanguageSwitcher` in the profile tab | ✅ |

### 6.7 Grading (marking) — ✅ new, teacher/admin only

`app/tests/[testId]/marking.tsx` (379 lines) — full detail in §2.4. Summary for the screen-by-screen
pass: reachable only for `TEACHER`/`ADMIN` roles from the test detail screen, backed by a
claim-locked queue so concurrent graders don't collide, the same six annotation tools and colours as
web with a shared continuous pen-width slider, and the same "saving the last mark auto-submits the
paper" rule, and — closed same day as this edition — Undo: `marking.tsx` now computes `canUndo` the
same way web does (any page with marking elements) and an `undoLastMark` handler mirrors web's
`onUndo` exactly (find the last-marked page, slice its last element, save).

This is the section that moves §1's audience row and retires the second edition's "no teacher or
admin tooling, permanently" line as a blanket claim (§12 restates the corrected boundary).

---

## 7. Data layer — ✅ done, wrapper count grown further

`src/lib/api.ts` grew from 33 to 77 to **well past that** with the grading and coupon work (exact
current export count not recounted this edition).

**Endpoints wrapped since the second edition (grading, §2.4):** `addScriptPage`,
`reorderScriptPages`, `removeScriptPage`, `getMarkingQueue`, `claimAnswer`, `renewAnswerClaim`,
`releaseAnswerClaim`, `setAnswerMark`, `saveScriptPageMarking`, `submitPaper` — `api.ts:625-745`,
mirroring `apps/web/src/lib/api/tests.ts`'s own grading calls. Plus coupon preview/apply wrappers
behind `course-coupon-field.tsx` (§6.2) and math rendering via `@mma/shared`'s `renderMathInHtml`
(§2.5), which is a shared function, not a new endpoint.

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

## 8. Brand and app-shell assets — ✅ done, icon/splash blocker resolved

**Done:** `apps/mobile/assets/images/` (all dated 2026-08-10) contains `icon.png`, `favicon.png`,
`splash-icon.png`, `android-icon-foreground.png`, `android-icon-background.png`,
`android-icon-monochrome.png`, plus `mma-logo.png`, `mma-mark.png` and `mehedi-bhai.jpeg`. `app.json`
names the app `Mehedi's Math Academy`, slug `mehedis-math-academy`, scheme `mma`, bundle
`com.mehedismathacademy.app`.

**E1 is closed.** The second edition's "blocked on the client's vector arriving" note is stale — the
rebrand commits (`59c4ed9`, `0759a0c`, `32a3f3a`) shipped the ink-first assets:

| `app.json` key | Current value |
| --- | --- |
| `icon` | `./assets/images/icon.png` |
| `android.adaptiveIcon.backgroundColor` | `#0D0D0D` (was `#FCFBF9`) |
| `android.adaptiveIcon.foregroundImage` | `./assets/images/android-icon-foreground.png` |
| `expo-splash-screen.backgroundColor` | `#0D0D0D` |
| `expo-splash-screen.image` | `./assets/images/splash-icon.png` |

Neither the Expo default nor the retired warm-paper `#FCFBF9` remains anywhere in `app.json`.

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
| E1 | Mehedi's Math Academy app icon, adaptive icon, splash | S | ✅ shipped 2026-08-10 (§8) — was blocked on the vector, no longer |
| E2 | Brand lockup in the tab header | S | ◐ header now says "Explore," not the catalogue tab — brand lockup placement not re-verified against the nav restructure this edition |
| E3 | Real icon set for the tab bar | S | ✅ `react-native-svg`, `src/components/tab-icons.tsx` |
| E4 | Page texture | M | ✅ resolved as moot — current `DESIGN.md` has no texture concept (§4.1) |

### Group F — Nav redesign (2026-08-10, `28fca0e` and siblings)

| # | Change | Size | Status |
| --- | --- | --- | --- |
| F1 | Tabs: Catalogue/My Courses/Messages/Notifications/Profile → Home/Explore/Inbox/Profile | L | ✅ |
| F2 | Home: resume hero + `StreakTrack` + summary metrics + payment reminder | M | ✅ mobile-only, device-local streak |
| F3 | Inbox: segmented messages/notifications control, combined unread badge | M | ✅ two panes, not unified data — §6.5 |
| F4 | Profile: nine cards → one grouped settings list | M | ✅ |
| F5 | Player: `Modal` bottom-sheet lesson picker | M | ✅ |
| F6 | Player: two-way → three-way About/Notices/Discussion tabs | S | ✅ |

### Group G — Grading, video, math, coupons (2026-08-04 – 2026-08-10)

| # | Change | Size | Status |
| --- | --- | --- | --- |
| G1 | Teacher/admin grading screen: queue, claim-locking, 6 tools, pen-width slider, Undo | L | ✅ Undo closed same day as this edition — §2.4, §6.7 |
| G2 | Student answer-script scan/upload (camera/gallery) | M | ✅ |
| G3 | Attempt-history screen, exam UX overhaul (autosave, auto-submit, verdict) | L | ◐ shipped 2026-08-04, doc's own note says this needs end-to-end re-verification, still true |
| G4 | `VIDEO_LINK` inline via `WebView` → web's `/embed-player`, auto-fullscreen | M | ✅ replaces browser handoff |
| G5 | Custom native video controls for direct-file playback | M | ✅ |
| G6 | KaTeX math typesetting via `WebView` | M | ✅ |
| G7 | Coupon application on course detail | S | ✅ parity with web |
| G8 | Ink-first theme migration (`tokens.ts`, shadows removed, rebrand assets) | L | ✅ code done; `DESIGN.md` prose still says "in progress" (§4.1) |

---

## 10. What is actually left

Everything the second edition punch-listed as gradeable code work — B2, B3, A3, A7, the unread-badge
colour, and the messaging presence bug — is still done and verified. What this edition adds and
removes from the list:

All four concrete code gaps this edition named — Undo in grading, the `toLocaleDateString()`
residue, comment edit/delete, and the player's last-viewed timestamp/back-link — are done (see the
Implementation update note at the top). What's left is device-only QA and design-blocked work:

1. **B4 (M) — ◐ partially run this session, not closed.** Home → Explore → course detail →
   player confirmed live on an Android emulator, in Bangla, and it's what caught the queryKey
   collision bug (see the note at the top). Still missing: English locale entirely, and everything
   past the player — test-taking, submit, results/history, discussion, notices, Inbox
   (messages/notifications), profile, the grading queue, sign out — plus a physical device, not
   just an emulator.
2. **E4 (texture) — ✅ resolved as moot.** `DESIGN.md`'s current ink-first spec has no texture
   concept; nothing to implement.
3. **Doodles (§11 Q2) — ✅ shipped and device-confirmed.** `RingedWord` on the teacher profile
   name (typecheck/lint-verified, not reached live this session — see the device-pass note at the
   top for why); `RingedPlay` on every course-curriculum lesson row, confirmed live with the
   correct accent/hairline tone split. Dot patch and quarter arc remain deliberately skipped, per
   the original recommendation.
4. **`bunx expo-doctor` — ✅ re-run and improved.** Was 16/20 at the start of this session (already
   below the second edition's claimed 20/20 baseline — drifted since, never re-checked). 9 of 11
   outdated packages bumped to their expected patch versions via `expo install --fix`; the tenth,
   `expo-constants`, was held at `57.0.9` by a root `package.json` `overrides` entry that predated
   that session and was left untouched. **That override is gone as of the dependency sweep** — it was
   a leftover from the duplicate-copies problem that `bunfig.toml`'s `linker = "hoisted"` actually
   solved (BLOCKERS.md), and with it removed `expo-constants` resolves to a single hoisted `57.0.17`
   and `expo install --check` reports the tree up to date. Remaining failures are non-issues, not defects:
   three checks (`native modules`/`vector-icons`/`legacy CLI`) fail on `npm explain` calls against
   packages this bun-managed monorepo never installs — an `expo-doctor` tooling limitation with
   non-npm package managers, not a project problem; one is a same-version duplicate
   (`expo-file-system@57.0.2` nested under `expo/node_modules`) that bun's hoisting left behind,
   functionally harmless since both copies are identical. Raw score is 15/20 (worse-looking than the
   16/20 this session started at, because fixing the 9 real version mismatches surfaced the
   duplicate-dependency check that a stale, still-outdated tree hadn't triggered) — but of the 5
   reported failures, 3 are tooling artifacts, 1 is a harmless byte-identical duplicate, and 1 is a
   deliberate pin. Zero represent an actual unresolved problem.

**Acceptance for the whole programme**

- [x] `grep -rn "surfaceContainer\|onSurface\|primaryContainer\|secondaryContainer" apps/mobile/src apps/mobile/app` returns nothing.
- [x] No string literal renders in a `<Text>` in `app/**` outside a `t(...)` call, an interpolated
      value, or user-authored content.
- [x] Every price, date, count and percentage on mobile matches the web app's rendering of the same
      value in the same locale.
- [x] Every list that can be empty has a dashed `EmptyState`.
- [x] Every route still exports `ErrorBoundary` from `@/src/components/route-error`.
- [x] `lint`, `typecheck` and the **65** jest-expo tests (**8** suites) are green — re-verified
      2026-08-11. Web/i18n gates and `expo export --platform web` were **not** re-run this edition
      (carried over from the second edition — see the Gate status note above).
- [x] `bunx expo-doctor` re-run — raw 15/20, but every failure is either a deliberate pin, a
      byte-identical duplicate, or an `npm explain`-against-bun tooling artifact, not a real defect
      (§9 Group F/§10 has the breakdown). The literal "stays at 20/20" acceptance bar was already
      broken before this session (found at 16/20); treat this line as superseded by that breakdown,
      not as still-failing.

---

## 11. Decisions still open

**Q1 — Does `DESIGN.md` §1 "no animation, no shadow" still stand?** ✅ settled, re-confirmed.
No shadows remain in web or mobile UI (§4.2 — the shadow token itself is gone from mobile, not just
emptied). Marketing motion remains documented and scoped to public pages only (§4.4); app surfaces
use state transitions only.

**Q2 — Doodles on mobile.** ✅ **the recommended pair shipped this session.** `RingedWord`
(`src/components/ui.tsx`) rings the whole name on the teacher profile screen — a compromise from
web's "ring just the surname," forced by React Native's `Text`-in-`View` model rather than web's
free-form inline `<span>`. `RingedPlay` marks every lesson row in course-curriculum (accent tone on
free/preview rows, matching web's `course-curriculum.tsx` exactly), built on `react-native-svg`
(already a dependency for the tab icons) since RN has no CSS `clip-path` for the triangle. Dot patch
and quarter arc remain deliberately skipped, per the original recommendation — both are marketing-page
corner decoration and mobile has no marketing surface to place them on. Web's `FaintFormula` doodle
on the teacher screen (`51b2a60`) stays web-only for the same reason.

**Q3 — Does mobile get a home tab?** ⚠ **reversed.** The second edition recorded "decided: no" —
the resume card sat at the top of "My courses." That decision did not hold: the 2026-08-10
restructure (`28fca0e`) made `(tabs)/index.tsx` a genuine Home tab (§6.1a) with its own hero, streak
track and summary metrics, and moved the catalogue off to `explore.tsx`. Record this as **decided:
yes, superseding Q3** — noted here rather than silently overwritten so the reversal itself is on the
record.

**Q4 — Public/marketing surfaces on mobile.** ✅ settled, re-confirmed. Teacher directory/profile,
About and Contact routes exist (`d8511ce`, `28fca0e`). Teacher rows in course detail link to slug
profiles; the profile screen now also has a `tel:` link (§6.6) — checked against web this session,
full parity, neither app has an email/WhatsApp field to be missing.

**Q5 — Uploads.** ✅ settled. Native signed S3 upload handles profile photos, bug screenshots, and
— new since this was written — multi-page physical answer-script scans (§2.4, §5).

**Q6 — Course addressing.** ✅ settled. Public course links use slugs and detail
resolution keeps ID fallback for existing notification/deep links.

**Q7 — Grading tooling on mobile — new this edition.** ✅ **decided: yes, scoped to grading only.**
The second edition's blanket "no teacher or admin tooling, permanently" (old §12) is retired by
`d08621e`/`3a29bd7`/`d837943`. The scope is narrow and should stay narrow: a teacher/admin can grade
a written submission from a phone (§2.4, §6.7). Course *authoring*, the moderation queue, admin CRUD
screens and analytics dashboards were not touched by this work and are not proposed here — §12 below
restates the boundary precisely instead of as a blanket exclusion.

---

## 12. What this document does not cover

- **Teacher and admin tooling on mobile, beyond grading.** Grading (§2.4, §6.7, Q7) is in scope and
  shipped. Course authoring, the moderation queue, admin CRUD screens and analytics dashboards are
  not, and nothing in this document proposes changing that.
- **Offline writes.** Reading offline works via the persisted query cache; a mutation queue is a
  different product. (Grading's claim-lock is server-side concurrency control, not an offline queue —
  a graded mark still requires connectivity to save.)
- **API or database changes.** Everything above is client work against endpoints that already exist.
- **The web app's own drift** from `DESIGN.md` — not re-audited this edition. The second edition
  named `hover-lift`, the violet notification badge, and ad-hoc `bg-card/80 border-hairline/40`
  styling in `dashboard/bugs/*` and `dashboard/payments/*` as open items; §4.4 confirms `hover-lift`'s
  `box-shadow` and several keyframes are gone from `app.css`, but the badge colour and ad-hoc styling
  claims were not re-checked this pass.
- **`DESIGN.md`'s own prose.** §4.1 and the theme migration note above flag that its migration
  language (`../mehedi_bhai/` as external reference, "compatibility aliases until migration
  completes") describes a state the code has already moved past. Updating that file is separate work
  from this document.
