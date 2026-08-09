# Design System Specification: Mehedi's Math Academy

The visual language for **Mehedi's Math Academy**, a Bangla-first coaching platform.
This specification now follows the reference implementation in `../mehedi_bhai/`:
dark-first academy surfaces, electric cyan, orange action colour, rounded plates,
and editorial motion. The current warm-paper implementation is a migration source,
not the final visual authority.

Until migration completes, existing token names may remain as compatibility aliases.
New UI work follows this document and must not extend the old warm-paper palette.

---

## 1. Creative north star

**Night classroom.** Default surface is near-black ink. Cyan marks active learning,
orange marks the action a section is asking for, and yellow marks ideas, formulas
and moments worth remembering. Paper is an intentional contrast surface, not the
page default.

Three rules carry most of the weight:

1. **Ink first.** `data-surface="ink"` is default. Use `data-surface="paper"`
   for sign-in sheets, print views and other deliberate light surfaces.
2. **Three-colour hierarchy.** Cyan is the primary interactive accent, orange is
   the decisive CTA/action colour, and yellow is reserved for highlights and ideas.
3. **Motion with restraint.** Marketing may use rise, fade-up, marquee and floaty
   effects. App surfaces use short colour, border and opacity transitions. Every
   animation must stop under `prefers-reduced-motion`.

---

## 2. Colour

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#0D0D0D` | default page, app shell and footer surface |
| Paper | `#FFFFFF` | explicit light surface and print output |
| Panel | `#171717` | raised ink panels and dialogs |
| Muted panel | `#1E1E1E` | secondary ink surface and footer gradient stop |
| Body text | `rgba(255,255,255,.64)` | running copy on ink |
| Faint text | `rgba(255,255,255,.40)` | metadata and supporting labels |
| Hairline | `rgba(255,255,255,.14)` | ink dividers and borders |
| Firm line | `rgba(255,255,255,.20)` | focused and emphasized borders |
| **Cyan** | `#00CFFF` | primary links, active tabs, focus rings, positive emphasis |
| **Orange** | `#FFA500` | primary CTA, section action, warning emphasis |
| **Yellow** | `#FFF200` | formulas, ideas and highlight moments |
| Error | `#FF6257` | validation and destructive feedback |

**Cyan is primary on ink.** Orange owns the single decisive action in a section.
On paper, cyan is used for rules and fills rather than low-contrast body text.

### Accent roles

Do not create a rainbow status palette. Cyan, orange and yellow carry semantic
roles. Tints use alpha on the same colour (`bg-brand-cyan/10`,
`border-brand-orange/30`) rather than introducing near-duplicate hex values.

### The accent is a variable

Implement brand colours as theme values. Never hardcode cyan, orange or yellow in
component markup. Surface tokens must resolve from `data-surface`, not from a
global light/dark toggle.

### Status colours

Success uses cyan. Attention uses orange. Highlights use yellow. Destructive and
validation states use `#FF6257`. Keep status text readable against both surfaces.

---

## 3. Surface model

Every major region declares a surface. `ink` is default; `paper` is explicit.
The surface owns semantic tokens so dialogs, menus and portals do not inherit
the wrong contrast from their trigger.

```tsx
<section data-surface="ink">...</section>
<section data-surface="paper">...</section>
```

Ink surfaces use `#0D0D0D` with `#171717` panels and white-alpha text. Paper
surfaces use white with near-black text. Avoid global `.dark` toggles for product
surfaces; region identity must remain stable.

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
- Shadows are restrained depth cues for raised controls and plates; never use
  heavy blurred shadows as the primary hierarchy.

---

## 6. Components

### Buttons

| Variant | Style |
| --- | --- |
| `cyan` | `#00CFFF` fill, ink text. Primary interactive action on ink. |
| `orange` | `#FFA500` fill, ink text. One decisive CTA per section. |
| `outline` | transparent, cyan or alpha hairline border, foreground text |
| `ghost` | transparent, muted text; alpha panel on hover |
| `link` | cyan text with underline or trailing arrow |

Use gradients only for atmospheric background washes and footer depth. Short
colour, opacity and scale transitions are allowed when they communicate state.

### Cards

Cards are rounded plates: `14px` radius, ink-alpha fill on ink and solid white on
paper. Use a restrained shadow or border to separate a plate from its surface.

### Pills

Unselected: transparent with an alpha hairline. Selected: cyan or orange tint,
foreground text, 100px radius.

### Inputs

`8px` radius, surface-aware panel fill, alpha hairline and muted placeholder.
Focus uses a cyan ring on ink and a visible orange/cyan border on paper.

### Tabs

2px cyan bottom border on the active tab, foreground label. Inactive tabs are
muted with no border.

### Accordions

Independent — opening one never closes another. `+` / `–` as text at the right
edge. One item open by default.

### Tables

Surface-aware plate, alpha hairline outer border, alpha row dividers. Header cells
are faint, 13–16px. Row hover uses a cyan or white-alpha wash.

### Progress

Chunked, not a thin line. Filled chunks use cyan, action milestones use orange,
track uses white-alpha, with a small gap. The chunk-count rounding lives in
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

1. **Cyan/orange rule** — a short 2–3px line under a page eyebrow or beside a CTA.
2. **Atmospheric wash** — blurred cyan or orange radial gradient on an ink slab;
   never use it as content fill.
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

- Don't make paper the global default.
- Don't use cyan, orange or yellow outside their semantic roles.
- Don't add heavy decorative gradients or shadows that compete with content.
- Don't animate without a reduced-motion fallback.
- Don't use a rainbow status palette; see §2.
- Don't hardcode a count that could be derived.
- Don't constrain text to a fixed width — Bangla is longer than English.
