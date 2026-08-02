# Mobile plan — from "it compiles" to "it ships"

The Expo app was built in `e0e8b34` and extended during the 3 August drift sweep. Everything in it
typechecks, lints, and bundles. **None of it has ever run.** This plan is the sequence from that state to
a build you would hand to a student.

Scope is `apps/mobile` only. Where a stage needs an API or web change, it is named and kept small; nothing
here reorganises the backend.

**Ordering principle: prove it runs, close the hole where money can go missing, then buy the right to
change things (tests), then close the three deliberate boundaries, then parity, then release.** Stages 0–2
are not optional and not parallelisable. Stages 4–7 are independent of each other and can be reordered or
dropped by product judgement without leaving anything inconsistent.

---

## What is actually true today

Verified, not assumed:

| Claim                                                                                                          | Evidence                                                                       |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Typechecks and lints                                                                                           | `bun run --filter @mma/mobile typecheck`, `lint`                               |
| Expo config is sound                                                                                           | `bunx expo-doctor` — 20/20                                                     |
| The module graph bundles                                                                                       | `bunx expo export --platform android` — 4.1MB Hermes bytecode, 33 assets       |
| The six registered font files reach the bundle                                                                 | asset manifest lists exactly `Inter_{400,500,600}` and `Manrope_{600,700,800}` |
| 12 screens, 2 layouts and an 11-module `src/` exist                                                            | `apps/mobile/app`, `apps/mobile/src`                                           |
| 24 typed API functions cover catalogue, enrolment, content, progress, tests, messaging, notifications, profile | `src/lib/api.ts`                                                               |

Not verified, and not implied by any of the above:

- **Nothing has executed.** No simulator, no device, no `expo start`. A screen that throws on mount passes
  every check in that table.
- **No tests.** `apps/mobile` has no `test` script and no test files. Only `@mma/api` and `@mma/shared`
  have one, so `bun run test` says nothing about this workspace either way.
- **No native build.** EAS has never run. `bunfig.toml`'s hoisted linker only matters at that step, which
  is exactly why it has never been exercised.
