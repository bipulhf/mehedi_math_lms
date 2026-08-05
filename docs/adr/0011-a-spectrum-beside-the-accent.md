---
status: accepted
---

# A six-hue spectrum sits beside the accent, at tint strength only

DESIGN.md §2 ships one saturated colour — the accent — and a muted grey scale for
everything else. That stays true of surfaces, text and actions. Alongside it there
is now a small spectrum, used at roughly ten percent strength to tell *kinds of
thing* apart: a nav row, a subject, a kind of exam, a number in a row of numbers.

## Context

The calm-paper direction was a deliberate answer to a livelier design the client
had rejected as visually stressful, and it reads well on a page with one thing on
it. It reads much less well now that the app is mostly lists: a dashboard of six
identical white cards with grey labels, a sidebar of nine grey rows, an exam list
where a written paper and a multiple-choice paper look the same until you read
the sentence under the title.

The owner asked for the product to feel less dull, twice. The question was never
whether to add colour but how much, and where it would stop.

## Decision

- Six hues live as tokens in `app.css`: ember (the accent itself), teal, indigo,
  violet, amber, rose. Two are the handoff's own accent alternates and the rest
  are pitched at the same warmth, so the set reads as coloured tabs in a printed
  workbook rather than as a chart legend.
- They are only ever used at tint strength — a 10% background with a 25% hairline,
  or a coloured icon, or a 2px rule down the edge of a card. Never a fill, never
  body text, never a button.
- They carry **kind, not status**. Statuses keep the rules DESIGN.md §2 set: muted
  for everything settled, accent for the one thing that needs acting on, and no
  red/green/amber traffic lights. `Badge` gained three spectrum tones for kinds,
  and its status tones are untouched.
- A hue is stable for a given thing. `hueForKey` hashes a slug so a subject is the
  same colour on every page and after every deploy; `hueForIndex` covers fixed
  lists like the sidebar.
- The accent stays rationed as before: one accent action per app shell, and the
  spectrum never stands in for it.

## Considered options

- **Leave DESIGN.md alone and add nothing.** Rejected — the owner asked twice,
  and "the design system says no" is not an answer to a product that reads as
  flat to the person who owns it.
- **Colour statuses instead (green settled, red failed).** Rejected — that is the
  traffic-light palette §2 explicitly threw out, and it would make every
  successful payment shout as loudly as a stuck one.
- **One extra hue rather than six.** Rejected — a second colour distinguishes
  nothing on its own; the point is telling six sidebar rows or two exam kinds
  apart.

## Consequences

- DESIGN.md §2 is no longer the whole truth about colour and now points here.
- Anything reaching for a hue should go through `src/lib/spectrum.ts` rather than
  writing a token name into a component, so the strengths stay uniform and the
  palette can be re-tuned in one place.
- The mobile app has its own token file and is not covered by this. It stays as
  it was until the same treatment is deliberately ported.
