# Design System Specification: Mehedi's Math Academy

The visual language for **Mehedi's Math Academy**, a Bangla-first coaching platform. Derived
from the design handoff in `design_handoff_genex/`, which the academy deliberately adopted
as its warm-paper palette and which stays the authority on pixel-level questions this
document does not answer.

This replaces the previous "Digital Atelier" system wholesale. That system was
built on tonal layering, gradients, shadows and a prohibition on 1px borders.
Mehedi's Math Academy is the opposite on every one of those axes. If you find a rule from the
old system still quoted somewhere in the codebase, it is stale — fix it.

---

## 1. Creative north star

**Calm paper.** The client rejected a livelier earlier direction as visually
stressful. What replaced it reads like a well-set printed workbook: warm paper,
hairline rules, generous space, and a single orange accent used sparingly enough
that it still means something when it appears.

Three rules carry most of the weight:

1. **No shadows.** Depth comes from the background washes and hairlines.
2. **No animation** *inside the app shell*. Colour and border transitions on
   hover, nothing else — no parallax, no entrance animation, nothing lifts or
   scales. The public marketing pages are the one exception, and a recorded one:
   ADR-0012.
3. **Accent discipline.** The accent appears roughly 6–10 times per page, never
   as a large fill on a marketing page. In an app shell, exactly one button is
   accent.

---

## 2. Colour

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#23211E` | primary text, primary buttons, dark surfaces |
| Ink muted | `#4A453F` | body text inside cards, list rows |
| Muted | `#6B6763` | secondary text, nav items, descriptions |
| Muted light | `#8A857D` | labels, meta, table headers |
| Muted faint | `#A8A29A` | timestamps, counters, disabled text |
| Placeholder text | `#B4AEA6` | input placeholders, empty preview text |
| Paper | `#FCFBF9` | page background base |
| Card | `#FFFFFF` | cards, tables, panels |
| Panel warm | `#F7F5F1` | footer and closing bands, row hover on light |
| Row hover | `#FBF9F6` | table row hover inside white cards |
| Placeholder fill | `#F1EEE9` | image, avatar and thumbnail placeholders |
| Chip active | `#EFEBE4` | selected pill, active nav item background |
| Hairline | `#E8E4DE` | every 1px divider and card border |
| Hairline faint | `#F0EDE7` / `#F5F1EC` | dividers inside cards, between table rows |
| Line strong | `#C9C3BB` | underlined text links, secondary button border |
| Dot idle | `#DDD8D1` | unselected indicator dots, dashed borders |
| Bar track | `#F1EEE9` | progress and chart track |
| Bar idle | `#E4DED5` | non-peak chart bars |
| **Accent** | `#EE5622` | active dots, enrol links, peak chart bar, alerts, checkbox fill, one primary CTA per app shell |

**Dark actions are Ink, not accent.** The accent is for marking, not for
filling.

### The spectrum

Six hues sit beside the accent — ember, teal, indigo, violet, amber, rose — used
only at tint strength (a 10% wash with a 25% hairline, a coloured icon, a 2px
rule) and only to tell *kinds* of thing apart: a sidebar row, a subject, a kind
of exam, one number in a row of numbers. They never fill a surface, never colour
body text, and never stand in for the accent. Statuses keep the rules below
unchanged. See ADR-0011, and reach for them through `src/lib/spectrum.ts` rather
than naming a token in a component.

### The accent is a variable

The handoff ships four alternates — `#EE5622` (default), `#23211E`, `#1F6F5C`,
`#3B5BA5`. Implement it as a theme value. Never hardcode the orange.

### Status colours

There is no red/green/amber status palette. Statuses are drawn with the muted
scale plus the accent for the one that needs attention:

- neutral / success / settled → `Muted` text on `Chip active`
- needs attention (stuck payment, licence expiring, pending approval) → accent text
- withdrawn / refunded / archived → `Muted faint`

Validation errors are the one exception and stay `#BA1A1A`.

---

## 3. Page background

Applied once, at the outermost container, by the shared `PageBackground`:

