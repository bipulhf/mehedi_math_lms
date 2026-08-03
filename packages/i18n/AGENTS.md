# AGENTS.md — `@genex/i18n`

The bilingual catalogue and every locale-aware formatter. Imported by
`apps/web` and `apps/mobile` so both format identically. Root conventions in
[`../../AGENTS.md`](../../AGENTS.md) apply here too.

Zero runtime dependencies, and it must stay that way — it is imported by React
Native, where a Node-only dependency is a build failure rather than a warning.

## Scope

**UI chrome only.** Course titles, descriptions, category names, notices and
messages are user-authored and stay in the language they were written in.
Nothing here translates database content, and adding a key for a piece of
content is a sign the model needs a translation table instead.

## The catalogue

`src/messages/bn.ts` is the **source of truth**. `MessageKey` is derived from
it, and `src/messages/en.ts` is typed as a complete `Record<MessageKey, string>`
— so a key added to Bangla and forgotten in English fails the build rather than
falling back at runtime.

Bangla is the default locale. English is the *fallback*, which is the opposite
of the usual arrangement and deliberate: this product was written in Bangla.

Keys are dotted and grouped by domain (`nav.`, `action.`, `footer.`,
`courses.`). Keep both files alphabetically sorted within their groups.

The catalogue grows one migration phase at a time — a screen adds the keys it
needs when it is rebuilt. It is not meant to be complete ahead of the screens.

### Register

Plain and spoken. Informal "তুমি", short sentences, no marketing bravado. See
`DESIGN.md` §10. The English is a translation of the Bangla — resist making it
longer or more formal than its source.

## Formatting

`src/format.ts` is the only place that knows about Bangla numerals and the
lakh/crore grouping (১,৮৪,০০০, never ১৮৪,০০০). `Intl` does the real work; the
value of the module is that there is exactly one of it.

- `formatNumber` — grouped, native digits. Accepts the numeric **strings**
  Postgres returns for `numeric` columns.
- `formatCurrency` — `৳` tight against the number, paisa only when non-zero.
  Composed by hand because `Intl`'s currency style inserts a space.
- `formatPercent` — takes 0–100, not a fraction.
- `formatDate` / `formatDateTime` — day before month in both locales, which is
  why `en` maps to `en-GB` and not `en-US`.
- `toLocaleDigits` — maps digits **in place** without regrouping. For phone
  numbers, ids and dimensions. Never for counts.

`createFormatters(locale)` bundles all of them, which is what the web
`useFormat()` hook returns.

## Consumers

The web app wraps everything in `LocaleProvider`
(`apps/web/src/lib/i18n/locale-context.tsx`) and exposes `useT()`,
`useFormat()` and `useLocale()`. The locale is read from a cookie in the root
route's `beforeLoad`, **not** in an effect — an effect would render the page in
one language and flip it after hydration.
