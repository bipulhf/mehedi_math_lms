---
status: accepted
---

# An Admin may create another Admin, behind re-authentication

`ADMIN` joins `StaffRole`, so `POST /admin/users` can mint one. Doing so requires the calling Admin to
re-enter their own password, and the last remaining active Admin can never be deactivated.

## Context

`tooling/scripts/seed.ts:51` was the only code path in the repository that granted `ADMIN`. No API could
create or promote one — `StaffRole` was `TEACHER | ACCOUNTANT` and the role-update type excluded `ADMIN`
as well. With self-deactivation already refused and only one Admin in existence, the account was unique
and permanent, and recovering from a lost or compromised Admin required production shell access to re-run
the seed against a different `ADMIN_EMAIL`.

That put the platform's most consequential recovery action behind the access you are least likely to have
during the incident that demands it.

## Decision

Admins can create Admins from the UI. The creation is gated on the caller re-entering their password, and
deactivation is refused when the target is the last active Admin.

## Considered options

- **Seed-only plus a written runbook.** Rejected: keeps the bus factor at one and depends on someone
  remembering the runbook exists under pressure.
- **Promotion of an existing Teacher or Accountant, no new accounts.** Rejected as the sole mechanism —
  it presumes a suitable staff account already exists, which is not true for a fresh deployment.

## Consequences

- The privilege-escalation surface widens deliberately: a hijacked Admin session could mint a second,
  persistent Admin. Re-authentication is the control that makes that expensive, so it must not be removed
  as "friction" by a later change.
- Staff creation currently enqueues an invite onto the `email` queue that nothing consumes, so the
  temporary password reaches the new Admin only via the creation response. Creating an Admin this way is
  therefore an in-person or out-of-band act until an email worker exists.
