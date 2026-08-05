---
status: accepted
---

# A written Test is answered on photographed paper, and a Test is only ever one kind

Written answers stop being typed text. A student sitting a written Test works on real paper and uploads a
photographed **Answer Script** per Question; a teacher marks it. At the same time `MIXED` goes away — a
Test is `MCQ` or `WRITTEN` for its whole life, and the per-question type goes with it.

## Context

The subject is a maths academy. Its written work is derivations, diagrams, and construction — none of which
a student can reasonably type into a textarea, and none of which a teacher can meaningfully mark by reading
back a wall of plain text. The typed-answer path (`submission_answers.written_answer`) had shipped but was
not in real use, so nothing had to be preserved.

Three type fields described the same thing: `tests.type` (`MCQ | WRITTEN | MIXED`), `test_questions.type`
(`MCQ | WRITTEN`), and a guard, `validateQuestionAgainstTest`, whose only job was to police the two against
each other. `MIXED` was what made the second field necessary.

## Decision

- `submission_answers.written_answer` is dropped. A written answer is an Answer Script — ordered Script
  Pages, each one an uploaded image — or nothing at all.
- `MIXED` is removed from `test_type`. A Test is `MCQ` or `WRITTEN`. A teacher running an exam with both
  sections builds two Tests.
- `test_questions.type` and the `question_type` enum are dropped. The Test's type is the only statement of
  kind, so `validateQuestionAgainstTest` and its error paths are deleted rather than kept in sync.
- `test_questions.expected_answer` and `correct_answer` — both unused in any real flow — are replaced by
  one `marking_guide`, shown to staff while marking and never to a student.
- Marks carry two decimal places everywhere: `numeric(5,2)` for a single question's marks
  (`test_questions.marks`, `submission_answers.awarded_marks`) and `numeric(7,2)` for a paper's totals
  (`tests.passing_score`, `test_submissions.score` and `max_score`). Half marks are ordinary in maths
  marking, and rounding them away is a daily annoyance rather than an edge case. Totals are added in
  JavaScript, so every sum goes through a rounding helper — binary floating point does not do two
  decimal places on its own.
- A written Test defaults `max_attempts` to 1. Every retake costs a teacher a second full read, so
  unlimited retakes — correct for self-grading MCQs — is the wrong default here. An owner can still raise
  it.

## Considered options

- **Keep typed written answers alongside image ones.** Rejected — every answer would have an ambiguous
  shape, and the teacher's marking screen would branch on "maybe text, maybe pages" forever, to serve a
  path this academy would never use.
- **Keep `MIXED`.** Rejected — it is the sole reason two type columns must agree, and a mixed paper is
  expressible as two Tests. Reintroducing it later means adding the question-level column back, which is a
  migration, not a redesign.
- **Keep the integer mark columns and tell teachers to double every mark.** Rejected — it inflates every
  displayed total and still cannot express a third.

## Consequences

- The `numeric` change reaches past this feature: anything summing or formatting a score — passing-score
  checks, certificates, analytics — has to be revisited, and JS number handling around
  `numeric` needs care at the driver boundary.
- Dropping `expected_answer`/`correct_answer` touches roughly ten files across API, web, mobile and shared
  validators that read them today.
- `apps/mobile` gains a second full implementation of both capture and marking. Parity was chosen
  deliberately; it is the largest single cost in this feature.
