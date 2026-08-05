---
status: accepted
---

# Maths is LaTeX between dollars, rendered after sanitisation

A question can now contain maths. It is written as LaTeX inside the HTML a
teacher already writes — `$…$` inline, `$$…$$` on its own line — and it is
rendered by KaTeX at read time, from the LaTeX, by our own code. Nothing about
the storage format changed and the sanitiser allowlist did not open up.

## Context

Genex sells maths courses and its exams are maths exams, but until now a teacher
could not write a fraction. Question text is TipTap HTML sanitised against a
sixteen-tag allowlist (`apps/api/src/lib/html.ts`), MCQ option text is a plain
string, and both are rendered on the web, in the Expo app, and flattened to
characters for list rows.

The owner's other project solves the same problem by storing the *whole field*
as one LaTeX expression with no delimiters, auto-wrapping Bangla in `\text{}`.
That works there because the field is a plain string. Here it would mean giving
up rich text on question fields — no bold, no lists — and would still leave MCQ
options, which are plain, needing a second mechanism.

## Decision

- **The delimiters live inside the existing HTML.** `Solve $\frac{dy}{dx}$ when
  <strong>$x = 2$</strong>` is one `text` column, as before. MCQ options carry
  the same delimiters in their plain string. No migration, no new column, no
  second content type.
- **Sanitise first, render second.** `RichTextContent` runs DOMPurify over the
  stored HTML, *then* replaces the maths runs with KaTeX output. The markup that
  reaches the page is produced by our code from a LaTeX string, so author bytes
  never come back through as HTML and the allowlist never had to learn about
  `span`, `class` or MathML. This ordering is the whole safety argument.
- **`renderToString`, not a client effect.** KaTeX is pure JavaScript, so the
  server pass and the browser compute the same bytes and a student never watches
  a question change shape after hydration.
- **What counts as maths lives in `packages/shared`.** Web and mobile find
  formulas with the same function, for the reason `image-variants.ts` is there:
  two implementations would eventually disagree about the same question. The
  renderer is injected, so the package has no KaTeX dependency.
- **Bijoy conversion is an authoring aid, never a data rule.** It runs in the
  browser on paste, is undoable, and is off if the teacher says so. The server
  neither converts nor validates encoding.

## Considered options

- **A TipTap atom node serialising to `<span data-latex="…">`.** True WYSIWYG in
  the editor, and rejected for two reasons: it forces `span`, `class` and
  `data-*` onto the sanitiser allowlist — the one thing this decision exists to
  avoid — and MCQ options cannot hold HTML, so they would need a second
  mechanism anyway.
- **Storing pre-rendered KaTeX HTML.** Removes render cost, but means storing
  markup that must then be allowlisted, and freezes every stored question
  against the day KaTeX's output changes.
- **The whole field as raw LaTeX**, as the reference project does. Rejected —
  it costs rich text on the fields that most need it, and renders Latin words as
  italic maths variables.
- **MathJax → SVG on the server.** One rendering for web, app and any future PDF,
  at the cost of a second maths engine, a render cache and API CPU. Worth
  revisiting only if a question-paper export appears.

## Consequences

- **A `$` in stored text is now a delimiter.** An audit before shipping found
  zero occurrences across question text, marking guides, options, course and
  test descriptions and notices, so nothing needed backfilling. The segmenter
  still refuses the obvious false positives — `$5 off, $10 off` stays prose,
  `\$` is a literal dollar, an unterminated `$` does not swallow a paragraph,
  and a run cannot cross a tag.
- **Entities must be decoded before KaTeX sees them.** TipTap escapes text, so a
  `bmatrix` is stored as `a &amp; b`; handing that to KaTeX renders the literal
  characters instead of a column break. Decoding happens once, so an author who
  wrote `&lt;` keeps it.
- **Authors see the source while typing.** The editor answers that with a
  preview strip, drawn only when the field contains a dollar.
- **KaTeX now runs during SSR** of any page carrying rich text. There is a
  module-level cache, and `packages/shared/src/validators/math.ts` bounds what a
  single field may ask for — twenty thousand characters, sixty-four formulas, a
  thousand characters each.
- **The app carries 360 KB of inlined font CSS** so maths renders with no
  network. Regenerate it with `bun run --filter @genex/scripts build:katex-assets`
  after upgrading KaTeX.
- **`stripHtml` is no longer right for a label.** A truncated row would read
  `Find $\frac{a}{b}$ when…`; `richTextToPlainText` gives `Find a/b when…`.
