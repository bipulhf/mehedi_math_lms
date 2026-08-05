---
status: accepted
---

# Marking is stored as a vector overlay, not burned into the page

A teacher's Marking is kept as data — elements with normalised coordinates in one JSONB document per Script
Page — and drawn over the student's page at display time. No flattened, marked-up image file is ever
produced.

## Context

A teacher marks with a pen, an eraser, tick and cross stamps, and short text notes. The obvious
implementation is the one every scanned-worksheet tool reaches for: render the canvas to a PNG on save and
serve that. It displays anywhere with no client work.

Two things argue against it here. Marks are corrected — a teacher re-adds a half mark, moves a tick, fixes a
note — and an Admin can reopen a graded paper for exactly that. And because a Script Page keeps no original
(ADR-0009), a flattened file would be the *only* copy: burning ink into the one image the student ever
uploaded destroys the evidence of what they wrote.

## Decision

- The Marking for a page is one JSONB column on the Script Page row: a versioned document of elements
  (stroke, stamp, note), each with coordinates normalised 0–1 against the page.
- Coordinates are normalised, not pixels, so the same Marking renders correctly on a thumbnail, a
  full-screen marking canvas, and a phone.
- The eraser deletes whole elements. There is no masking element, so render order never becomes load-bearing
  and "erase the eraser" is not a question anyone has to answer.
- The document carries a version field; its shape is validated by a shared Zod schema, so web and mobile
  cannot drift.
- No flattened copy is generated, on submit or otherwise.

## Considered options

- **Flatten to an image on save.** Rejected — not re-editable, roughly doubles storage per page, and with no
  original retained it would overwrite the only record of the student's own work.
- **Keep the overlay data *and* render a flattened copy when the paper is submitted.** Rejected for now:
  two artifacts to keep consistent and a render job in the worker pipeline, bought for a use case (PDF
  export, printing) nobody has asked for. Reversible — the data is there to render from whenever it is.
- **A row per element instead of a JSONB document.** Rejected — hundreds of rows per page and a write per
  stroke, to make queryable something nothing queries.
- **One overlay per (page, teacher), merged on display.** Rejected — it contradicts the per-answer lock
  taken to prevent exactly that collision, and merging layers is a display problem invented for a
  concurrency problem already solved.

## Consequences

- Every surface that shows a marked page must render the overlay: web, mobile, and anything printed or
  exported later. There is no path where a plain `<img>` shows the Marking.
- The JSONB shape is effectively an API. Changing it means a version bump and a reader that handles both.
- Because Marking sits over an unmodified page, an Admin reopening a graded paper gives the teacher back a
  fully editable layer rather than a picture to draw on again.
