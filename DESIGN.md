# Design System Specification: Mehedi's Math Academy

The visual language for **Mehedi's Math Academy**, a Bangla-first coaching platform.

The palette is the logo's: **blue `#007BFF`** for trust and every primary
control, **gold `#F5A723`** for warmth, and a large neutral field around both.
Roughly 70–80% of a screen is neutral, 15–20% blue and 5–10% gold; a page that
reads as colourful has broken the ratio, not enriched it.

The web app ships two themes — a bright academic light theme and a dark navy
one — and they are the same design, not an inversion of each other. The mobile
app ships the dark theme only.

---

## 1. Creative north star

**A quiet classroom that reads for hours.** Blue marks what a student can act
on, gold marks what is worth remembering, and everything else stays neutral so
neither has to compete to be seen.

Three rules carry most of the weight:

1. **The theme is the reader's.** `<html data-theme>` decides light or dark and
   is remembered in a cookie. `data-surface="ink|paper"` is the local override,
   for a region that must stay dark or light whatever the reader chose — a
   panel over a photograph, a printed certificate.
2. **Two-colour hierarchy.** Blue is the primary interactive accent and carries
   every primary control; gold is rationed to badges, marks, highlights and the
   one decisive secondary action. Red, green and amber stay conventional — a
   status colour is a message, not a brand decision.
3. **Motion with restraint.** Marketing may use rise, fade-up, marquee and floaty
   effects. App surfaces use short colour, border and opacity transitions. Every
   animation must stop under `prefers-reduced-motion`.

---

## 2. Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `#F7F9FC` | `#0B1220` | the page itself |
| `card` | `#FFFFFF` | `#172033` | the surface content sits on |
| `panel-warm` | `#F1F5F9` | `#111827` | secondary surface, header, hover fill |
| `popover` | `#FFFFFF` | `#1E293B` | anything that floats: dialogs, menus, toasts |
| `input` | `#FFFFFF` | `#111827` | a field's own fill |
| `paper` | `#FFFFFF` | `#FFFFFF` | literal white, for text and chips over media |
| `ink` | `#172033` | `#F8FAFC` | primary text |
| `ink-muted` | `#334155` | `#CBD5E1` | secondary text |
| `muted` | `#5B6779` | `#94A3B8` | running copy and metadata |
| `muted-light` / `muted-faint` | `#616D80` / `#667085` | `#8A9AB0` / `#8496AE` | supporting labels |
| `hairline` | `#E2E8F0` | `#283548` | dividers and borders |
| `line-strong` | `#CBD5E1` | `#3A4A63` | focused and emphasised borders |
| **`brand-blue`** | `#007BFF` | `#007BFF` | the logo's blue: rings, tints, rules |
| **`accent`** | `#0069DB` | `#4D9FFF` | what that blue reads at as text or a fill |
| `on-accent` | `#FFFFFF` | `#0B1220` | text on top of `accent` |
| **`brand-orange`** | `#F5A723` | `#F5A723` | gold badges, marks, the decisive action |
| `brand-gold` | `#9A6300` | `#F5C066` | gold as *text*: formulas, highlights |
| `error` | `#DC2626` | `#F87171` | validation and destructive feedback |
| `success` | `#15803D` | `#4ADE80` | passed, settled, active |
| `warning` | `#B45309` | `#FBBF24` | needs attention, not yet wrong |

### Why `brand-blue` and `accent` are two tokens

`#007BFF` is 3.98:1 against white and 4.09:1 against the dark card — enough for
a 2px rule, short of the 4.5:1 a word a student is meant to click needs. So the
logo's blue stays the identity and `accent` is the shade it actually reads at:
a step darker on light, a step lighter on dark. `on-accent` flips with it, which
is why a primary button is white-on-blue in the light theme and navy-on-blue in
the dark one.

### Accent roles

Do not create a rainbow status palette. Blue and gold carry the brand roles, and
the six `spectrum-*` hues exist only to tell a list apart (ADR-0011). Tints use
alpha on the same colour (`bg-accent/10`, `border-brand-orange/30`) rather than
introducing near-duplicate hex values.

### The accent is a variable

Implement brand colours as theme values. Never hardcode blue or gold in
component markup. Both themes re-declare the whole token set in
`apps/web/src/styles/app.css`; a colour that only exists in one of them is a
colour that breaks in the other.

### Status colours

Success is green, attention is amber, destructive and validation are red, and
none of them are re-hued to the brand. Never communicate state by colour alone —
pair it with a word or a mark.

---

## 3. Surface model

The page-level theme is `<html data-theme="light|dark">`, set from a cookie so
the server renders it and nothing flashes. A region that must not follow the
reader's choice declares its own surface, and the surface owns the whole token
set, so dialogs, menus and portals do not inherit the wrong contrast from their
trigger.

```tsx
<section data-surface="ink">...</section>
<section data-surface="paper">...</section>
```

Reach for `data-surface` when the content decides the contrast — a caption over
a video, a certificate that will be printed. Reach for nothing at all otherwise:
the theme is already correct.

---

## 4. Typography

- **Geist** — Latin UI and display text. Weights 400–700.
- **Hind Siliguri** — Bangla display text and headings. Weights 400–700.
- **Solaiman Lipi** — Bangla running copy. Weights 400 and 700.
- **Georgia** — formulas and mathematical identity text.

Body copy stays 400. Display headings may reach 700 for a confident editorial
voice. Use `text-wrap: pretty` for long copy and keep Bengali text unconstrained.

