# AGENTS.md — `mobile`

Expo / React Native app with Expo Router. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply where relevant — but read the caveats below first, because this workspace is not yet wired into the monorepo the way the others are.

```bash
bun run start     # expo start
bun run android
bun run ios
bun run web
```

## Current state

**This is still the unmodified `create-expo-app` tabs template.** `app/` contains `_layout.tsx`, `modal.tsx`, `+not-found.tsx`, `+html.tsx`, and `(tabs)/index.tsx` / `(tabs)/two.tsx`; `components/` holds `Themed.tsx`, `EditScreenInfo.tsx`, `ExternalLink.tsx`, `StyledText.tsx`, and the `useColorScheme` / `useClientOnlyValue` helpers. No product code exists yet.

Do not treat the existing files as house style. When real screens land, they should follow the repo's conventions, not the template's.

## Divergences from the rest of the monorepo

Be aware of these before making changes — several are things to fix as the app is built out, not patterns to copy:

- **Package name is `mobile`, not `@mma/mobile`.** Every other workspace uses the `@mma/*` scope.
- **No workspace dependencies.** It does not consume `@mma/shared`, `@mma/auth`, or `@mma/db`. Any API contract used here should come from `@mma/shared` rather than being redeclared.
- **Own TypeScript config.** Extends `expo/tsconfig.base` with `strict: true`, not `packages/config/tsconfig.base.json`. It does not get `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, or `verbatimModuleSyntax`. Its path alias is `@/*` → `./*` (workspace root), not `./src/*`.
- **Own pinned TypeScript** (`~6.0.3`) in devDependencies rather than inheriting the root one. It currently matches the repo version, but `expo install --fix` owns that pin and will move it to whatever the installed Expo SDK expects.
- **No `lint`, `typecheck`, or `build` scripts**, so `turbo run lint` / `typecheck` / `build` skip this workspace entirely. CI-style checks at the root will not catch errors here.
- **Component filenames are PascalCase** (`EditScreenInfo.tsx`), whereas the web app uses kebab-case.

## When building real features

- API base URL and auth: the API already trusts the Expo dev origins (`http://localhost:8081`, `exp://127.0.0.1:8081`) in both its CORS config and Better Auth's `trustedOrigins`. Note that Better Auth's HTTP handler is served by the **web** app at `/api/auth/*`, not by the API — see the root `AGENTS.md`.
- Reuse `@mma/shared` for validators, roles, and constants; add it as a `workspace:*` dependency rather than copying types.
- The API response envelope is `{ status, message?, data }` with `{ status, data, pagination }` for paginated lists. Match `apps/web/src/lib/api/client.ts`.
- Adding `lint` / `typecheck` scripts and moving onto the shared TS config would bring this workspace under the root checks. Worth doing as its own change.
