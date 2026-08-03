# Mobile plan — from "it compiles" to "it ships"

The Expo app was built in `e0e8b34`, extended during the 3 August drift sweep, and worked through
stage by stage on 3 August 2026. **Seven of the ten stages below are done, and the remaining three
are done as far as they can be without hardware.** What is left in each is named precisely: a
handset, a Google account, an EAS build.

Scope is `apps/mobile` only. Where a stage needed an API or web change it is named; nothing here
reorganised the backend.

**Ordering principle: prove it runs, close the hole where money can go missing, then buy the right to
change things (tests), then close the three deliberate boundaries, then parity, then release.**

| Stage                     | State                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| 0 — run it once           | **Partly.** Every screen booted in a browser; a handset is still owed. |
| 1 — payment return loop   | Done, and asserted end to end against a running stack.                 |
| 2 — test harness          | Done. 60 tests, `bun run test` now covers three workspaces.            |
| 3 — verify Google sign-in | **Partly.** Automated where it is decidable; the walk needs a phone.   |
| 4 — video playback        | Done. `expo-video`, progress driven from playback.                     |
| 5 — profile completion    | Done, and not the way this plan first proposed. See below.             |
| 6 — realtime messaging    | Done. `AppState`-driven socket, poll as the fallback.                  |
| 7 — parity gaps           | Done. All six.                                                         |
| 8 — resilience            | Done.                                                                  |
| 9 — release               | **Partly.** The native project generates; EAS and stores are owed.     |

---

## What is actually true today

Verified:

| Claim                                        | Evidence                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Typechecks and lints                         | `bun run typecheck`, `bun run lint` — 8/8 workspaces                      |
| Expo config is sound                         | `bunx expo-doctor` — 20/20                                                |
| The module graph bundles                     | `bunx expo export --platform android` — 4.8MB Hermes bytecode, 33 assets  |
| Every screen renders, with data and without  | `src/screens.test.tsx`                                                    |
| 60 tests pass                                | `bun run --filter @mma/mobile test`                                       |
| **All 15 routes boot in a real browser**     | `expo export --platform web`, then each route loaded headless — see below |
| **The native project generates**             | `bunx expo prebuild --platform android` — every config plugin resolves    |
| **Both redirect hops behave over real HTTP** | `apps/web/e2e/mobile-handoff.spec.ts` — 8 tests against a running stack   |
| 33 typed API functions                       | `src/lib/api.ts`                                                          |

Not verified, and not implied by any of the above:

- **Nothing has executed on a phone.** The browser run below is real execution, but react-native-web
  is not React Native: it says nothing about layout on a small screen, gestures, the keyboard, native
  video, the share sheet, or whether the fonts loaded.
- **No native build.** EAS has never run. `expo prebuild` proves the config plugins resolve and a
  Gradle project is written; it does not compile one. `bunfig.toml`'s hoisted linker still only
  matters at that step.