| Role | Size / weight / line-height |
| --- | --- |
| Marketing hero | `clamp(34px, 6.2vw, 92px)` / 700 / 1.02 |
| Wordmark display | `clamp(34px, 10.4vw, 176px)` / 700 / 1.02 |
| Section h2 | `clamp(28px, 3.2vw, 56px)` / 700 / 1.08 |
| Card title | `clamp(22px, 2vw, 32px)` / 700 / 1.15 |
| Lead paragraph | `clamp(16px, 1.3vw, 20px)` / 400 / 1.7 |
| Body | `clamp(15px, 1.1vw, 17px)` / 400 / 1.72 |
| UI action | `clamp(16px, 1.15vw, 18px)` / 600 / 1.2 |
| Eyebrow | `clamp(11px, .85vw, 13px)` / 600 / 1.4 |
| Formula | `clamp(22px, 2.8vw, 46px)` / Georgia / 1.2 |

Those are the desktop sizes. See §8 for how they scale down.

**Bilingual note.** Headings are sized for Bangla, which runs roughly 20% longer
than the English equivalent. Never constrain a text container to a fixed width,
and check both locales at every breakpoint.

---

## 5. Spacing, radius, shape

- Page gutter: `clamp(16px, 3.2vw, 52px)`.
- Section spacing: `clamp(72px, 8.5vw, 140px)`.
- Grid gap: `clamp(14px, 1.8vw, 28px)`; split gap: `clamp(24px, 4vw, 72px)`.
- Radius: `14px` cards, `18px` slabs, `100px` pills, `8px` controls unless a
  component needs a smaller radius for dense data.
- Borders: alpha hairlines on ink, neutral hairlines on paper.
- No shadows. Depth comes from surface contrast, borders and colour blocks.

---

## 6. Components

### Buttons

| Variant | Style |
| --- | --- |
| `ink` | `accent` fill, `on-accent` text. The primary action. |
| `accent` | `brand-orange` fill, navy text. One decisive CTA per section. |
| `danger` | `error` fill, `on-error` text. Destructive only, and still red. |
| `outline` | transparent, `line-strong` border; takes the accent on hover |
| `ghost` | transparent, muted text; `panel-warm` on hover |
| `accentLink` | accent text with a trailing arrow |

Buttons carry hover, focus-visible, active, disabled and `aria-busy` (loading)
states. Loading is an attribute, not a prop: a caller marks the control busy and
it dims and stops taking clicks.

Use gradients only for atmospheric background washes and footer depth. Short
colour, opacity and scale transitions are allowed when they communicate state.

### Cards

Cards are rounded plates: `14px` radius, `card` fill, one hairline. Depth comes
from the border and the change of surface. `--shadow-plate` is the single
exception — a hairline of lift in the light theme, where white on off-white has
no surface contrast to fall back on, and `none` in the dark theme.

### Pills

Unselected: transparent with a hairline. Selected: `chip-active` tint,
foreground text, 100px radius.

### Inputs

`8px` radius, `input` fill, one hairline and a muted placeholder. Focus takes
the brand blue on the border and one hairline of ring — enough to find the field
on either theme, short of a glow. An invalid field takes the `error` border.

### Tabs

2px accent bottom border on the active tab, foreground label. Inactive tabs are
muted with no border.

### Accordions

Independent — opening one never closes another. `+` / `–` as text at the right
edge. One item open by default.

### Tables

`card` plate, hairline outer border, `hairline-fainter` row dividers. The header
row takes `panel-warm` so it separates from the rows under it. Row hover uses
`row-hover`.

### Progress

Chunked, not a thin line. Filled chunks use `accent`, action milestones use
`brand-orange`, the track uses `bar-track`, with a small gap. The chunk-count rounding lives in
`resolveProgressChunks` in shared code so web and mobile fill the same number.

### Counters

**Always derived, never hardcoded** — pending questions, pending approvals,
tasks done, module and lesson counts, filtered result counts, checklist scores.
A counter that can drift out of step with what it counts is a bug.

### Empty states

A dashed alpha-hairline box with a muted sentence. Every list that can be empty
needs one.

---

## 7. Doodles

Decorative, contextual, mostly CSS. Use the supplied mark and founder image as
identity assets; use these effects for the public marketing surfaces:

1. **Blue/gold rule** — a short 2–3px line under a page eyebrow or beside a CTA.
2. **Atmospheric wash** — a blurred blue or gold radial gradient, mixed from the
   brand tokens so it follows the theme; never use it as content fill.
3. **Marquee** — repeated academy statements or course categories, 46s linear;
   stop under reduced motion.
4. **Rise / fade-up** — public content enters with a single staggered sequence.
5. **Formula accent** — Georgia italic display text for mathematical identity.

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

The ink-first register remains on mobile. Reduce decoration and motion, preserve
44px touch targets, and keep all text within the fluid gutter.

---

## 9. Assets

`apps/web/public/brand/` holds the academy artwork:

- `mma-mark.png` (220×220, transparent) — the academy's M mark with lightning and bulb.
- `mma-logo.png` (500×500, transparent) — the full Mehedi's Math Academy lockup.
- `mehedi-bhai.jpeg` (640×640) — founder portrait used on the About page.

Headers use the full square lockup at `56px` (44px in app shells). The mark-only
asset handles favicon, app icons, previews and the lecture watermark.

The supplied PNG artwork is processed to transparency before use.

Photography, thumbnails and avatars use surface-aware placeholder panels. Keep
the founder portrait square and do not crop the face on narrow screens.

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

- Don't reach for `data-surface` where the page theme is already right.
- Don't use blue or gold outside their semantic roles.
- Don't ship a colour to one theme and not the other.
- Don't add shadows anywhere. Use borders, surface contrast and colour blocks.
- Don't animate without a reduced-motion fallback.
- Don't use a rainbow status palette; see §2.
- Don't hardcode a count that could be derived.
- Don't constrain text to a fixed width — Bangla is longer than English.
