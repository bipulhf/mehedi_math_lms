# AGENTS.md — `@genex/auth`

Better Auth configuration, shared between the web app and the API. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

## Entry points

| Export | File | Used by |
| --- | --- | --- |
| `@genex/auth/server` | `src/server.ts` | `apps/api` (session verification), `tooling/scripts` (`createPasswordHash`) |
| `@genex/auth/tanstack-server` | `src/tanstack-server.ts` | `apps/web` — serves the Better Auth HTTP handler at `/api/auth/*` |
| `@genex/auth/client` | `src/client.ts` | `apps/web` browser code (`authClient`) |
| `@genex/auth` | `src/index.ts` | re-exports `client` + `server` |

`src/phone-otp.ts` is not an entry point. It holds the phone/OTP plugin and its cooldown hook, and **both** server configs build from it — see below.

## Read this before touching the configs

**`src/server.ts` and `src/tanstack-server.ts` are two near-duplicate `betterAuth({...})` calls that must be kept in sync by hand.** They differ deliberately in exactly two ways:

1. `tanstack-server.ts` adds the `tanstackStartCookies()` plugin (needed to set cookies through TanStack Start).
2. `server.ts` has a `databaseHooks.user.create.before` hook that generates a unique `slug` for new users. **`tanstack-server.ts` does not.**

Point 2 has a consequence: since the web app is the one actually handling sign-up, users created through the web flow get no slug. That is why `tooling/scripts/backfill-user-slugs.ts` exists. If you change user creation behaviour, decide which config the change belongs in — and prefer fixing the divergence over deepening it.

**Sign-in with a phone number is configured in one place, `src/phone-otp.ts`.** `createPhoneOtpPlugin()` and `phoneOtpCooldownHook` are imported by both server configs, deliberately, so the one part of this pair that is genuinely new cannot drift the way points 1 and 2 did. It reads the brand from `@genex/shared` (`appName`, `appDomain`), so nothing in it is per-deployment. [ADR-0016](../../docs/adr/0016-a-phone-number-is-a-second-front-door.md) explains the identity decisions; the short version is that a phone is a *second* door, the submitted number is the account key and must arrive already canonical, and an unknown number becomes an account on its first successful verify.

**`src/factory.ts` is dead code.** It exports `createAuth()`, which nothing imports. Do not add to it or "wire it up" as part of an unrelated change; if you consolidate the three configs, that is a deliberate, standalone refactor.

## Configuration shape

Shared by all server configs:

- Zod-validated env: `APP_URL`, `BETTER_AUTH_SECRET` (required), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Parsed at import time, so importing this package without `BETTER_AUTH_SECRET` throws.
- `BETTER_AUTH_URL` points at the **web** origin (`http://localhost:3000` locally), because the handler is mounted in `apps/web`.
- Google OAuth self-disables when the client id/secret are still `"replace-me"`. Keep new integrations guarded the same way.
- `trustedOrigins` covers the web app, the API, and Expo dev origins (`localhost:8081`, `exp://127.0.0.1:8081`).
- Drizzle adapter over `@genex/db`, with the model-name mapping `user → users`, `account → accounts`, `session → sessions`, `verification → verification_tokens`. Changing a table or column name in `@genex/db` means updating this mapping.
- IDs are UUIDs (`advanced.database.generateId: "uuid"`).
- Email/password enabled, 8–128 chars, `autoSignIn: true`.
- Password reset: `sendResetPassword` hands the link to `@genex/mailer`, tokens live one hour (`passwordResetExpirySeconds`, shared with the mail so the two cannot disagree), and `revokeSessionsOnPasswordReset` is on — a reset is how somebody takes a lost account back, so every other session goes with it. The mail throws when SMTP is unset, which Better Auth turns into a 500 in the log rather than a silent nothing. The web pages are `apps/web/src/routes/auth/forgot-password.tsx` and `reset-password.tsx`.
- Rate limiting: 100 requests / 15 min globally, 5 / 15 min on `/sign-in/email`, `/sign-up/email` and `/reset-password`, 3 / 15 min on `/request-password-reset` and `/phone-number/send-otp`, 10 / 15 min on `/phone-number/verify`. The two low ones cost something a caller does not pay for — a mail into somebody else's inbox, an SMS out of our balance — so the global limit would let a script run up either. **Disabled entirely when `NODE_ENV=development`.**
- `hooks.before` is the per-handset OTP cooldown from `src/phone-otp.ts`. It is a second limit, not a duplicate: Better Auth counts per IP and path, and a script rotating IPs against one number walks straight past that. It has to run before the endpoint, because the plugin writes the verification row and only then calls `sendOTP`.

### Plugins

- `admin({ defaultRole: "STUDENT", adminRoles: ["ADMIN"] })` — role values come from `@genex/shared` (`STUDENT | TEACHER | ACCOUNTANT | ADMIN`).
- `createPhoneOtpPlugin()` — Better Auth's `phoneNumber` plugin, configured in `src/phone-otp.ts`. Adds `/phone-number/send-otp`, `/phone-number/verify` and the password endpoints we do not use. It brings its own `users` columns (`phone_number`, `phone_number_verified`), so they are **not** in `additionalFields` — they are in `@genex/db`'s `users` table and the plugin's own schema.
- `customSession(...)` — lifts `role`, `profileCompleted`, and `isActive` from the user onto the **session** object. This is why consumers read `session.session.role`, not `session.user.role`. `src/client.ts` mirrors this with `customSessionClient<ServerAuth>()`, typed against `tanstack-server.ts`.

### Additional user fields

`slug`, `profileCompleted` (default `false`), `isActive` (default `true`). The latter two are `input: false` — they cannot be set by a client and must be changed server-side. Adding a field means updating `additionalFields` in **both** server configs, the `customSession` callback if it should reach the session, and the `users` table in `@genex/db`.

## Exported types

`AuthSessionPayload`, `AuthUser`, `AuthSession` (from `src/server.ts`) — the API's `AppVariables` in `apps/api/src/types/app-bindings.ts` is typed against these.
