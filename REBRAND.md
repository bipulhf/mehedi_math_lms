# Rebrand to Mehedi's Math Academy

What is left after commit `8f27922` renamed the code. That commit was mechanical
— identifiers, package names, URLs, storage keys, the database. It did not touch
artwork, the Bangla copy, the palette, or anything a user actually sees as
"Genex". This document is the list of what still does.

Read it in three passes:

1. **§1 Decisions** — four answers are needed before most of the work can start.
2. **§2–§8 Inventory** — every place the name, the logo or the visual language
   appears, with the file and line, what it says now, and what it should say.
3. **§9 Sequence and §10 Verification** — the order to do it in and how to prove
   it is done.

Status key: **BLOCKED** needs a decision or an asset from the client ·
**READY** can be done now · **DONE** shipped in `8f27922`.

---

## 1. Decisions needed first

| # | Decision | Why it blocks | Owner |
| --- | --- | --- | --- |
| 1 | **The Bangla name.** Chosen: `মেহেদীর গণিত একাডেমি`. | Six strings in `bn.ts` and one test. Bangla is the default locale, so this is the name most visitors see. | DONE |
| 2 | **Logo artwork.** Supplied: full academy lockup, mark, favicon and founder portrait. | Every header, footer, favicon, OG card, email and the lecture-player watermark. | DONE |
| 3 | **Palette.** Updated target: ink `#0D0D0D`, cyan `#00CFFF`, orange `#FFA500`, yellow `#FFF200`, with paper as an explicit contrast surface. | Everything visual. Reference theme selected; web and mobile token migration remains. | IN PROGRESS |
| 4 | **Live domain and mailbox.** Code now points at `mehedismathacademy.com` and `support@mehedismathacademy.com`. Neither is confirmed registered or routed. | DNS, TLS, OAuth redirect URIs, SSLCommerz store config, SMTP sender, sitemap and canonical URLs. | Client |

A short name is worth deciding alongside #1 — see §4.2, where the long name
costs 16 characters of every page title.

---

## 2. Logo and imagery

### 2.1 Academy artwork — DONE

Supplied artwork replaced the old Genex pixels. Source files are processed to
transparent PNGs for the web, mobile and API bundles.

| File | Size | What it actually depicts |
| --- | --- | --- |
| `apps/web/public/brand/mma-mark.png` | 220×220 | Academy mark |
| `apps/web/public/brand/mma-logo.png` | 500×500 | Full academy lockup |
| `apps/web/public/brand/mehedi-bhai.jpeg` | 640×640 | Founder portrait |
| `apps/web/src/assets/mma-mark.png` | 220×220 | Mark imported by bundler |
| `apps/mobile/assets/images/mma-mark.png` | 220×220 | Mobile mark |
| `apps/mobile/assets/images/mma-logo.png` | 500×500 | Mobile full lockup |
| `apps/api/src/assets/mma-mark.png` | 220×220 | Mark embedded in OG cards |

`DESIGN.md:259-273` describes supplied artwork and its use.

No white-knockout variant was supplied; no dark-surface lockup currently uses one.

### 2.2 Where the logo is rendered — DONE

| Surface | File | Detail |
| --- | --- | --- |
| Marketing header | `apps/web/src/components/layout/site-header.tsx` | full lockup at 56px |
| Dashboard shell | `apps/web/src/components/layout/app-shell.tsx` | full lockup at 44px |
| Auth screens | `apps/web/src/components/layout/auth-layout.tsx` | full lockup at 56px |
| Footer | `apps/web/src/components/layout/site-footer.tsx` | full lockup at 56px |
| Favicon | `apps/web/src/routes/__root.tsx` | `/favicon.ico` plus Apple and manifest links |
| Lecture-player watermark | `apps/web/src/components/media/lecture-player.tsx:20,127` | 20–24px, 35% opacity, top-left of video |
| SMS composer preview | `apps/web/src/routes/dashboard/admin/sms.tsx:22` | imported mark |
| Notification composer preview | `apps/web/src/routes/dashboard/notifications/send.tsx:31` | imported mark |
| Mobile tab-bar header | `apps/mobile/app/(tabs)/_layout.tsx` | full lockup at 48px |