- **Google sign-in has not been walked.** The token exchange and the failure paths are tested against
  a mocked browser, and the handoff route is tested over HTTP; the round trip through Google is not.
  (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` _are_ set in the root `.env`, so this is testable today.)
- **No payment has been taken from a phone.** Every URL in the chain is now asserted — what the API
  builds, what the web route redirects to, what the app reads back. The gateway in between is not.

---

## Stage 0 — run it once ◐

**Done in a browser. A handset is still owed.**

**Why first:** every later stage was written against a codebase that had never executed.

### What was run

`bunx expo export --platform web` renders every route to static HTML through react-native-web, which
means every route module _executes_. Serving that output and loading each route headless — watching
for `pageerror` and console errors — is the closest thing to a device that a checkout can produce.

All 15 routes boot clean, including both deep-link landing pads: `/payment-callback` lands on My
courses and `/auth-callback` on the catalogue, which is what those two `Redirect` routes were added
for.

**It found two real bugs, which is the entire argument for running things.** Both were unhandled
rejections in fire-and-forget async work, and both would have taken a screen down through its own
error boundary while the thing that failed was something the student never sees:

- `use-messaging-socket.ts` read the session cookie with nothing catching it. On native the keychain
  answers, so this would have waited for a device with a locked keystore to appear.
- The conversation screen's `markConversationRead` effect had no `.catch`. Offline, or on a 403, the
  thread would load fine and then the screen would blank.

This is a one-off technique, not a committed harness: react-native-web is not React Native, and a
suite that green-lit the wrong runtime would be worse than none. To repeat it, export for web, serve
the output with a server that maps `/sign-in` to `sign-in.html`, and load each route with Playwright.

### What still needs a phone

- Start the API (`bun run --filter @mma/api dev`) and the web app (`bun run --filter @mma/web dev`) —
  mobile needs both: the API for data, the web origin for Better Auth and for the two redirect hops.
- `bun run --filter @mma/mobile start`, then open on one Android emulator and one physical device.
  The emulator matters because `resolveOrigins` has a `10.0.2.2` branch that only it exercises; the
  device matters because the Metro-host branch is the one a real handset takes. Both branches are
  unit-tested, and neither test proves the host is reachable.
- Walk the whole signed-in path once, in order, and write down what breaks:
  catalogue → course detail → enrol on a **free** course → player → play a lecture → a test →
  submit → discussion → notices → messages → notifications → profile → sign out.
- Check the things neither a test renderer nor a browser can show: that the type scale is
  Manrope/Inter rather than Roboto, that `ScreenSkeleton` shows on a cold launch rather than a blank
  frame, that the video surface fills its 16:9 box, that fullscreen rotates despite the portrait lock
  in `app.json`, and that the certificate reaches a real share sheet.

**Done when:** the walkthrough completes on both targets and every defect found is either fixed or
filed.

---

## Stage 1 — close the payment return loop ✅

A priced-course enrolment used to open the gateway and lose the thread: `openBrowserAsync` with no
`callbackOrigin`, so `commerce-service.ts` fell back to `env.APP_URL` and redirected the student to
the **web** dashboard, inside a browser sheet they had to dismiss by hand, in front of an app that
still believed they had no access.

What landed:

- **`callbackPath` on the enrolment contract** (`packages/shared/src/validators/payments.ts`). A path,
  never a URL — it is resolved against `callbackOrigin`, and the leading `/` must be a single one,
  because `//evil.example` is a protocol-relative URL that `new URL()` resolves to another host.
- **The return URL is built with the URL parser** (`commerce-service.ts`), not string concatenation,
  because the path arrives carrying a query string and `paymentId` has to merge into it.
- **Origin and path are stored on the payment** and read back from there on the callback. The gateway
  echoes `origin` for compatibility; it never saw the path, and taking a redirect target from a
  callback body would be someone else's choice of destination.
- **`apps/web/src/routes/api/payment-return.ts`** — the last hop, modelled on `mobile-auth-handoff.ts`.
  The scheme allow-list both routes share moved to `src/lib/app-link.ts`.
- **`src/lib/payment.ts`** on mobile: `openAuthSessionAsync`, so the sheet closes on the redirect, and
  the outcome is read from the returned URL. A dismissal is `"cancelled"` — no banner, enrol button
  still there. Anything that is not an explicit success is a failure the student can read.
- On success the app **invalidates and re-reads access from the server** rather than trusting the
  redirect.

`apps/web/e2e/mobile-handoff.spec.ts` asserts the web hop over real HTTP, because what it does is a
`Location` header and unit tests cannot see one: it redirects into the app carrying the gateway's
verdict, a missing status is `pending` rather than success, and it refuses `https://evil.test`,
`//evil.test`, `javascript:`, a bare path and an empty string with a 400.

Left to verify on a device: a sandbox payment end to end. `SSLCOMMERZ_STORE_ID` is set in the root
`.env`, so this needs no new credentials.

---

## Stage 2 — a test harness ✅

`jest-expo` + `@testing-library/react-native`, a `test` script, and the existing Turbo `test` task
picks the workspace up — `bun run test` runs three workspaces now. `bun test` was not an option: it
has no React Native renderer, and the value here is in the screens.

Sixty tests, in the order the plan asked for:

1. **`auth.ts`** — cookie extraction and replay, "a rejected cookie means signed out", the Google
   outcome union, and that sign-out clears local state even when the server call fails.
2. **`env.ts`** — the three origin-resolution branches. `resolveOrigins` was extracted as a pure
   function to make them assertable without reloading a module; one wrong branch makes the app
   unusable on exactly one target, which is the failure mode hardest to notice.
3. **`api-client.ts`** — envelope unwrapping, `ApiError` carrying the API's own message, the offline
   case, and that a 401 clears the cookie while a 403 does not.
4. **`payment.ts`, `lecture-video.ts`, `profile-form.ts`** — the decisions that are silent when wrong.
5. **`src/screens.test.tsx`** — each route renders its skeleton, then its content, then its empty
   state. The tests live under `src/` because Expo Router would treat a `*.test.tsx` under `app/` as
   a route.

---

## Stage 3 — verify Google sign-in end to end ◐

**Automated in the app** (`src/lib/auth.test.ts`): that Better Auth is sent to
`/api/mobile-auth-handoff` rather than to a dashboard; that the one-time token is exchanged and the
returned cookie stored; that a dismissed sheet is `"cancelled"` and not an error; that a callback
carrying no token fails rather than appearing to sign in.

**Automated over HTTP** (`apps/web/e2e/mobile-handoff.spec.ts`): that an anonymous caller reaching
the handoff is redirected into the app's own scheme carrying an error and **no token** — every
failure mode looks the same and none of them carries a credential; that the route refuses any target
outside the allow-list; that `GET /api/auth/one-time-token/generate` does not answer an anonymous
request with a token; and that verifying a token that was never minted fails without a `Set-Cookie`.

**Still needs a device and a Google account**, because it crosses three processes and an external
provider:

- Add the Expo redirect to the Google console's authorised origins if the provider rejects the flow.
- Walk it: tap through, complete consent, confirm the browser closes on `mma://auth-callback`.
- Let the token expire past its three minutes (must show a message, not a blank screen), and replay a
  consumed one (must be refused — it is single-use, and that is the security property the whole
  design rests on).
- Confirm `disableClientRequest: true` still holds by calling `GET /api/auth/one-time-token/generate`
  **with a valid session cookie**. It must fail. The E2E covers the anonymous case; the signed-in one
  is the case that matters, and it needs an account. If it succeeds, any authenticated client can
  mint a session-exchange token and the handoff is no longer a boundary.

---

## Stage 4 — video playback ✅

`expo-video`, and the boundary is gone.

- `src/lib/lecture-video.ts` decides what a lecture is. A media file plays in the app; a YouTube or
  Vimeo link is a page with a player on it, has no decoder, and opens in the browser in one tap. The
  host list is the same one `apps/web/src/components/courses/course-player.tsx` uses.
- `src/components/lecture-player.tsx` holds the surface: native controls, picture-in-picture, and
  `fullscreenOptions: { orientation: "landscape" }` — the app is portrait-locked, so fullscreen is
  the only way a lecture is watchable at any size.
- **Progress comes from playback.** A `timeUpdate` listener marks the lecture complete at 95%. Not
  100%: credits or a player stopping a beat short would leave a finished lecture at incomplete
  forever. It latches locally as well as on the server so a second event does not fire a second
  mutation.
- The manual button stayed. A reading, an external video, or a lecture the student skimmed all need a
  way to say "done".
- A player error — an expired signed URL, most likely — says so, rather than showing a black
  rectangle.

---

## Stage 5 — profile completion ✅ (not as planned)

This plan originally proposed opening `<web>/dashboard/profile-complete` in a browser session. **That
would not have worked**, and the reason is worth keeping: the session cookie lives in this app's
keychain and is replayed per request. A browser opened from the app has no cookie and arrives signed
out. The note in `apps/mobile/AGENTS.md` claiming otherwise was wrong and has been corrected.

So the form is native, which is what the alternative in this plan proposed for a different reason:

- `src/lib/profile-form.ts` holds the fields, the schema and the initial values as one thing. The
  schemas come from `@mma/shared` — the same ones the API validates against — and the API picks which
  to apply from the session's role, so the screen sends the shape matching the role it rendered for.
- `app/profile-complete.tsx` renders it, reports one message per field, and invalidates both the
  profile and the **session** on save, because `profileCompleted` lives on the session and the shell
  reads it.
- `profilePhoto` is deliberately absent: it needs the signed-upload flow the web app has and this one
  does not, and it is optional in every schema. A profile completed here keeps whatever photo it had.

This also fixed a live bug: `OwnProfile` in `src/lib/api.ts` described a flat `{ email, id, name,
isProfileComplete, role }` that the API has never returned. The profile screen was silently falling
back to the session for every field.

---

## Stage 6 — realtime messaging ✅

`src/lib/use-messaging-socket.ts`, with the web client's hook as the reference — same endpoint, same
event union. The union itself moved to `@mma/shared` as `WebsocketServerEvent`, because there are two
clients now and a field added on the server has to reach both.

What differs on mobile is lifecycle, which is what made this a boundary in the first place:

- Connect and disconnect are driven by **`AppState`**, not by mount. A socket held across a
  backgrounding is a dead socket that still looks connected.
- The upgrade request carries the session cookie as a header — React Native's `WebSocket` takes a
  third options argument the DOM one does not.
- **The poll was not deleted.** `refetchInterval` is `false` while the socket is up and 10s when it is
  not. On a bad network the poll is the correct behaviour, and trading one absolute rule for another
  would be no better.
- Typing indicators came free: announced on the first keystroke, withdrawn after a two-second pause.
- A socket that will not open is not surfaced. It degrades to the poll, and a student reading a thread
  does not need to know which transport delivered it.

---

## Stage 7 — the parity gaps ✅

All six, each with its API route checked before it was wired.

| Was missing                  | Now                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Lecture comments             | `src/components/lecture-comments.tsx` in the player. Replies one level deep, as on web         |
| Course reviews               | `src/components/course-reviews.tsx` on course detail, with the summary the homepage aggregates |
| Certificates                 | `src/lib/documents.ts` — downloads the PDF with the session cookie, then the share sheet       |
| Course notices               | A card in the player. Previously visible only if a push happened to fire                       |
| Bug reports                  | `app/bug-report.tsx`, reached from the profile tab, listing your own reports and their status  |
| Catalogue search and filters | Search and category chips already existed; price bands were added                              |

Two notes on what was _not_ done. The certificate goes through `expo-file-system` and `expo-sharing`
rather than a browser download, because a browser opened from the app is signed out — the same
constraint as Stage 5. And bug reports omit `screenshotUrl`: it needs the signed-upload flow this app
does not have.

---

## Stage 8 — resilience ✅

- **An error boundary per screen.** `src/components/route-error.tsx` is exported from every route as
  `ErrorBoundary`, which is the Expo Router equivalent of the web app's `errorComponent` rule. The
  root re-export catches everything and therefore takes the whole app down for one bad screen; this
  confines the failure to the route, and `retry` re-renders only what broke.
- **Offline is a distinct condition.** `fetch` rejecting becomes an `ApiError` with status 0 and a
  message a student can act on, rather than "Network request failed". The retry rule was widened to
  keep retrying those — a phone regains signal on its own — while still refusing to retry a 4xx.
- **Session expiry lands on sign-in.** A 401 from any product request clears the stored cookie, so the
  next session read returns null and the app asks for a sign-in instead of looping.

Left to verify on a device: that the persisted cache actually rehydrates. Kill the app, go offline,
relaunch, and confirm the catalogue and enrolments render from AsyncStorage rather than skeletons.
`gcTime` is a full day specifically for this.

---

## Stage 9 — release ◐

**The native project generates. EAS and store accounts are owed.**

`bunx expo prebuild --platform android --no-install --clean` writes a complete Gradle project, which
means every config plugin resolves and applies — including the four native modules added while
working through this plan (`expo-video`, `expo-file-system`, `expo-sharing`, `expo-system-ui`). It
does not compile one; that is what EAS is for.

That run surfaced one thing worth fixing: `app.json` declares `"userInterfaceStyle": "light"` and
Android was ignoring it, because enforcing it needs `expo-system-ui`. The palette is light-only, so a
device in dark mode would have drawn system chrome the app never designed for. `expo-system-ui` is
now a dependency and the warning is gone.

Note that prebuild rewrites the `android` and `ios` scripts to `expo run:*` as a side effect. This is
a managed project — `/android` and `/ios` are gitignored — so revert that and delete the generated
directory afterwards.

- `eas.json` already defines development, preview and production profiles with the right origins. Run
  `eas build --profile development` first; it is the step that will surface any native linking problem
  the hoisted `bunfig.toml` is holding together.
- Then `preview` on a real device against production origins, which is the first time the app talks to
  a deployment rather than a laptop.
- Store requirements are not code and take calendar time: privacy policy URL, data-safety
  declarations (this app collects email, name, phone, guardian details and progress — the profile form
  widened what that sentence has to cover), screenshots, an icon set, and an Apple account if iOS is
  in scope.
- `app.json` has `"version": "1.0.0"` and `eas.json` sets `autoIncrement` on production only. Confirm
  that is the intended scheme before the first submission, because changing it afterwards is awkward.

---

## Not in this plan

- **Teacher and admin tooling on mobile.** The app is a student client. Course authoring, moderation
  queues and analytics stay on the web.
- **Uploads from the app.** Two features are shaped by its absence — no profile photo, no bug-report
  screenshot. Adding it means the signed-upload flow, an image picker, and permissions on two
  platforms.
- **Offline _writes_.** Reading offline is in scope. A queue of pending mutations is a different and
  much larger product.