- **Google sign-in is unexercised.** The handoff is reasoned from the Better Auth source, not observed.
  (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` _are_ set in the root `.env`, so this is testable today.)

---

## Stage 0 — run it once

**Why first:** every later stage is guesswork until something renders. This stage exists to convert a pile
of green checks into evidence.

- Start the API (`bun run --filter @mma/api dev`) and the web app (`bun run --filter @mma/web dev`) —
  mobile needs both: the API for data, the web origin for Better Auth.
- `bun run --filter @mma/mobile start`, then open on one Android emulator and one physical device. The
  emulator matters because `src/lib/env.ts` has a `10.0.2.2` branch that only it exercises; the device
  matters because `inferDevHost()` is the branch a real handset takes.
- Walk the whole signed-in path once, in order, and write down what breaks:
  catalogue → course detail → enrol on a **free** course → player → mark a lecture complete → a test →
  submit → notifications → profile → sign out.
- Check the two things that are invisible in code review: that the type scale is Manrope/Inter rather
  than Roboto, and that `ScreenSkeleton` shows on a cold launch rather than a blank frame.

**Done when:** the walkthrough completes on both targets and every defect found is either fixed or filed.
Until this is done, treat every "✅" about mobile in `PLAN.md` as untested.

---

## Stage 1 — close the payment return loop

**Why second, and why it is a correctness bug rather than a polish item:** a priced-course enrolment on
mobile opens the gateway in a browser and then loses the thread.

`app/courses/[courseId].tsx:67` calls `WebBrowser.openBrowserAsync(result.payment.gatewayUrl)` and never
passes `callbackOrigin`, even though `createEnrollment` in `src/lib/api.ts:227` accepts one. So
`commerce-service.ts:198` falls back to `env.APP_URL`, and `commerce-service.ts:453` redirects the browser
to `<web>/dashboard/payments/return?...`. The student pays, lands on the **web** dashboard inside a browser
sheet they have to dismiss by hand, and returns to an app that still believes they have no access until
something happens to refetch. `openBrowserAsync` also does not resolve on a redirect, so the app is not
even told the sheet closed.

- Switch to `WebBrowser.openAuthSessionAsync(gatewayUrl, returnUrl)` with
  `returnUrl = Linking.createURL("payment-callback")`, the same shape the Google flow already uses in
  `src/lib/auth.ts`.
- Pass `callbackOrigin` on `createEnrollment`. The gateway callbacks are server-to-server and must keep
  landing on a real origin, so the app cannot simply hand it a `mma://` URL — add a
  `/api/payment-return` route to the **web** app that reads the same `paymentId` / `status` query the
  return page reads and 302s into `mma://payment-callback?...`, validating the scheme exactly as
  `routes/api/mobile-auth-handoff.ts` does. That file is the precedent to copy, including its
  allow-list; it exists because this same "the browser holds state the app cannot read" problem already
  had to be solved once.
- On return, invalidate `queryKeys.enrollment(courseId)` and `queryKeys.enrollments()`, then route to the
  player on success and show the failure reason otherwise.
- Handle the dismissal case explicitly. A student who backs out of the gateway must land on the course
  page with no enrolment and no error banner — cancelling is a decision, not a failure, the same rule
  `signInWithGoogle` follows.

**Done when:** a sandbox payment started on the phone ends with the app on the player screen, and a
cancelled one ends on the course page with the enrol button still available. `SSLCOMMERZ_STORE_ID` is set
in the root `.env`, so this is testable without new credentials.

---

## Stage 2 — a test harness

**Why here:** stages 4–7 change screens that currently have no coverage at all, and `bun run test`
silently skips this workspace. Every other workspace can be refactored with a safety net; this one cannot.

- Add `jest-expo` + `@testing-library/react-native`, a `test` script, and let the existing `turbo.json`
  `test` task pick the workspace up. `bun test` is not a substitute — it cannot render React Native
  components, and the value here is in the screens.
- Cover the things that break silently, in priority order:
  1. `src/lib/auth.ts` — cookie extraction and replay, the "rejected cookie means signed out" path, and
     the Google outcome union. Pure logic over `fetch`; no renderer needed.
  2. `src/lib/env.ts` — the three origin-resolution branches (`EXPO_PUBLIC_*`, Metro host, emulator
     fallback). One wrong branch makes the app unusable on exactly one target, which is the failure mode
     hardest to notice.
  3. `src/lib/api-client.ts` — envelope unwrapping and `ApiError` carrying the API's own message.
  4. Screen smoke tests: each route renders its skeleton, then its content, then its empty state. This is
     the coverage that would have caught anything Stage 0 finds by hand.
- Add `apps/mobile` to the testing entry in `PLAN.md`, which currently lists it as uncovered.

**Done when:** `bun run test` runs a third workspace, and a deliberately broken import in any screen fails
there rather than in a store review.

---

## Stage 3 — verify Google sign-in end to end

**Why separate from Stage 0:** it crosses three processes (app, web, Better Auth) and one external
provider, and it is the only auth path with no manual equivalent — a student who signed up with Google on
the web has no password to fall back on.

- Add the Expo redirect to the Google console's authorised origins if the provider rejects the flow.
- Walk it on a device: tap through, complete consent, confirm the browser closes on `mma://auth-callback`,
  and confirm `one-time-token/verify` returns a `Set-Cookie` that `session-store.ts` persists.
- Verify the three failure paths deliberately: dismiss the sheet (must be silent), let the token expire
  past its three minutes (must show a message, not a blank screen), and replay a consumed token (must be
  refused — it is single-use, and that is the security property the whole design rests on).
- Confirm `disableClientRequest: true` still holds by calling `GET /api/auth/one-time-token/generate`
  directly with a valid session cookie. It must fail. If it succeeds, any authenticated client can mint a
  session-exchange token and the handoff is no longer a boundary.

**Done when:** a Google account created on the web signs in on the phone, and the three failure paths
behave as described.

---

## Stage 4 — video playback

The player screen tracks and marks progress but does not play anything: `app/learn/[courseId].tsx:160`
points the student at the web. That was a deliberate boundary (`apps/mobile/AGENTS.md`), and it is the
largest single gap between the two clients — a course is mostly video.

This is a **product decision before it is a task.** Either:

- **Implement it.** `expo-video` (neither it nor `expo-av` is currently a dependency). The work is the
  player surface, fullscreen and orientation, background-audio policy, and wiring the existing chunked
  progress tracker to real `timeupdate` events rather than the manual mark-complete button. Budget for
  the platform differences in HLS and for what happens when a signed S3 URL expires mid-playback.
- **Keep the boundary and make it honest.** Today the copy tells the student to go to the web without
  taking them there. At minimum, open the lecture URL with `WebBrowser.openBrowserAsync` so it is one tap
  rather than a retyped URL.

Do not leave it in the current middle state, which reads as unfinished rather than deliberate.

**Done when:** either a lecture plays on the phone and progress advances from playback, or the screen
hands off in one tap and `apps/mobile/AGENTS.md` says why.

---

## Stage 5 — profile completion

`app/(tabs)/profile.tsx:71` prints a web URL for the student to type in. The API refuses most actions
until `profileCompleted` is true, so this is on the critical path for every new mobile account: sign up on
the phone, then be told to find a laptop.

- The cheapest honest fix is a `WebBrowser.openAuthSessionAsync` into
  `<web>/dashboard/profile-complete`, returning to the app and invalidating `queryKeys.profile()`. The
  session cookie already replays, so the web page will recognise the user.
- Reimplementing the form natively is the alternative. It is a long, role-specific, schema-validated form;
  `studentProfileInputSchema` in `@mma/shared` is already the contract, so the work is layout rather than
  logic. Worth it only if Stage 0 shows students are actually stalling here.

**Done when:** a new mobile account can reach a usable dashboard without leaving the app by hand.

---

## Stage 6 — realtime messaging

`app/messages/[conversationId].tsx:49` polls every 10 seconds. That was deliberate — a WebSocket
reconnects on every backgrounding — but it costs a visible delay on every message and battery on every
open thread.

- The web client's `use-messaging-socket.ts` is the reference: the same event union, the same reducer.
  What differs on mobile is lifecycle, so drive connect/disconnect from `AppState` rather than mount, and
  fall back to the existing poll when the socket is down instead of showing an error.
- Typing indicators and presence come free once the socket is up; read receipts already have API support.
- Keep the poll in the code. It is the correct behaviour on a bad network, and deleting it would trade one
  absolute rule for another.

**Done when:** a message sent from the web appears on the phone without a poll interval, backgrounding and
returning does not leave a dead socket, and airplane mode degrades to polling rather than to an error.

---

## Stage 7 — the parity gaps nobody has listed

These exist on the web and have no mobile screen at all. None is a bug; together they are the difference
between a companion app and the product. Grep confirms no route references any of them:

| Missing                               | Why it matters on a phone                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Lecture comments / discussion         | The one place students ask questions mid-lesson                                                                                              |
| Course reviews                        | The app can enrol but not review, so mobile students never contribute ratings — and the homepage now renders real aggregates built from them |
| Certificates                          | Download and share is a phone-shaped action, more so than a desktop one                                                                      |
| Course notices                        | Teachers post them; mobile students only see them if a push happens to fire                                                                  |
| Bug reports                           | The app has no way to report the app                                                                                                         |
| Catalogue search and category filters | `(tabs)/index.tsx` lists courses; the API supports `search`, `categoryId`, `minPrice`, `maxPrice` and none is wired                          |

Take these one per commit, cheapest first. Search and filters are nearly free — the API functions already
exist in `src/lib/api.ts`.

**Done when:** each row is either built or written into `apps/mobile/AGENTS.md` as a stated boundary with
a reason, the way the original three were.

---

## Stage 8 — resilience

The offline-first claim is currently one line of configuration and no evidence.

- Verify the persisted cache actually rehydrates: kill the app, go offline, relaunch, and confirm the
  catalogue and enrolments render from AsyncStorage rather than skeletons. `gcTime` is a full day
  specifically for this (`src/lib/query.ts`).
- Decide what a mutation does offline. Today `retry: false` on mutations means enrolling with no signal
  fails silently-ish; it should say so.
- Add an error boundary per screen. `app/_layout.tsx` re-exports Expo Router's `ErrorBoundary` at the
  root, which means one bad screen currently takes the whole app down — the mobile equivalent of the
  `errorComponent` rule the web app holds to on all 50 routes.
- Check token expiry: a session that expires while the app is backgrounded must land on sign-in, not on a
  screen looping 401s.

**Done when:** airplane-mode launch shows content, a failed mutation explains itself, and one thrown
screen does not blank the app.

---

## Stage 9 — release

- `eas.json` already defines development, preview and production profiles with the right origins. Run
  `eas build --profile development` first; it is the step that will surface any native linking problem the
  hoisted `bunfig.toml` is holding together.
- Then `preview` on a real device against production origins, which is the first time the app talks to a
  deployment rather than a laptop.
- Store requirements are not code and take calendar time: privacy policy URL, data-safety declarations
  (this app collects email, name and progress), screenshots, an icon set, and an Apple account if iOS is
  in scope.
- `app.json` has `"version": "1.0.0"` and `eas.json` sets `autoIncrement` on production only. Confirm that
  is the intended scheme before the first submission, because changing it afterwards is awkward.

**Done when:** a signed build installs from a link on a device that has never had the dev server.

---

## Not in this plan

- **Teacher and admin tooling on mobile.** The app is a student client. Course authoring, moderation
  queues and analytics stay on the web, and that should be written down rather than left to be discovered.
- **Any backend change beyond the two small web routes in Stages 1 and 5.** If a stage seems to need one,
  that is a signal the boundary is in the wrong place — say so rather than reaching across.
- **Offline _writes_.** Reading offline is in scope (Stage 8). A queue of pending mutations is a different
  and much larger product.