Mark-only surfaces continue using `mma-mark.png`.

### 2.3 Mobile app icons — DONE

All Expo template artwork has been replaced with generated assets from the
supplied academy mark.

| File | Size | Current content | Needed |
| --- | --- | --- | --- |
| `apps/mobile/assets/images/icon.png` | 1024×1024 | Academy mark on paper | iOS app icon |
| `apps/mobile/assets/images/splash-icon.png` | 1024×1024 | Transparent academy mark | Splash mark |
| `apps/mobile/assets/images/android-icon-foreground.png` | 512×512 | Academy mark | Adaptive-icon foreground |
| `apps/mobile/assets/images/android-icon-background.png` | 512×512 | Academy paper | Flat brand background |
| `apps/mobile/assets/images/android-icon-monochrome.png` | 432×432 | Ink academy silhouette | Android 13 themed icon |
| `apps/mobile/assets/images/favicon.png` | 48×48 | Academy mark on paper | Expo-web favicon |

Mobile colors now use academy paper:

- `android.adaptiveIcon.backgroundColor: "#FCFBF9"`.
- `expo-splash-screen.backgroundColor: "#FCFBF9"`.

Compare `--color-paper: #fcfbf9` in `apps/web/src/styles/app.css:35`. Neither
Expo default appears anywhere in the design system.

### 2.4 Web installable-app identity — DONE

Web now ships a manifest, Apple touch icon, maskable icon, and favicon:

- `apps/web/public/manifest.webmanifest` with `name`, `short_name`,
  `theme_color: "#fcfbf9"` (matching `__root.tsx:44`), `background_color`, and
  192/512 icons including one `purpose: "maskable"`.
- `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">` (180×180).
- `<link rel="manifest" href="/manifest.webmanifest">`.

### 2.5 Hero illustrations — READY, low priority

`apps/web/public/hero-landing.jpg`, `hero-sketch.jpg`, `hero-vector.jpg` carry no
wordmark, so they are not a naming problem. They are keyed to the `#EE5622`
orange, so they become a problem only if decision #3 changes the accent. Note
that none of the three is referenced anywhere in `apps/web/src` — they are
orphaned files and can be deleted if the landing page no longer uses them.

---

## 3. The name in copy

### 3.1 Bangla brand copy — DONE

Bangla is the default locale (`packages/i18n/src/locales.ts:10`). All brand copy
now uses `মেহেদীর গণিত একাডেমি`.

| File:line | Key | Current value |
| --- | --- | --- |
| `packages/i18n/src/messages/bn.ts` | `brand.name` | `মেহেদীর গণিত একাডেমি` |
| `packages/i18n/src/messages/bn.ts` | `email.resetSubject` | Academy name plus reset copy |
| `packages/i18n/src/messages/bn.ts` | `footer.*`, `home.whyEyebrow`, `about.body1` | Academy name in each surface |
| `packages/mailer/src/templates/password-reset.test.ts` | — | asserts the Bangla academy name |

The mailer test pins the selected Bangla name so future copy changes cannot
silently reintroduce the old brand.

`design_handoff_genex/` has nine more files containing `জেনেক্স`. Leave them —
that directory is the vendor handoff the current UI was built from, and editing
it would make the design-authority references point at something that never
shipped.

### 3.2 English name strings — DONE

Already correct as of `8f27922`, listed here so the audit is complete:

- `packages/i18n/src/messages/en.ts:83,333,338,340,353,1302,1306`
- `apps/web/src/lib/site.ts:2-3` (`siteConfig.name`, `shortName`)
- `packages/shared/src/constants/app.ts:1` (`appName`)
- `apps/api/src/lib/env.ts:5` (`APP_NAME` default)
- `.env.example:4`, `.env.docker.example:1`
- `apps/mobile/app.json:3` (`expo.name`)
- `apps/web/src/components/certificates/certificate-pdf-document.tsx:68`
- `apps/api/src/services/og-image-service.ts:42,72,100`

### 3.3 Logo alt text — DONE

The four layout components now pass `t("brand.name")` for image `alt` and
`aria-label` values:

