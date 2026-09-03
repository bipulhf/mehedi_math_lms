---
status: accepted
---

# An account signs in on two devices, and the third is a log entry

A student account may hold live sessions on two devices at once. A sign-in that
would be the third is refused, and the refusal is written to a queue an
administrator works. Staff accounts are not counted. An administrator can lift
the limit for one account, sign an account out everywhere, or disable it.

## Context

One paid enrolment being used by a study group is the ordinary way this product
loses money, and the ordinary way it is done is a password in a group chat. The
signals that catch it are well known and all of them are approximations:
concurrent sessions, device diversity, impossible travel, behavioural drift.
Each one has a false positive that is somebody's actual life — a shared family
laptop, a phone on a train, a student at a cyber café.

Three constraints shaped what could be built here rather than what the fraud
literature recommends:

1. **There is no device identity to read.** Browser fingerprinting is a
   third-party dependency, an entropy arms race, and a privacy decision this
   product should not make for teenagers. A phone can report hardware
   identifiers, but a browser cannot, and the rule has to mean the same thing
   in both.
2. **A limit of one device is not what a student's day looks like.** Phone on
   the bus, laptop at a desk. A limit of one signs somebody out several times a
   day and generates support work indistinguishable from an outage.
3. **The system cannot be the one that decides somebody is cheating.** Every
   signal available here is circumstantial, and the penalty — losing access to
   a course that was paid for — is not one to hand to a heuristic.

## Decision

**Two devices, counted as devices rather than sessions.** Each client mints a
random id and keeps it: `localStorage` in the browser, the keychain on the
phone (which survives a reinstall, so reinstalling does not cost a slot). It
travels as `x-device-id` on every request the client makes. Two sessions from
one id are one device; a client that sends no id counts as a device of its own,
which is the conservative reading and keeps old builds working.

**The limit is enforced where a session is created, not where a request is
checked.** `databaseHooks.session.create.before` in both Better Auth configs
counts the account's unexpired sessions, and a third distinct device is refused
with a 403 the sign-in screen shows. Enforcing at request time would have meant
a cookie already in somebody's hands, and revoking it later is a worse
experience than never issuing it.

**The earlier devices win.** The alternative — newest wins, oldest kicked —
makes a shared password work perfectly for whoever logs in last, which is the
opposite of the point.

**Students only.** A teacher marking on a desktop while answering a message on
a phone is not this problem, and an administrator locked out of the dashboard
by their own handset is worse than any sharing it would prevent.

**A refusal is a queue entry, not a verdict.** `device_conflict_logs` records
the attempt with the device, platform, address and how many devices were
already signed in. `/dashboard/admin/devices` is the queue. Three things can
answer a row, and a person picks: lift the limit for that account
(`users.multi_device_allowed`), sign the account out everywhere so the student
can start again from the devices they still have, or disable the account on the
user screen where deactivation already lives.

## Consequences

**Nothing here stops a determined sharer.** Two people who take turns never
trip the limit, and a device id is a string in local storage that a motivated
person can copy. This is a friction and an audit trail, not a lock — and the
log is what turns the cases it does not stop into something a human can look
at.

**Clearing browser storage costs a slot** until the session it replaced
expires. The same is true of a new phone. That is what "sign out everywhere"
is for, and it is the support path this feature adds.

**The mobile Google flow needed a seam.** Its session is created inside an
in-app browser that carries none of the app's headers, so it would land with no
device id and spend a slot as an unknown device. The app claims it afterwards
over `POST /api/v1/auth/device`, which fills the device id only if the session
has none.

**Impossible travel and geolocation were left out.** Both need an IP geo
provider this product does not have, and neither changes what an administrator
would do with the queue. The address is recorded; interpreting it is a person's
job for now.
