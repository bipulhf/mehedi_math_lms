---
status: accepted
---

# An imported question is a draft until somebody marks the answer, and only unmistakable LaTeX becomes maths

A teacher can paste the JSON from the owner's Bijoy-to-LaTeX converter into the
assessment builder and get the questions. Two rules make that safe: the
importer only calls a span maths when it contains an unmistakable LaTeX control
sequence, and nothing is created on the server until every imported question has
a correct option ticked.

## Context

The converter (`bijoy_to_latex`) reads a SutonnyMJ Word paper and emits
`{ question: string; options: string[] }[]`. Word equations become LaTeX, and
that LaTeX is **concatenated straight into the string with no delimiters** —
`wrapLatex()` returns `latex.trim()` and the assembler does `text += ommlXml`.
A real row out of it:

```
\begin{bmatrix}4 & 0 & -2\end{bmatrix} ম্যাট্রিক্সটি প্রতিসম হলে m = কত? [CB 2023]
```

The owner's other project accepts that as-is because it renders a whole field as
one KaTeX expression and auto-wraps Bangla in `\text{}`. [ADR-0014](0014-maths-is-latex-between-dollars.md)
already considered and rejected that model here: maths is LaTeX between dollars
inside ordinary rich text, so something has to decide which spans are maths, and
the converter does not say.

The paper also carries no answer key — the Word document has none — while
`assertMcqQuestion` refuses an MCQ question with no correct option.

## Decision

- **A run becomes maths only when it contains an unmistakable LaTeX control
  sequence** (`\command`, `\\`, or `^`/`_` opening a group), and it stops at the
  first Bengali character. `wrapBareLatex` in `packages/shared/src/mcq-import.ts`
  is the whole rule; web and any future importer share it for the reason
  `math-segments.ts` is shared.
- **Under-wrapping is the preferred failure.** A missed formula renders as
  visible LaTeX a teacher fixes in the editor. An over-wrap renders their Latin
  prose as italic maths variables — the exact objection ADR-0014 raises against
  the whole-field model — and nobody notices until a student sits the exam. So a
  lone `m` in `m = কত?`, the `i ও ii` of a multi-select option, and a board tag
  like `[CB 2023]` all stay prose.
- **A `\begin{…}…\end{…}` block is taken whole, newlines and all.** A newline
  otherwise ends a run, and the converter regularly splits a `vmatrix` across
  lines; cutting there made three unbalanced formulas out of one matrix. This
  was five of the five KaTeX failures in the sample export.
- **A string that already has dollars is returned untouched.** If the converter
  ever learns to emit delimiters, this becomes a no-op rather than a second
  opinion.
- **Nothing reaches the server until every question has an answer.** The paste
  opens a review list rendered through the same `RichTextContent` and `MathText`
  a student reads the exam through, and the create button stays disabled while
  any question is unanswered. Defaulting the first option to correct was
  rejected: it is the one design that can ship an exam whose key is silently
  wrong for every question nobody re-checked.
- **Rows are refused, not repaired.** Fewer than two options, an empty question,
  or a field over `checkMathBudget` comes back with its 1-based position. A real
  export opens with a letterhead paragraph carrying no options, and a
  one-option question is a detection failure upstream rather than something to
  pad out to four.
- **Questions are created one at a time** against the endpoint a hand-written
  question already uses. Each create recomputes the test's total marks
  server-side, and a failure part-way through names the question it stopped at
  and leaves the earlier ones in place.

## Consequences

- Measured against the converter's own sample export: 55 of 59 rows imported,
  4 refused (all genuinely option-less), 140 formulas, **zero KaTeX errors**.
  That number is the acceptance test for any change to the wrap rule.
- The importer cannot fix what the converter got wrong. That sample still
  contains Bijoy that failed to convert — `েক.বি`, `নি¤œ`, `ঊধ্বর` — and one
  question whose options 1 and 4 are identical. The review step is where a
  teacher sees both; the importer neither repairs nor deduplicates.
- `wrapBareLatex` runs on already-converted text, but `parseMcqImport` still
  calls `bijoyToUnicode` when `isBijoyEncoded` says so, because pasting out of
  the Word file instead of out of the converter is the neighbouring mistake.
- Web only. The mobile app has no authoring surface at all.