- `site-header.tsx:156,162` · `app-shell.tsx:92,95` ·
  `auth-layout.tsx:49,51` · `site-footer.tsx:27,30`

Bangla and English screen-reader surfaces now match visible branding.

---

## 4. SEO

### 4.1 Metadata plumbing — DONE, but re-verify after the domain lands

`apps/web/src/lib/seo.ts` is the single source for title, description,
canonical, Open Graph, Twitter card and JSON-LD. It reads `siteConfig`, so the
name and URL are already right in:

- `<title>` and `og:title` — `seo.ts:102,104`
- `og:site_name` — `seo.ts:109` and `__root.tsx:48-49`
- `og:url` and `<link rel="canonical">` — `seo.ts:106,129,139`
- `twitter:*` — `seo.ts:110-113`
- Organization JSON-LD (`name`, `url`, `description`) — `seo.ts:142-152`
- Breadcrumb and Course JSON-LD — `seo.ts:154-200`
- Default meta description — `site.ts:6`, used at `__root.tsx:41`

Everything above resolves against `siteConfig.url`. If decision #4 picks a
domain other than `mehedismathacademy.com`, change `apps/web/src/lib/site.ts:5`
and `packages/shared/src/constants/app.ts:3` and the whole surface follows.

### 4.2 Page-title budget — DONE

`buildDocumentTitle` in `apps/web/src/lib/seo.ts:70-76` caps a document title at
60 characters and reserves the tail for the site name:

```
MAX_DOC_TITLE = 60
suffix        = " | Mehedi's Math Academy"   → 24 chars
budget left for the page title                → 36 chars
```

Under Genex the suffix was 8 characters and the budget was 52. Page titles now
truncate 16 characters earlier, and course titles are the longest titles on the
site — a 45-character course name that used to render whole now ends in an
ellipsis in the search result.

`siteConfig.shortName` is now `MMA`, and `buildDocumentTitle` uses it for the
suffix. The full name remains in Open Graph metadata and Organization JSON-LD.
Three options were considered:

1. Set `shortName` to something short and use it in `buildDocumentTitle` —
   restores most of the budget, and the full name still carries `og:site_name`
   and the Organization JSON-LD.
2. Raise `MAX_DOC_TITLE`. Google truncates display around 580px rather than a
   character count, so 60 is already conservative; 65–70 is defensible.
3. Accept the truncation.

Option 1 is implemented.

### 4.3 OG card art — DONE

`apps/api/src/services/og-image-service.ts` renders an SVG and rasterises it to
a 1200×630 PNG. Three things in it are brand:

- `:42` — footer text, now `MEHEDI&apos;S MATH ACADEMY`, letter-spaced 2px at
  22px. Correct, but 21 characters where "GENEX" was 5; check it does not
  collide with the right edge once you have a live card to look at.
- `:34` — the 8px top rule is `#ee5622`, the Genex accent, typed as a literal.
  Tied to decision #3.
- `:72,100` — the default card reads "Mehedi's Math Academy / Structured math
  courses and academic clarity." and teacher cards read
  "Teacher · Mehedi's Math Academy".

The supplied mark is embedded as a base64 data URI in the SVG. `Resvg` rasterises
it with the rest of the card.

The default card is memoised in `defaultPngCache` (`:63,71`) for the process
lifetime, so changing the art needs an API restart, not just a redeploy of the
web app.

### 4.4 Robots and sitemap — DONE

`apps/web/src/routes/robots[.]txt.ts` and `sitemap[.]xml.ts` proxy the API,
which builds both from `APP_URL`. No brand string is hardcoded in either. They
will point at the new domain automatically. Both are covered by Playwright
(`apps/web/e2e/public-pages.spec.ts:51,58`).

### 4.5 Post-launch SEO work — BLOCKED on #4

Not code, but part of "everything":

- Google Search Console and Bing Webmaster Tools: add the new property, submit
  `https://<domain>/sitemap.xml`.
- If `genex.com.bd` was ever live and indexed, 301 every path to the new domain
  and keep the redirect up for at least a year. Without it the accumulated
  ranking is lost rather than transferred.