```css
background-color: #FCFBF9;
background-image:
  radial-gradient(#EDE6DD 1px, transparent 1px),
  radial-gradient(920px 550px at 92% -8%, rgba(238, 86, 34, .05), transparent 70%),
  radial-gradient(780px 470px at -3% 40%, rgba(31, 111, 92, .045), transparent 72%),
  radial-gradient(870px 520px at 100% 90%, rgba(59, 91, 165, .04), transparent 70%);
background-size: 27px 27px, auto, auto, auto;
```

A 27px dot grid plus three corner washes — orange, sage, blue.

Panels sitting **on** that background are translucent white so the texture shows
through:

| Surface | Value |
| --- | --- |
| Sidebars, filter rails | `rgba(255,255,255,.5)` |
| Right rails (buy column, builder preview) | `rgba(255,255,255,.45)` |
| Full-width bands | `rgba(255,255,255,.55)` |
| Sticky headers | `rgba(252,251,249,.78)` marketing, `.82` app shells |

Cards **inside** those areas are solid `#FFFFFF` with a `1px #E8E4DE` border.

---

## 4. Typography

- **Hind Siliguri** — body, UI, headings. Weights 300, 400, 500, 600.
- **Archivo** — Latin numerals, IDs, small all-caps labels. Weights 400–600.

Long paragraphs are weight **300**. Headings are **500** and never 700+ — the
calm register depends on it. `letter-spacing: -.01em` on headings ≥32px,
`text-wrap: pretty` on long paragraphs.

| Role | Size / weight / line-height |
| --- | --- |
| Marketing h1 | 44–54px / 500 / 1.25 |
| Dashboard h1 | 34px / 500 / 1.3 |
| Section h2 | 30–38px / 500 / 1.3–1.35 |
| Card or row title | 20–24px / 500 / 1.35 |
| Sub-head (h3) | 22–23px / 500 |
| Lead paragraph | 19–20px / 300 / 1.85 |
| Body | 17–18px / 300 / 1.8–1.9 |
| Table cell | 17px / 300–400 |
| Nav item | 17px / 400 |
| Label, meta | 15–16px / 300–500 |
| Stat number | 26–30px / 500 |
| Archivo label | 11–14px, `letter-spacing: .06em` |

Those are the desktop sizes. See §8 for how they scale down.

**Bilingual note.** Headings are sized for Bangla, which runs roughly 20% longer
than the English equivalent. Never constrain a text container to a fixed width,
and check both locales at every breakpoint.

---

## 5. Spacing, radius, shape

- Section padding: marketing `56px` horizontal / `56–96px` vertical; dashboards `34–40px`.
- Header height: `82px` marketing, `74px` app shells. Sidebar `238px`. Right rails `380–396px`. Filter rail `296px`.
- Gaps: `8–10px` chips, `18–24px` cards, `48–72px` big columns. Use flex/grid `gap`, never margins.
- Radius: `4px` buttons and inputs, `100px` pills, `50%` dots and avatars, `3px` checkboxes. **Cards are square — 0px.**
- Borders: `1px #E8E4DE` default, `1.5px` on decorative rings and step circles, `1px dashed #DDD8D1` on advisory and upload boxes.
- **No shadows anywhere.**

---

## 6. Components

### Buttons

| Variant | Style |
| --- | --- |
| `ink` | `#23211E` fill, paper text, 4px radius. The default primary. |
| `outline` | transparent, `1px #C9C3BB` border, Ink text |
| `ghost` | no fill, Muted text; `#F7F5F1` on hover |
| `accent` | accent fill. **One per app shell**, no more |
| `accentLink` | accent text with a trailing arrow, no fill — the "enrol" affordance |

No gradients, no shadows, no transform on hover.

### Cards

Square, solid white, `1px #E8E4DE`. Hover raises the border to `#C9C3BB` and
nothing else moves.

### Pills

Unselected: transparent with a `1px #E8E4DE` border. Selected: `#EFEBE4` fill,
Ink text, no border change. 100px radius.

### Inputs

4px radius, `1px #E8E4DE`, white fill, `#B4AEA6` placeholder. Focus darkens the
border to `#C9C3BB`. No glow.

### Tabs

2px accent bottom border on the active tab, Ink label. Inactive tabs are Muted
with no border.

### Accordions

Independent — opening one never closes another. `+` / `–` as text at the right
edge. One item open by default.

### Tables

