---
status: accepted
---

# The public pages may move; the app shell still may not

DESIGN.md §1 forbids animation outright — "no parallax, no entrance animation,
nothing lifts or scales". That rule now applies to the signed-in app only. The
public marketing pages carry scroll reveals and counters that run once, both
switched off under `prefers-reduced-motion`.

## Context

The no-motion rule came from the client rejecting a livelier direction as
visually stressful, and it is right for the screens people use every day: a
dashboard that animates is a dashboard that wastes your time on the hundredth
visit. A landing page is the opposite — it is seen once, by someone deciding
whether this academy is worth their money, and stillness there reads as unfinished
rather than as calm. The owner said so twice.

The rule was also already broken. Before this change the hero carried
`animate-float-subtle`, `hover:scale-[1.04]`, a `blur-[120px]` glow and
`shadow-md`, and `app.css` held keyframes under a comment claiming it had none.
The choice was not whether the landing page moves, but whether that is written
down or left as drift.

## Decision

- Motion is allowed on the public pages: the landing sections, and anything else
  a signed-out visitor sees. Inside the dashboard, DESIGN.md §1 stands unchanged —
  colour and border transitions on hover, nothing else.
- The vocabulary is small and lives in `src/components/marketing/`: `Reveal`
  (fade-and-rise once, on entering the viewport) and `CountUp` (a figure that
  counts once). Anything more elaborate should be argued for rather than added
  quietly.

  A third primitive, `Marquee`, shipped with this ADR and was removed a day
  later along with the drifting subject band in the hero: the subjects have
  their own section immediately below, with real course counts, and a band that
  says the same words in motion was competing with it rather than adding to it.
- Every one of them is disabled under `prefers-reduced-motion: reduce`, in one
  block at the bottom of `app.css`. A reader who asked for stillness gets a still
  page, not a quieter one.
- A revealed element is laid out from the start and only its paint changes, so
  nothing reflows while the page is being read, and it reveals once — a section
  that fades out on the way back up is a flicker, not an effect.
- Numbers rendered by `CountUp` are real and server-rendered. The animation is
  the only thing JavaScript adds.

## Considered options

- **Keep the ban and make the landing page interesting through type and layout
  alone.** A real option, and the honest Swiss-print answer. Rejected because the
  owner asked specifically for the page to feel less flat after seeing that
  version.
- **Allow motion everywhere.** Rejected — it would rewrite the character of the
  screens students use daily to solve a problem that only exists on the page they
  see once.
- **Reach for a motion library.** Rejected — two CSS-driven primitives cover what
  these pages need, and a library would make the third effect easier to add than
  to justify.

## Consequences

- DESIGN.md §1 is no longer literally true and now points here.
- `apps/web/AGENTS.md`'s "no motion of any kind" note is scoped to the dashboard.
- The unused leftovers from the earlier drift — `animate-fade-up-*`,
  `animate-float-subtle`, `animate-pulse-subtle`, `hover-lift` — are deleted
  rather than left as a second, undocumented vocabulary.