- Re-scrape the OG cards: Facebook Sharing Debugger, LinkedIn Post Inspector,
  X Card Validator. All three cache aggressively against the URL.
- Google Business Profile, if one exists under the old name.

---

## 5. Visual language

### 5.1 Reference theme palette — IN PROGRESS

The reference project in `../mehedi_bhai/` defines the next visual direction:
ink-first surfaces, cyan primary, orange action, yellow highlights, rounded
plates, and controlled marketing motion. `DESIGN.md` now records this target.
Web and mobile CSS/token migration remains.

- `apps/web/src/styles/app.css` currently encodes the legacy warm-paper scheme.
- `apps/mobile/src/theme/tokens.ts` currently mirrors that legacy scheme.

`DESIGN.md` §1–§2 records the new reference theme from `../mehedi_bhai/`.

Target tokens to add/re-key:

- `apps/web/src/styles/app.css` — ink/paper surface tokens plus cyan/orange/yellow brand tokens
- `apps/mobile/src/theme/tokens.ts` — matching React Native surface and brand tokens
- `packages/mailer/src/templates/password-reset.ts` — email-safe brand colors
- `apps/api/src/services/og-image-service.ts` — ink card and brand accents

The design system's own rule (`app.css:51-53`) is that the hex is never typed
into a component, and those five are the complete set of places it legitimately
appears. Anything else that turns up is a bug.

### 5.2 Typography — no change needed

Hind Siliguri for Bangla and Latin body, Archivo for display labels
(`apps/web/src/styles/app.css:1-11`, `apps/mobile/app/_layout.tsx`). Neither is
brand-specific and both handle Bangla, which is the constraint that actually
matters here.

---

## 6. Mobile app store presence — BLOCKED on #2 and #4

Code-side identity is done (`8f27922`): `expo.name`, `slug`
`mehedis-math-academy`, scheme `mma`, and `com.mehedismathacademy.app` on both
platforms.

**The bundle identifier change is a new app, not an update.** `com.genex.app`
and `com.mehedismathacademy.app` are different applications to both stores. If
anything was ever published under the Genex id, existing installs will not
update to this one — they have to be migrated deliberately or left behind.
Confirm nothing shipped before treating this as free.

Store listings needing the new name and art: app name, subtitle, description,
keywords, screenshots (which contain the in-app logo), feature graphic (Play),
and the privacy-policy and support URLs, which point at the domain from
decision #4.

Also update:
- `apps/mobile/eas.json` — `EXPO_PUBLIC_API_ORIGIN` and `EXPO_PUBLIC_WEB_ORIGIN`
  are already `mehedismathacademy.com` on the preview and production profiles
  (`:18-19`, `:25-26`); confirm against the real domain.
- Google OAuth: the deep-link scheme moved from `genex://` to `mma://`. The
  authorised redirect URIs in the Google Cloud console must be updated or
  sign-in from the app breaks. Same for the SSLCommerz return URL.

---

## 7. Transactional surfaces

| Surface | File | State |
| --- | --- | --- |
| Password-reset email body | `packages/mailer/src/templates/password-reset.ts` | Localized brand and hosted academy logo. |
| Password-reset subject | `packages/i18n/src/messages/{en,bn}.ts` | Academy name in both locales. |
| SMTP sender name | `.env.example:103`, `.env.docker.example:110` | `SMTP_FROM="replace-me"`. The comment above it shows the intended shape. Blocked on #4. |
| Completion certificate | `apps/web/src/components/certificates/certificate-pdf-document.tsx` | Academy lockup included. |
| Push notifications | `apps/api/src/services/fcm-push-service.ts` | Web push icon and badge configured. |
| SMS | `.env.example:112` | `ONECODESOFT_SENDER_ID="replace-me"` — the alphanumeric sender shown on the handset. Blocked on #4. |

---

## 8. Infrastructure and configuration

