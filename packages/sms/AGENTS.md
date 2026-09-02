# AGENTS.md — `@genex/sms`

The only place this product sends SMS from. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run typecheck
bun run lint
bun run test
```

Two callers, and they want different things:

- **`sendSms`** — one message, somebody waiting on it. Today that is the sign-in OTP, called by `phoneNumber({ sendOTP })` in **both** `packages/auth/src/server.ts` and `packages/auth/src/tanstack-server.ts`. The web app is the one that serves `/api/auth/*`, so in practice the message leaves the web process.
- **`OnecodesoftSmsProvider`** — the raw bulk call, used by the API's `sms-batch-processor.ts`, which writes a row per recipient and can be resent by an admin.

This package exists because `packages/auth` cannot import from `apps/api`, and the OTP is sent from inside the auth plugin.

## Shape

| File | What it holds |
| --- | --- |
| `src/env.ts` | Zod-validated `ONECODESOFT_*`, plus the derived `isSmsConfigured` |
| `src/onecodesoft-provider.ts` | The provider's bulk endpoint, unwrapped |
| `src/send-sms.ts` | One recipient, throws when it does not arrive |

## Rules

- **A failed send throws.** Same reasoning as `@genex/mailer`: a person waiting for a code that was never sent, with nothing in the log saying so, is the failure this package exists to avoid. The bulk path is the exception — it records `FAILED` per recipient because an admin needs the list, not an exception.
- **Off is a real state.** Both `ONECODESOFT_*` default to `"replace-me"` and `isSmsConfigured` is the single test. The default is deliberate rather than `.optional()`: `.env.example` ships that literal string, and a presence test would read the placeholder as configured and post it to the provider as an API key.
- **Normalize at the edge, once.** `normalizeBdPhoneE164` lives in `@genex/shared`, not here, because the browser and the Expo app both call it before they post a number and neither can import a module that parses `process.env` at load. It returns `8801XXXXXXXXX` — thirteen digits, no `+`, because that is what OnecodeSoft accepts — or null rather than a guess. On the OTP path the returned string is the account key, so `01712345678` and `+8801712345678` must land on the same value or one person gets two accounts.
