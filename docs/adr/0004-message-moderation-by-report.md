---
status: accepted
---

# Reporting is what unlocks Admin access to a private conversation

Teacher–student conversations stay private and permanent by default. Either participant can report one,
and that report — nothing else — grants an Admin the right to read that single conversation. An Admin may
then hide individual messages behind a tombstone; the original text is retained.

## Context

Messaging was built as a permanent 1-to-1 channel between a teacher and a student, with no way for anyone
to delete a message. That rule is correct for participants: it stops someone retracting what they said.

But it had been implemented as a total absence of moderation. There was no report, block, or hide route,
no `deletedAt`, and `message-service.ts:155` restricted reads to participants, so an Admin could not see a
conversation even when a complaint was made about it. `message-service.ts:186` limits conversations to
teacher–student pairs, and the student profile carries `dateOfBirth`, `guardianName`, `guardianPhone`, and
`institution` — the students are school-age children.

That left an adult with a permanent, private, unreportable channel to a minor, where the only available
response to a complaint was deactivating the teacher's entire account, which neither surfaced nor removed
what had been sent. Comments already had the right shape — `comment-service.ts:223` and `:249` let an
Admin act on any comment — and messaging had no equivalent.

## Decision

- Either participant may report a conversation, giving a reason.
- A report grants Admins read access to that conversation only. Each read is recorded in an audit trail.
- An Admin may hide a message. It renders as removed by an administrator; the original row is retained.
- Participants still cannot delete or edit their own messages. Unreported conversations remain private to
  the two people in them.

## Considered options

- **Report and block, with Admins never reading content.** Rejected: strongest privacy, but a safeguarding
  complaint then cannot be substantiated from inside the product.
- **Admins can read every conversation, disclosed in the UI.** Rejected: makes every student conversation
  permanently readable by staff, chills legitimate private questions, and turns a compromised Admin
  account into a mass disclosure.

## Consequences

- Hiding is not deletion. Retaining the original is deliberate — it preserves evidence for a complaint that
  may be pursued outside the platform.
- The audit trail is part of the control, not an optional extra. Without it, "reporting unlocks access"
  degrades into "Admins can read anything they can find a pretext for".
- Blocking is not included. A student who reports a teacher is still in a channel with them until an Admin
  acts, which is worth revisiting.
