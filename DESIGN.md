# Design System Specification: High-Performance LMS

## 1. Overview & Creative North Star
**Creative North Star: The Digital Atelier**
Traditional academic software is often cluttered, rigid, and uninspiring. This design system rejects the "filing cabinet" aesthetic in favor of a "Digital Atelier"—a space that feels curated, intentional, and premium. We achieve this through **Editorial Modernism**: a layout philosophy that treats learning content like a high-end journal rather than a database. 

By leveraging aggressive white space, sophisticated tonal layering, and an "Asymmetric Balance," we create a high-performance environment that reduces cognitive load while maintaining an authoritative, professional presence.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep teals and blues to establish an immediate sense of institutional trust, punctuated by a vibrant indigo accent for high-velocity actions.

### The "No-Line" Rule
To achieve a premium feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts. For example, a `surface-container-low` section should sit on a `background` or `surface` base. Separation is achieved through contrast, not strokes.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to create depth:
- **Level 0 (Base):** `surface` (#faf8ff) – The main canvas.
- **Level 1 (Sections):** `surface-container-low` (#f2f3ff) – Large content groupings.
- **Level 2 (Cards):** `surface-container-lowest` (#ffffff) – Individual interactive units.
- **Level 3 (Pop-overs):** `surface-container-highest` (#dae2fd) – Tooltips and active states.

### Glass & Gradient
- **The Signature CTA:** Use a subtle linear gradient for primary buttons, transitioning from `primary` (#000000) to `on-primary-container` (#028fb0). This adds a "soul" to the action that flat hex codes lack.
- **Frosted Navigation:** Floating sidebars or headers should use `surface` with 80% opacity and a `24px` backdrop-blur. This allows content to bleed through softly, preventing the UI from feeling "pasted on."

---

## 3. Typography
The system utilizes a dual-sans pairing to balance academic authority with functional clarity.

- **Display & Headlines (Manrope):** Chosen for its geometric precision and slightly wider apertures. Use `display-lg` (3.5rem) for hero moments and `headline-md` (1.75rem) for course titles. This is the "Editorial" voice.
- **Body & Interface (Inter):** The workhorse. Use `body-md` (0.875rem) for standard text. Its high x-height ensures readability during long study sessions.
- **Labels (Inter):** Use `label-md` (0.75rem) in all-caps with a 0.05em letter-spacing for metadata (e.g., "COURSE PROGRESS").

---

## 4. Elevation & Depth
We move away from traditional Material shadows in favor of **Tonal Layering**.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift that mimics fine paper stacked on a desk.
- **Ambient Shadows:** For "Floating" elements (Modals), use a multi-layered shadow: 
  - `box-shadow: 0 10px 30px -10px rgba(19, 27, 46, 0.08);`
  - The shadow color is a tinted version of `on-surface` (#131b2e), never pure black.
- **The Ghost Border:** If a border is required for accessibility, use the `outline-variant` (#c6c6cd) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `on-primary-container`), white text, `md` (0.375rem) corner radius.
- **Secondary:** `secondary-container` (#6063ee) with `on-secondary` (#ffffff) text.
- **Tertiary/Ghost:** No fill; `on-surface` text. Becomes `surface-container-high` on hover.

### Cards & Content Blocks
- **Constraint:** No internal dividers. 
- **Structure:** Use `16` (4rem) vertical spacing between major card elements. Use a `surface-container-low` background for the card body and a `surface-container-lowest` for the inner "Action Area" to create nesting.

### Input Fields
- **Default State:** `surface-container-low` fill, no border, `sm` (0.125rem) radius.
- **Active State:** `outline` (#76777d) ghost border (20% opacity) with a subtle `secondary` glow.

### Specialized LMS Components
- **Progress Trackers:** Avoid thin lines. Use a "Chunked" bar using `secondary` for completion and `surface-container-highest` for the track.
- **Course Navigator:** A vertical glassmorphic sidebar using `surface-container-low` at 80% opacity. Active states should use a "pill" shape in `secondary-fixed`.

---

## 6. Do’s and Don’ts

### Do:
- **Embrace Asymmetry:** Align course titles to the left but place metadata (time, credits) in a floating "Ghost" container on the right to create visual interest.
- **Use "Space as Structure":** If two elements feel cluttered, increase spacing to `8` (2rem) rather than adding a divider line.
- **Tint your Neutrals:** Ensure your "greys" always lean into the blue/teal spectrum of the palette.

### Don’t:
- **Don't use 100% Black:** Even for text, use `on-background` (#131b2e) to maintain a soft, premium feel.
- **Don't use Default Shadows:** Avoid the "drop shadow" look. If it looks like a 2010 web app, increase the blur and decrease the opacity.
- **Don't Square the Corners:** Always use the `DEFAULT` (0.25rem) or `md` (0.375rem) radius. Hard 90-degree angles feel too "industrial" for a modern learning environment.