| Item | Where | State |
| --- | --- | --- |
| Database | `mehedis_math_academy` | Created, migrated, seeded. The `genex` database is still on the machine and can be dropped once nothing needs it. |
| Docker project name | `docker-compose.yml:1` | `mehedis-math-academy`. Renaming the compose project orphans the old volumes — `docker compose -p genex down -v` when you are sure. |
| `APP_URL` / `APP_NAME` | `.env`, `.env.example`, `.env.docker.example` | Set. Confirm the deployed environment's real `.env` matches — it is not in the repo. |
| Deep-link scheme | `mma://` | Changed in code. Breaks any installed build using `genex://`, and needs the OAuth and payment-gateway redirect updates in §6. |
| Storage keys | `mma.session-cookie`, `mma.query-cache`, `mma.locale`, `mma.marking-mode`, `mma.bijoy.auto-convert`, cookie `mma_locale` | Changed. Every existing session and cached preference is invalidated on first load after deploy — users are signed out once. Expected, worth saying out loud before release. |
| Redis channels | `mma:messages:*`, `mma:notifications:*` | Publisher and subscriber renamed together. A rolling deploy where old and new pods coexist will drop realtime messages between them; deploy API and workers together. |
| Transaction prefix | `MMA-` | New payments only. Rows written under `GENEX-` keep their old ids, by design — a transaction id is a historical fact. |
| DNS, TLS, CDN | — | Blocked on #4. |

---

## 9. Suggested order

1. **Get the four decisions in §1.** Nothing below the Bangla name and the logo
   is worth starting without them.
2. **Bangla strings** (§3.1) — six values and one test. Smallest change with the
   largest visible effect, since Bangla is the default locale.
3. **Short name and title budget** (§4.2) — one constant and one function.
4. **Drop in the logo** (§2.1) — replace four PNGs in place, then update
   `DESIGN.md` §9. Nine surfaces update with no code change.
5. **Localise the wordmark alt text** (§3.3) — four components.
6. **Mobile icons** (§2.3) — six files plus two colours in `app.json`.
7. **Web app identity** (§2.4) — manifest, apple-touch-icon, maskable icon.
8. **OG card** (§4.3) — embed the mark, check the footer text fits, restart the
   API to clear `defaultPngCache`.
9. **Email and certificate logos** (§7).
10. **Palette**, only if decision #3 changes it (§5.1) — five tokens.
11. **Domain cutover** (§4.5, §6, §8) — DNS, TLS, OAuth redirect URIs,
    SSLCommerz, SMTP, Search Console, 301s from the old domain, social re-scrape.

Steps 2–9 are independent of each other and can be done in any order or in
parallel. Step 11 is the only one that touches production.

---

## 10. Verification

Per change:

```
bun run typecheck && bun run lint && bun run test
```

Before release:

```
bun run build
bun run --filter @mma/web test:e2e     # needs the API on 3001 and Postgres
```

E2E asserts the document title carries the chosen short name, `/MMA/i`
(`apps/web/e2e/public-pages.spec.ts:13`) and pins the locale cookie to
`mma_locale=en` (`apps/web/playwright.config.ts:38`).

Then, by hand:

- [ ] `grep -rni "genex\|জেনেক্স" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=design_handoff_genex .` returns only the four intentional `design_handoff_genex` path references (`.gitignore:27`, `.dockerignore:34`, `DESIGN.md:4`, `apps/web/vite.config.ts:54`) and the `PLAN.md:2` note.
- [ ] Landing page in Bangla — footer, homepage eyebrow, about page.
- [ ] Landing page in English.
- [ ] Browser tab shows the new favicon, not a cached G.
- [ ] `curl -sI https://<domain>/api/v1/og-image/default` returns `image/png`; open it and read the footer text.
- [ ] Share a course URL into Facebook, WhatsApp and Slack; each card shows the new name and art.
- [ ] Request a password reset in both locales; check subject and body.
- [ ] Download a completion certificate.
- [ ] Install the mobile app from a fresh build; check the launcher icon, splash and in-app header.
- [ ] Google sign-in from the mobile app — proves the `mma://` redirect URI is registered.
- [ ] A sandbox payment from the mobile app — proves the `mma://payment-callback` return path.
- [ ] `https://<domain>/robots.txt` and `/sitemap.xml` resolve and name the new domain.
- [ ] Rich Results Test on a course page — Organization and Course JSON-LD both carry the new name.
