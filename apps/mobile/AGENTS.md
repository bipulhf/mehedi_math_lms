# AGENTS.md — `@mma/mobile`

Expo SDK 57 / React Native app with Expo Router. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run start      # expo start
bun run android
bun run ios
bun run lint
bun run typecheck
bunx expo-doctor   # 20/20 as of this writing — keep it that way
```

The staged plan for this workspace — what is verified, what is not, and the order to close it in — is [`docs/mobile-plan.md`](../../docs/mobile-plan.md). Read it before starting anything larger than a fix.

## Layout

```
app/                     Expo Router file routes. (tabs)/ is the signed-in shell.
src/lib/                 env, api-client, api, auth, session-store, query, hooks
src/components/ui.tsx    Every primitive: Screen, Card, Button, Field, Badge, skeletons
src/theme/tokens.ts      The Digital Atelier palette, radii, spacing and type scale
```

`app/` holds routes only. Anything reusable belongs in `src/`.

## Talking to the API

Two origins, and confusing them is the most likely mistake here:

- **`mobileEnv.apiBaseUrl`** — the Hono API, `/api/v1`. All product data.
- **`mobileEnv.authBaseUrl`** — Better Auth, served by the **web** app at `/api/auth`. Sign-in, sign-up, session, sign-out.

`src/lib/env.ts` infers both from the Metro connection in development, so a physical device works without editing anything. `EXPO_PUBLIC_API_ORIGIN` / `EXPO_PUBLIC_WEB_ORIGIN` override for real builds; `eas.json` sets them per profile.

Never call `fetch` directly for product data. Use `src/lib/api-client.ts`, which unwraps the `{ status, message?, data }` envelope and throws `ApiError` carrying the API's own message. Add endpoints to `src/lib/api.ts`, one function each. **Check the actual route in `apps/api/src/routes/v1/` before adding one** — several paths are not where you would guess (`courses/:id/progress`, `enrollments/courses/:id/me`, `tests/submissions/:id/answers`, `tests/:testId/submit`).

## Named exports, with one forced exception

The repo rule is **named exports only** (root `AGENTS.md` §3). Expo Router requires a `export default` per file in `app/`, and there is no way around it — the router loads a route module and reads its default. So every file under `app/` has exactly one default export, which is its screen, and nothing else in this workspace does. Do not "fix" those, and do not add a default export anywhere in `src/`.

## Typography

`src/theme/tokens.ts` names one font family per weight (`Inter_400Regular`, `Manrope_700Bold`, …) and `app/_layout.tsx` registers exactly those with `useFonts`, holding the splash screen until they resolve.

Import each weight from its own subpath (`@expo-google-fonts/inter/400Regular`), never from the package root. The root index re-exports every weight and italic, Metro bundles each one it can see, and the export goes from 2.3MB of assets to 7.7MB for fonts nothing renders.

Two traps this avoids, both silent:

- React Native substitutes the system font for an unresolvable family **without warning**, so a missing `useFonts` call looks like a working app in the wrong typeface.
- Android does not synthesise a bold for a custom family. `fontWeight: "700"` over `"Manrope"` renders regular. Pick the family, not the weight — there are no `fontWeight` values left in this workspace.

## Auth

React Native has no cookie jar, so the app stores Better Auth's session cookie itself: `src/lib/session-store.ts` keeps it in **expo-secure-store** (it is a bearer credential, not a preference) and every request replays it as a `Cookie` header. `src/lib/auth.ts` wraps the endpoints; `src/lib/use-session.ts` is the hook screens use.

A rejected cookie is treated as "signed out", not as an error — it is cleared so the next launch does not retry it.

**Google sign-in** cannot work the way it does on the web, because the OAuth round trip happens in an in-app browser whose cookies the app cannot read. Instead `signInWithGoogle` sends Better Auth's `callbackURL` to `/api/mobile-auth-handoff` on the **web** app, which mints a single-use three-minute token (`oneTimeToken` plugin, minting disabled for client requests) and redirects into `mma://auth-callback?token=…`. The app exchanges that at `one-time-token/verify`, which answers with the `Set-Cookie` it stores. Closing the browser returns `"cancelled"` rather than throwing — it is a decision, not a failure.

## Server state

TanStack Query, with the same rules as the web app: keys come from `queryKeys` in `src/lib/query.ts`, retry is off for 4xx and for all mutations. The cache is persisted to AsyncStorage through `PersistQueryClientProvider`, so the app opens with content rather than skeletons — that persistence is why `gcTime` is a full day.

The session query is the one exception: `staleTime: 0`, because showing a signed-out user a signed-in shell is worse than a brief wait.

## Loading states

No spinners. Standards §12 applies to mobile as written — "every screen, every component, every data-fetching boundary". `SkeletonBlock` pulses on Reanimated's UI thread, so it keeps 60fps while the JS thread is busy with the very work it is standing in for, and `ScreenSkeleton` covers the pre-session boot state that used to be an `ActivityIndicator`.

## Lists and images

`FlashList` for every list, with a memoised row component and `useCallback` for `renderItem` / `keyExtractor` — FlashList recycles rows, so an unmemoised item re-renders the whole visible window on each keystroke. `expo-image` for every image; its disk cache is what makes the catalogue usable on a second launch.

## Deliberate boundaries

Three things are intentionally *not* reimplemented on mobile, and each carries a note in the code:

- **Video playback.** The player screen tracks and marks progress; it does not ship a second video stack.
- **Profile completion.** A long, role-specific, schema-validated form. The app points at the web page rather than duplicating it.
- **Realtime messaging.** The conversation screen polls every 10s rather than holding a WebSocket, which would reconnect on every backgrounding.

## Monorepo notes

- Consumes `@mma/shared` unbuilt, from TypeScript source. `metro.config.js` adds the workspace root to `watchFolders` and `nodeModulesPaths` — without it Metro will not leave this directory.
- **`bunfig.toml` at the repo root sets `linker = "hoisted"`.** React Native can only link one copy of a native module, and bun's default isolated store produces several. Do not remove it: `expo-doctor` fails immediately, and native builds break in harder-to-diagnose ways.
- `react` / `react-dom` are excluded from the Expo version check in `package.json`. The SDK pins 19.2.3, the monorepo is on 19.2.8, and one shared copy on a newer patch is safer than two copies of React.
- This workspace now has `lint` and `typecheck` scripts, so `turbo run lint` / `typecheck` cover it. It still has no `build` — a native build goes through EAS, not Turbo.
