---
status: accepted
---

# User accounts are deactivated, never deleted

Deactivation is the only terminal state a user account has. `DELETE /api/v1/admin/users/:id` and
`softDeleteUser()` are removed rather than made real.

## Context

The two endpoints were indistinguishable. `admin-user-repository.ts:303` implemented "soft delete" as
`updateUserStatus(userId, false, "Deleted by admin")` — identical to a deactivation apart from the literal
ban reason. No table carried a `deletedAt` column and no PII was ever anonymised, so a "deleted" user kept
their email (on a unique index, meaning the address could never be reused), name, profile, enrolments,
payments, and messages.

Deletion was a promise the platform could not keep. Payments are financial records, `messages` were
deliberately designed to be undeletable, and test submissions are academic records — none of it is data
anyone would actually agree to destroy on request.

## Decision

One verb, one state. An account is Active or Deactivated; a Deactivated account cannot authenticate and
retains every record the person produced.

## Consequences

An erasure request cannot be served by the product as it stands. Meeting one would need a deliberate
anonymisation feature — rewriting the email to a tombstone value, clearing the profile and photo,
reattributing authored content to "Deleted user" — while leaving the financial and academic ledger intact.
That is a separate decision, to be taken when it is actually required rather than assumed to already work.