White card, `1px #E8E4DE` outer border, `1px #F5F1EC` between rows. Header cells
are Muted light, 15–16px. Row hover `#FBF9F6`.

### Progress

Chunked, not a thin line. Filled chunks in the accent, track in `#F1EEE9`,
square chunks with a small gap. The chunk-count rounding lives in
`resolveProgressChunks` in shared code so web and mobile fill the same number.

### Counters

**Always derived, never hardcoded** — pending questions, pending approvals,
tasks done, module and lesson counts, filtered result counts, checklist scores.
A counter that can drift out of step with what it counts is a bug.

### Empty states

A dashed `1px #DDD8D1` box with a Muted sentence. Every list that can be empty
needs one.

---

## 7. Doodles

Decorative, subtle, all CSS — no illustration files. A small reused set:

1. **Hand-drawn ring** around one word in a heading — absolutely positioned span, `border: 2px solid <accent>`, `border-radius: 50%`, `opacity: .32–.4`, `rotate(-3deg)`, `pointer-events: none`, inset `-12px` horizontally.
2. **Dot patch** — `radial-gradient(#E2DDD6 1.5px, transparent 1.5px)` at `15px 15px`, roughly 100–130px square, in a section corner.
3. **Quarter arc** — 64–76px circle, `1.5px solid #E6E0D8` with top and right border colours transparent, rotated about -24deg.
4. **Diamond trio** — three 7px squares rotated 45°, tints `#E6DFD6`, `#EBE4DB`, `#F0EAE2`.
5. **Hatched rule** above closing bands — `repeating-linear-gradient(45deg, #EAE3DA 0 2px, transparent 2px 8px)`, 6px tall.
6. **Circled step number** — 44px circle, `1.5px #E8E4DE`, accent numeral.
7. **Play glyph** — `clip-path: polygon(0 0, 100% 50%, 0 100%)` on a small div. No icon font.

Any section owning a doodle is `position: relative; overflow: hidden`.

---

## 8. Responsive

The handoff is authored at a fixed 1440px. This codebase ships **fully
responsive**, mobile-first, with 1440px as the desktop target.

- Two-column marketing bands collapse to one.
- The filter rail and both dashboard sidebars become drawers.
- Tables become stacked cards.
- Right rails (buy card, builder preview) move below the main column.
- Touch targets ≥44px.
- Section padding steps down: `56px` → `24px` at the small breakpoint.
- Display type steps down: marketing h1 `54px` → `32px`, dashboard h1 `34px` → `26px`.

Nothing about the calm register changes on mobile. Still no shadows, still no
motion.

---

## 9. Assets

`apps/web/public/brand/` holds the logo:

- `mma-mark.png` (361×360, transparent) — orange **G** with a black play triangle. Light backgrounds.
- `mma-wordmark.png` (958×210, transparent) — "GENEX", black, italic condensed with a reversed E.
- `mma-mark-light.png`, `mma-wordmark-light.png` — white-knockout, for dark backgrounds.

Header lockup: mark at `28px` high (26px in app shells) plus wordmark at `16px`
(15px), `9px` gap, both `display: block`.

> ⚠️ These were traced from a white-background JPG. Get the original vector from
> the client before shipping.

Photography, thumbnails and avatars fall back to `#F1EEE9` rectangles with an
Archivo caption. Keep the aspect ratios.

---

## 10. Localisation

UI chrome is bilingual — Bangla default, English switchable. User-authored
content (course titles, descriptions, category names, notices, messages) stays
in whatever language it was written in.

Keep the Bangla register plain: short sentences, informal "তুমি", no marketing
bravado. Bangla numerals (০১২৩৪৫৬৭৮৯) when the locale is `bn`, `৳` before
amounts, dates written out ("১২ আগস্ট"). The digit mapping, currency and date
formatters are shared so web and mobile agree.

---

## 11. Don'ts

- Don't add a shadow. Not a subtle one either.
- Don't animate. No entrance, no lift, no scale, no spinner.
- Don't round a card.
- Don't use the accent as a large fill on a marketing page.
- Don't hardcode the accent hex — it is a theme variable with four alternates.
- Don't reach for a red/green status palette; see §2.
- Don't hardcode a count that could be derived.
- Don't constrain text to a fixed width — Bangla is longer than English.
