# AGENTS.md — `@mma/mobile`

Expo SDK 57 / React Native app with Expo Router. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run start      # expo start
bun run android
bun run ios
bun run lint
bun run test       # jest-expo — see "Tests" below
bun run typecheck
bunx expo-doctor   # 20/20 as of this writing — keep it that way
```

The staged plan for this workspace — what is verified, what is not, and the order to close it in — is [`docs/mobile-plan.md`](../../docs/mobile-plan.md). Read it before starting anything larger than a fix.

The gap between this app and the current web app — tokens, primitives, screens, data, and the
change list that closes it — is [`docs/web-mobile-parity.md`](../../docs/web-mobile-parity.md).
Read it before any parity or redesign work.

## Layout

```
app/                     Expo Router file routes. (tabs)/ is the signed-in shell.
src/lib/                 env, api-client, auth, session-store, query, hooks
src/lib/api/             One module per API feature. Thin typed wrappers over api-client.
src/theme/palettes.ts    lightColors, the tint families, and the ThemeColors shape
src/theme/theme.tsx      ThemeProvider, useTheme, useThemeColors, makeStyles, shadow
src/components/ui.tsx    Every primitive: Screen, Card, Button, Field, Badge, skeletons
src/components/ui-display.tsx     Progress, avatars, tiles, filters, IconTile
src/components/ui-layout.tsx      CurvedHeader, HeaderBar, ListRow, ListGroup, StickyBar
src/components/brand-lockup.tsx   The mark and the name, side by side
src/components/sheet.tsx          The bottom sheet every modal surface uses
src/components/filter-sheet.tsx   The shared filter sheet (catalogue, exams)
src/components/bottom-nav.tsx     The bar the (tabs) shell renders
src/components/auth-scaffold.tsx  The shape sign-in, sign-up and the reset share
src/components/*.tsx     Composed pieces: lecture player, comments, reviews, route error
src/theme/tokens.ts      Radii, spacing, elevation, families and the type scale
```

`app/` holds routes only. Anything reusable belongs in `src/` — including the
screen tests, because Expo Router would treat a `*.test.tsx` under `app/` as a
route.

## Talking to the API

Two origins, and confusing them is the most likely mistake here:

- **`mobileEnv.apiBaseUrl`** — the Hono API, `/api/v1`. All product data.
- **`mobileEnv.authBaseUrl`** — Better Auth, served by the **web** app at `/api/auth`. Sign-in, sign-up, session, sign-out.

`src/lib/env.ts` defaults to the deployed origins, so Expo Go and release builds reach the same services. Set both `EXPO_PUBLIC_API_ORIGIN` and `EXPO_PUBLIC_WEB_ORIGIN` explicitly only when developing against local services; `eas.json` sets the deployed origins for every profile.

Never call `fetch` directly for product data. Use `src/lib/api-client.ts`, which unwraps the `{ status, message?, data }` envelope and throws `ApiError` carrying the API's own message. Add endpoints to `src/lib/api/<feature>.ts`, one function each — one module per API feature, the same split the web app uses. There is no barrel: import from the module that owns the call, so the import path says which part of the API a screen talks to. **Check the actual route in `apps/api/src/routes/v1/` before adding one** — several paths are not where you would guess (`courses/:id/progress`, `enrollments/courses/:id/me`, `tests/submissions/:id/answers`, `tests/:testId/submit`).

## Named exports, with one forced exception

The repo rule is **named exports only** (root `AGENTS.md` §3). Expo Router requires a `export default` per file in `app/`, and there is no way around it — the router loads a route module and reads its default. So every file under `app/` has exactly one default export, which is its screen, and nothing else in this workspace does. Do not "fix" those, and do not add a default export anywhere in `src/`.

## Typography

Two families, and both of them draw **Bangla and Latin**. That is the constraint
everything else follows from: a Latin-only display face would silently drop
Bangla headings to whatever system font the handset happened to have.

- **Baloo Da 2** — the display face. Headings, buttons, scores, prices, streak
  counts. Rounded and heavy; it is what gives the app its voice.
- **Anek Bangla** — the text face. Body copy, list rows, captions, and the small
  all-caps labels (`fonts.monoLabel`, which is just its SemiBold letter-spaced).

`src/theme/tokens.ts` names one family per weight and `app/_layout.tsx`
registers exactly those six files with `useFonts`, holding the splash screen
until they resolve.

Import each weight from its own subpath (`@expo-google-fonts/baloo-da-2/700Bold`),
never from the package root. The root index re-exports every weight and italic,
Metro bundles each one it can see, and the export goes from ~1.5MB of fonts to
several times that for faces nothing renders.

Two traps this avoids, both silent:

- React Native substitutes the system font for an unresolvable family **without
  warning**, so a missing `useFonts` call looks like a working app in the wrong
  typeface.
- Android does not synthesise a bold for a custom family. `fontWeight: "700"`
  over `"BalooDa2_400Regular"` renders regular. Pick the family, not the weight
  — there are no `fontWeight` values left in this workspace.

## Auth

React Native has no cookie jar, so the app stores Better Auth's session cookie itself: `src/lib/session-store.ts` keeps it in **expo-secure-store** (it is a bearer credential, not a preference) and every request replays it as a `Cookie` header. `src/lib/auth.ts` wraps the endpoints; `src/lib/use-session.ts` is the hook screens use.

A rejected cookie is treated as "signed out", not as an error — it is cleared so the next launch does not retry it.

## Design tokens and locale

`src/theme/tokens.ts` and `src/theme/palettes.ts` are the design. **The app is
light only, and it is cream and indigo**: a warm off-white page (`background`),
white plates, one calm indigo (`accent`) that everything actionable is drawn in,
a brand gold for the thing worth noticing, and four supporting families — mint,
coral, lilac, sky — reached as `colors.tint.<name>`.

Cream rather than cool grey is the decision the rest hangs off: paper, not
glass. It is also why `colors.shadow` is warm — a grey shadow on cream reads as
dirt.

**The blue comes in two steps, and mixing them up is the mistake to avoid.**
`accent` is the control blue: buttons, the focused tab, a filled check, a
selected pill. `accentStrong` is the large-surface blue and is what
`CurvedHeader` fills with. A saturated blue is a near-complement of warm cream,
so the two vibrate; that is tolerable on a chip and tiring across a full-width
header, which is why the header takes the deeper, quieter end.

**This is a deliberate divergence from `DESIGN.md`.** That document describes
the web app's ink-first dark surface and forbids both shadows and animation; the
mobile client no longer follows it. There is no dark palette and no theme
switcher: two palettes had to agree on every token, and every token here is
chosen for one background.

**Colour is reached through the theme, never imported.** `tokens.ts` holds only
what does not change — radii, spacing, elevation presets, families, the type
scale. A component gets colour one of two ways:

```ts
const useStyles = makeStyles((colors) => ({ card: { backgroundColor: colors.card } }));

function Card(): JSX.Element {
  const styles = useStyles();          // a sheet per scheme, built once
  const colors = useThemeColors();     // for a colour that goes in a prop
```

`StyleSheet.create` at module scope is the thing to avoid: it runs before a
provider exists and freezes whatever the palette was at import.

### The three structures

A screen here is not a scrolling document with a title on top. It is built from
`src/components/ui-layout.tsx`:

- **`CurvedHeader`** — the indigo block every top-level screen opens with. It
  pads for the status bar itself, so a screen using one sets
  `headerShown: false` and does *not* pass `noHeader` to `Screen`.
- **The overlap** — the first white plate under a header pulls itself up by
  `layout.headerOverlap` (`marginTop: -layout.headerOverlap`). That single
  overlap is what makes a screen read as layered rather than stacked.
- **`StickyBar`** — the bar docked to the bottom edge on a screen with one
  decision on it: enrol, submit, next lesson. It clears the home indicator
  itself and casts its shadow upward.

`ListRow` + `ListGroup` are the fourth repeated thing: one row component for
settings, exams, payments and contact, so a tap looks the same everywhere.

**Sheets are ours, not `@expo/ui`'s.** `src/components/sheet.tsx` is a plain
React Native `Modal` with a dimmed backdrop and a cream panel. `BottomSheet`
from `@expo/ui` is a Compose `ModalBottomSheet` on Android and takes its surface
colour from the **native** theme, not from JavaScript — on a build whose Android
theme is not light it renders as a black slab with the content floating on it,
and no prop fixes that. `FilterSheet` (the catalogue and exams filters) and the
lesson picker both sit on `Sheet`.

### Shapes

Icons live in **squircles** (`IconTile`, `radius.tile`); circles belong to
people — an avatar, a presence dot. Buttons are bold rounded rectangles, not
pills and not gradients. Depth replaces hairlines: `shadow(colors, "card" |
"float" | "hero", tone?)` in `theme.tsx`, where `tone` colours the shadow with
the plate's own colour.

**The nav bar is docked, not floating.** `BottomNav` is attached to the bottom
edge with curved top corners and draws over the content, so a scrolling tab
screen pads its own footer with `tabScrollInset` (`layout.tabScrollInset`).
Nothing inside it may be an `SvgView` — React Navigation re-parents a focused
tab's icon, and under Fabric that kills the process.

**The brand is drawn, not typed.** `BrandLockup` pairs `mma-mark.png` with
`mma-wordmark.png` and appears in the catalogue's header and at the top of the
ways in. Both facts about the artwork matter: the mark needs a white plate under
it (dropped straight onto the header its blue half disappears), and the wordmark is
**near-white**, drawn for a dark surface — on cream it must be tinted to ink,
which is `onColor={false}`. The boot splash tints it for the same reason; before
that it was white on cream and the name did not render at all.

**Signed out, the account tab is the sign-in screen.** `app/(tabs)/profile.tsx`
and the inbox both `Redirect` to `/sign-in` rather than rendering a page whose
only content is a button to it. Explore stays public.

Strings and number formatting come from `@mma/i18n`, the same catalogue the web
app uses, through `src/lib/locale.tsx` (`useT`, `useFormat`, `useLocale`). There
is no SSR here, so unlike the web there is no cookie and no first-paint problem:
the stored locale is read in an effect and the first frame uses the default.

**Google sign-in** cannot work the way it does on the web, because the OAuth round trip happens in an in-app browser whose cookies the app cannot read. Instead `signInWithGoogle` opens `/api/mobile-google-start` on the **web** app, so Better Auth's OAuth state cookie stays in that browser. Its callback reaches `/api/mobile-auth-handoff`, which mints a single-use three-minute token (`oneTimeToken` plugin, minting disabled for client requests) and redirects into `mma://auth-callback?token=…`. The app exchanges that at `one-time-token/verify`, which answers with the `Set-Cookie` it stores. Closing the browser returns `"cancelled"` rather than throwing — it is a decision, not a failure.

A **401 from any product request clears the stored cookie**. A session can end while the app is backgrounded, and without this every screen would keep replaying a dead cookie with nothing telling the app to ask for a sign-in.

## Payments

Enrolment checkout has the same shape of problem, and `src/lib/payment.ts` solves it the same way. The gateway's own callbacks are server-to-server and have to land on a real origin, so checkout tells the API where to send the _browser_ afterwards: `callbackOrigin` plus `callbackPath`, the latter pointing at `/api/payment-return` on the web app with this app's deep link in its query. The API merges `paymentId` and `status` into that URL, the web route redirects into `mma://payment-callback?…`, and `openAuthSessionAsync` closes the sheet on it.

The outcome is never taken as proof of anything: on return the app invalidates the enrolment queries and re-reads access from the server. Cancelling is silent, the same rule sign-in follows.

**Deep links need a route.** `app/auth-callback.tsx` and `app/payment-callback.tsx` exist because Android delivers `mma://…` through `Linking` as well as resolving the browser session, and Expo Router would otherwise show `+not-found` at the exact moment the flow succeeded.

## Tests

`jest-expo` with `@testing-library/react-native`. `bun test` cannot run this workspace — it has no React Native renderer, and the value here is in the screens.

- `jest.setup.ts` stubs the native modules whose _behaviour_ is read: SecureStore (an in-memory map, so `session-store.ts` is exercised for real), Linking, WebBrowser, AsyncStorage and the four Reanimated members `SkeletonBlock` uses.
- Pure logic lives in `src/lib/*` and is tested directly. `resolveOrigins` and `resolveLectureVideo` are exported as pure functions specifically so the branches can be asserted without reloading a module.
- `src/screens.test.tsx` renders routes: skeleton, then content, then empty state.
- React logs "not wrapped in act(…)" for queries that settle after the assertion they were not being awaited for. It is noise from TanStack Query's `setTimeout(0)` batching, not a failing expectation.

## Server state

TanStack Query, with the same rules as the web app: keys come from `queryKeys` in `src/lib/query.ts`, retry is off for 4xx and for all mutations. The cache is persisted to AsyncStorage through `PersistQueryClientProvider`, so the app opens with content rather than skeletons — that persistence is why `gcTime` is a full day.

The session query is the one exception: `staleTime: 0`, because showing a signed-out user a signed-in shell is worse than a brief wait.

## Loading states

No spinners. Standards §12 applies to mobile as written — "every screen, every component, every data-fetching boundary". `SkeletonBlock` pulses on Reanimated's UI thread, so it keeps 60fps while the JS thread is busy with the very work it is standing in for, and `ScreenSkeleton` covers the pre-session boot state that used to be an `ActivityIndicator`.

## Lists and images

`FlashList` for every list, with a memoised row component and `useCallback` for `renderItem` / `keyExtractor` — FlashList recycles rows, so an unmemoised item re-renders the whole visible window on each keystroke. `expo-image` for every image; its disk cache is what makes the catalogue usable on a second launch.

Uploaded images come with smaller copies. `CoverImage` reads the widths declared on the URL and picks one with `pickImageVariant` from `@mma/shared`, sized in **device pixels** — `useWindowDimensions()` times `PixelRatio.get()`. Points would ask for a third of what a 3x screen needs and put a blurred cover on the best display in the room. A URL with no variants is used as-is.

## Progress

`ProgressTrack` in `src/components/ui-display.tsx` is one continuous rounded bar — cobalt while a course is running, green once it is finished. It used to be chunked, which reads as a segmented control at small sizes; the course player keeps a chunked tracker because there a chunk *is* a named lecture. `ProgressRing` says the same thing as a single number where a tile has no room for a bar, and `tone="onColor"` draws it in white over a cobalt header.

## Video, profile and messaging

These were the three deliberate boundaries. All three are closed, and how they were closed is the part worth keeping.

- **Video playback** is `expo-video`, and `src/lib/lecture-video.ts` decides what a lecture is: a media file plays here, a YouTube or Vimeo link is a page with a player on it and opens in the browser. The host list matches `apps/web/src/components/courses/course-player.tsx` — keep them together. Progress comes from a `timeUpdate` listener at 95%, latched locally as well as on the server. The manual "mark as watched" button stayed, because a reading or an external video still needs one.
- **Profile completion** is native, and the note that used to sit here — that the session cookie would replay in a browser — was wrong. It replays on _requests this app makes_. A browser opened from the app has no cookie and arrives signed out, which is why there is no browser hop for this and none for certificates either. Fields, schema and initial values live in `src/lib/profile-form.ts`, one thing rather than three that can drift.
- **Realtime messaging** holds an `AppState`-driven socket. Connect and disconnect follow foreground and background, not mount: a socket held across a backgrounding is a dead socket that still looks connected. **The poll was not deleted** — `refetchInterval` is 10s whenever the socket is down, because on a bad network that is the correct behaviour.

## Boundaries that remain

- **Uploads are image-only.** Profile photos and bug screenshots use the signed S3 flow. Course authoring uploads and arbitrary file management remain web-only.
- **No teacher or admin tooling.** This is a student client. Authoring, moderation and analytics stay on the web.
- **No offline writes.** The persisted cache makes reading offline work; a queue of pending mutations is a different product.

## Monorepo notes

- Consumes `@mma/shared` unbuilt, from TypeScript source. `metro.config.js` adds the workspace root to `watchFolders` and `nodeModulesPaths` — without it Metro will not leave this directory.
- **`bunfig.toml` at the repo root sets `linker = "hoisted"`.** React Native can only link one copy of a native module, and bun's default isolated store produces several. Do not remove it: `expo-doctor` fails immediately, and native builds break in harder-to-diagnose ways.
- `react` / `react-dom` are excluded from the Expo version check in `package.json`. The SDK pins 19.2.3, the monorepo is on 19.2.8, and one shared copy on a newer patch is safer than two copies of React.
- This workspace now has `lint` and `typecheck` scripts, so `turbo run lint` / `typecheck` cover it. It still has no `build` — a native build goes through EAS, not Turbo.
