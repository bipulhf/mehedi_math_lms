---
status: accepted
---

# A phone number is a second front door, and one code both signs in and signs up

A person may reach their account with a mobile number and a six-digit code
delivered by SMS. Email and Google keep working exactly as they did. There is
no separate registration step on the phone path: an unknown number becomes an
account when its code checks out.

## Context

Most of this product's students are in Bangladesh, where a handset is the
account somebody actually has and an inbox is the one they have to remember a
password for. The support cost of email sign-up here is not the sign-up — it is
the reset link two months later, in a mailbox nobody opens on a phone.

The pieces were already in the building. `apps/api` has sent bulk SMS through
OnecodeSoft since the admin broadcast feature, with `normalizeBdPhoneE164` and
a batch processor behind it. Better Auth ships a `phone-number` plugin. What
was missing was a decision about identity, and a place to put the sender that
both the auth package and the API could reach.

Three things forced choices rather than defaults:

1. **`users.email` is `NOT NULL` and unique.** A phone-only account has to have
   something in that column.
2. **The submitted number is the account key.** Better Auth's plugin stores the
   string verbatim as both the user's `phone_number` and the verification
   identifier. `01712345678` and `+8801712345678` are the same handset and
   would have been two accounts.
3. **Every code costs money**, and the endpoint that sends one is public.

## Decision

**Additive, not a replacement.** `users.phone_number` is nullable with a unique
index; Postgres counts nulls as distinct, so the constraint binds the people who
have a number without demanding one from anybody else. Everyone who signed up
with an email keeps signing in with it. Making phone primary would have locked
out every existing account until it linked a handset.

**One flow for both halves.** `/phone-number/send-otp` then
`/phone-number/verify`. `signUpOnVerification` creates the account on a first
successful verify, with a temporary email at `phone.<appDomain>` and the phone
number as the name. `profileCompleted` is false, so the new account lands in the
profile wizard that already exists and the real name is asked for there. The
alternative — a second onboarding path — is one more thing to keep in step.

**The temporary address is never routable and never mailed.** A person who
signed up with a handset recovers with another code, not a reset link. That is
the cost of the choice and it is accepted: the account has no inbox, so an
inbox cannot be the way back into it.

**Canonical form is demanded, not inferred.** `phoneNumberValidator` accepts a
string only when `normalizeBdPhoneE164(raw) === raw`. Every client normalizes
before it posts, and the server checks that they did, rather than normalizing
on their behalf — a server that quietly rewrote the key would let a client ship
that forgot to.

**Nothing is trusted until a code lands on it.** The backfill that copies
existing profile numbers onto `users.phone_number` leaves
`phone_number_verified` false, and `requireVerification` is on. A number
somebody typed into a profile form is not a number we have ever delivered to.
`guardian_phone` is never backfilled at all — a parent's handset must not be a
way into the student's account.

**Two rate limits, because they stop different things.** Better Auth's limiter
counts per IP and path (3 sends / 15 min). A per-handset cooldown of 60 seconds
counts per number, which is what a script rotating IPs against one victim's
phone would otherwise walk straight past. The cooldown runs as a `before` hook,
not inside `sendOTP`, because the plugin writes the verification row before it
calls the sender.

**`@mma/sms` exists because `packages/auth` cannot import `apps/api`.** The OTP
is sent from inside the plugin, which lives in the auth package, which is loaded
by the web process that serves `/api/auth/*`. The provider moved into a package
both can reach, on the model of `@mma/mailer`.

## Consequences

- `verification_tokens.token` lost its unique index. The plugin stores an OTP
  there as `"123456:0"` and inserts a row per request, so two people asking for
  a code at the same moment can draw the same six digits — under a unique index
  that is a constraint violation on a request we have already paid an SMS for.
  Nothing reads a verification by that column; `identifier` is the key.
- A phone-only account has a `@phone.<appDomain>` address in `users.email`.
  Anything that lists or exports users will show it. It must never be mailed.
- The SMS broadcast audience now prefers `users.phone_number` over the profile
  field and joins the profile tables with `leftJoin`: a student who signed in
  with a handset has a verified number before they have a profile row, and an
  inner join dropped them from every broadcast.
- `ONECODESOFT_API_KEY` / `ONECODESOFT_SENDER_ID` moved from optional to
  load-bearing. Without them phone sign-in cannot work, and the placeholder
  `"replace-me"` now reads as off — it previously passed a presence test and
  would have been posted to the provider as an API key.
- In development with no credentials the code is printed to the console instead
  of sent. That branch is guarded on `NODE_ENV === "development"` and cannot run
  on a deployed host.
