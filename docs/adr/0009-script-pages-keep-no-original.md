---
status: accepted
---

# A Script Page keeps no original — the sized-down copy is the only copy

Every other upload in this codebase stores the file exactly as it arrived and adds smaller copies beside it.
Answer Script pages do the opposite: the client shrinks the photograph before it is ever uploaded, the
server re-encodes it on confirm as a backstop, and the full-resolution original is never stored at all.

## Context

An Answer Script is many pages per Question, many Questions per paper, many papers per class — the
multiplication is what makes this different from a course cover. Straight off a phone each page is several
megabytes, and the students are on Bangladeshi mobile data, where uploading ten unshrunk pages is often the
difference between submitting and giving up.

Uploads go client-direct to storage via a presigned PUT (`prepareUpload` → client PUT → `confirmUpload`),
so the server never sees the bytes until it fetches them back on confirm. Anything the server does to the
image happens after the whole file has already crossed the student's connection.

## Decision

- The client caps the long edge at roughly 2000px, bakes in the rotation the student chose (and the EXIF
  orientation the camera set), re-encodes to JPEG, and uploads that. What leaves the phone is what gets
  stored.
- `confirmUpload` re-applies the cap server-side for Script Pages. A crafted client, or one whose canvas
  path failed, cannot put a 12MB page in the bucket.
- No original is retained. `variantWidths` still gives the small copies used for thumbnails and lists.
- Consequently there is no higher-fidelity fallback: a page too blurry or too dark to mark is re-shot by
  the student, not recovered.

## Considered options

- **Store the original and add a ~1600px marking variant** (the pattern every other purpose follows).
  Rejected on storage growth and, more decisively, on upload cost to the student — the full-size bytes still
  cross the mobile connection either way.
- **Server-only: upload whatever the camera produced, downscale and overwrite the key on confirm.**
  Rejected for the same reason — it bounds storage but not bandwidth, and makes confirm slow enough to need
  its own progress UI.
- **Client-only, with the server trusting it.** Rejected — nothing then enforces the cap.

## Consequences

- Two downscale implementations now exist per client (web canvas, React Native) plus the server backstop,
  and they must agree on the cap, the format, and the rotation handling. A disagreement shows up as pages
  that look right on one platform and wrong on the other.
- Marking coordinates are stored normalised 0–1 rather than in pixels, so a page displayed at any size —
  thumbnail, marking canvas, phone screen — renders the same Marking. See ADR-0010.
- In a dispute over what a student actually wrote, the stored page is the evidence. There is no better
  version to appeal to.
