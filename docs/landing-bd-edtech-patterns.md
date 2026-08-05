# What the Bangladeshi edtech landing pages actually do

Research notes behind the current `/` page. Six platforms a Bangladeshi student
already uses were read section by section in August 2026:

| Platform | Who it is for | URL |
| --- | --- | --- |
| 10 Minute School | Class 6–12, admission, English | `10minuteschool.com` |
| Shikho | Academic to admission | `shikho.com` |
| Bohubrihi | Career skills, freelancing | `bohubrihi.com` |
| Interactive Cares | Job-ready tech skills | `interactivecares.com` |
| Mojaru | Kids, cadet, olympiad | `mojaru.com` |
| Chorcha | Practice and mock tests | `chorcha.net` |

Genex sits closest to 10 Minute School, Shikho and Mojaru: school-level academic
courses sold to a student and their guardian, in Bangla, with the exam as the
thing being prepared for.

## The recurring skeleton

Written in the order the six sites put it. A pattern is listed once it appeared
on at least three of them.

1. **Header carries a helpline number.** 10MS `16910`, Shikho `16780`, Mojaru a
   WhatsApp button. A phone number in the header is the single strongest trust
   signal on a Bangladeshi commerce page — it says a person exists.
2. **Hero is short and states the promise in one line.** Shikho: "একাডেমিক থেকে
   এডমিশন". Mojaru: "মজায় শিখি, মজায় জানি". Two actions at most.
3. **Numbers immediately under the hero.** Shikho prints 3M+ students, 20+
   mentors, 4.5M downloads. Bohubrihi prints 369,086 enrolments, 269,936
   students, 11,332 videos, 55 courses. Nobody waits until the footer.
4. **Courses appear above the fold or immediately below it.** 10MS puts HSC 26 /
   HSC 27 / HSC 28 cards inside the hero itself. The catalogue is the product;
   persuasion comes after it, not before.
5. **A card grid, never one big slide.** Every one of the six shows six to twelve
   compact cards at once. The fields are remarkably consistent:
   thumbnail · format badge (live/recorded/free) · title · instructor ·
   lesson or class count · rating · enrolled count · price.
6. **Enrolled counts and ratings on the card.** Interactive Cares prints student
   count and rating per card; Bohubrihi prints enrolments per track. It reads as
   "other people already bought this".
7. **A free rung on the ladder.** Bohubrihi has a whole "Free Courses" carousel,
   Mojaru a free demo-class form, 10MS free recorded content. Nobody asks for
   money before giving something away.
8. **A feature grid of six to eight tiles with icons.** This is the most
   universal section of all. Shikho: live classes, animated videos, practice
   MCQ, live MCQ, class notes, smart notes and report cards. 10MS: seven.
   Bohubrihi: eight. Interactive Cares: eight. Each tile is one concrete
   deliverable, not a slogan — "class notes", not "quality education".
9. **Numbered "how it works".** Interactive Cares: create account → select
   course → enrol → access dashboard. Mojaru: five steps ending in a
   certificate. It removes the "what happens after I pay" question.
10. **Testimonials with a face, a name and an institution.** Chorcha names RUET,
    DU, BUET. Mojaru names cadet-college admissions and an olympiad win. The
    achievement is the point, not the compliment.
11. **Teacher showcase with credentials.**
12. **Trust logos near the bottom** — press coverage (Shikho, Mojaru), investors
    and partners (Bohubrihi), hiring companies (Interactive Cares).
13. **Payment method icons in the footer** — bKash, Nagad, Rocket, Visa,
    Mastercard, SSLCommerz. Interactive Cares prints these; a paid Bangladeshi
    course site that does not is asking for a bank transfer on trust.
14. **App download band** with store badges and a rating.
15. **Bangla-first copy** with English left for numerals and product names.

## What Genex adopts

Adopted because the product genuinely delivers it:

- **Helpline in the header** — already shipped, keep it above the fold on
  desktop and in the drawer on mobile.
- **The catalogue as the first thing on the page.** There is no hero at all:
  the page opens on a full-bleed carousel of one course at a time, its subject,
  free-class count, teacher, class count, enrolments, rating and price written
  over the picture, and the title and price both linking into the course.
- **Six-tile feature grid** listing what a course actually contains: recorded
  video classes, PDF class notes, MCQ tests marked instantly, written papers
  marked by hand by the teacher, questions answered under each class, a
  certificate on completion. Every tile maps to a shipped feature.
- **Numbered "how it works"** — account, enrol, study, sit the exams.

## What Genex does not adopt, and why

- **Press, investor and partner logos** — there are none. A fabricated logo
  wall is the fastest way to lose the trust the rest of the page is buying.
- **App download band** — the Expo app is not on either store yet. Add the band
  the day the store links exist.
- **Struck-through "original" prices and discount percentages** — the schema
  holds one price per course. `GENEX_MIGRATION.md` §2 already recorded this.
- **A free-demo booking form** — Genex has no counselling desk to route it to.
  The free rung here is the preview classes every course already keeps open.
- **Countdown and seasonal offer banners** — no campaign engine behind them.
- **A counts strip** (§3), and the closing call-to-action band with it. Both
  were built and then removed at the owner's request: nothing is to sit above
  the catalogue, and the page is to end on the FAQ. The counts are still
  returned by the landing snapshot if this is ever reversed.

## The resulting order

```
Course carousel   full-bleed, one course at a time, details over the picture
Pick a subject    real categories, links into the filtered catalogue
Which level       levels on the left, their courses on the right
What you get      six tiles, one shipped feature each
How it works      four numbered steps
Teachers          who you study with
Reviews           students, named
FAQ               the questions that block a purchase, and the last band
```

## Notes for whoever changes this next

- Every band is a `LandingSection`. Sections that set their own container width
  and padding are what made the page read as a stack of unrelated pages.
- Motion on the public pages is `Reveal` / `Marquee` / `CountUp` and nothing
  else (ADR-0012). The app shell stays still.
- A subject keeps the same spectrum hue everywhere (ADR-0011), so the colour on
  a landing card matches the catalogue and the dashboard.
- Numbers on this page come from the landing snapshot, which is a live
  aggregate. Do not hardcode one.
