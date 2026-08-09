# AGENTS.md — `@mma/mailer`

The only place this product sends email from. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run typecheck
bun run lint
bun run test
```

Today it sends exactly one message: the password-reset link, called by `emailAndPassword.sendResetPassword` in **both** `packages/auth/src/server.ts` and `packages/auth/src/tanstack-server.ts`. The web app is the one that actually serves `/api/auth/*`, so in practice the mail leaves the web process.

## Shape

| File | What it holds |
| --- | --- |
| `src/env.ts` | Zod-validated `SMTP_*`, plus the derived `isSmtpConfigured` |
| `src/mailer.ts` | The pooled nodemailer transport and `sendMail` |
| `src/send-password-reset.ts` | Locale choice, expiry, and the one call site's arguments |
| `src/templates/password-reset.ts` | The rendered HTML and text |

## Rules

- **A failed send throws.** `sendMail` does not catch, does not log-and-continue, and does not return a boolean nobody checks. A person waiting for a link that was never sent, with nothing in the log saying so, is the failure this package exists to avoid — the same reasoning as [ADR-0015](../../docs/adr/0015-redis-is-optional.md)'s refusal to fake a Redis write. The caller decides what the user sees; it does not get to not know.
- **Off is a real state.** Every `SMTP_*` defaults to `"replace-me"`, the same convention as the API's optional integrations, so a machine with no relay still boots and imports this package. `isSmtpConfigured` is the single test; `sendMail` throws `MailNotConfiguredError` when it is false.
- **No queue.** The only mail that exists is one the person is sitting and waiting for, and it is worthless a minute late. A future mail that nobody is waiting on gets a queue of its own; this one does not need one. See `apps/api/AGENTS.md` on why there is deliberately no `email` BullMQ queue.
- **The language comes from the request.** `localeFromRequest` reads `@mma/i18n`'s `localeCookieName` off the request that asked for the reset, so a reader who filled in a Bangla form gets a Bangla mail. No cookie means Bangla, the product default. New copy is a key in `bn.ts` first, then `en.ts` — never a string typed into the template.
- **The template is tables and inline styles.** Outlook has no flexbox and Gmail drops `<style>` blocks. This is also the one place the palette is written as hexes rather than CSS custom properties, because a mail client cannot reach a variable; keep the token name beside each one.
- **Both halves are mandatory.** `SendMailInput.text` is not optional — an HTML-only mail scores as spam.

## Adding a message

1. Copy in `packages/i18n/src/messages/bn.ts`, then `en.ts` (the second is typed against the first, so a forgotten key fails the build).
2. A renderer in `src/templates/` returning `{ html, subject, text }`.
3. A caller in `src/` that assembles the arguments, exported from `src/index.ts`.
4. A test that pins the link, the escaping, and the locale — the parts with a wrong answer rather than a missing one.
