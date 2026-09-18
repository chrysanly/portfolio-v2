# 06 — Implementation Plan

Seven phases. Finish a phase and meet its acceptance criteria before starting
the next. Do not scaffold the whole site up front.

Effort assumes roughly two days per week.

---

## Phase 1 — Foundation

**Build**
- Next.js 15 + TypeScript (`strict`) + Tailwind v4.
- Colour and type tokens from the design brief declared in `@theme`.
- Fonts via `next/font/google`: Bodoni Moda (400, 600), Public Sans (400, 500, 600).
- Root layout: metadata, skip link, `<main id="content">`.
- ESLint, Prettier, `tsc --noEmit` in CI.

**Acceptance**
- A page rendering every token and type size builds and passes type-check.
- No layout shift on font load (`next/font` handles this — verify, don't assume).

---

## Phase 2 — Content pipeline

**Build**
- Zod schemas from `05-DATA-SCHEMA.md`.
- `lib/projects.ts`: read `content/projects/*.mdx`, validate, sort by `order`.
- The confidential/client cross-validation rule.
- The `attribution` helper.
- Three real project files: modular ERP platform, document parsing engine, devio.
- All six project files from `07-SOURCE-CONTENT.md` §5, four marked `featured`.
- `content/site.ts` with the real values from `05-DATA-SCHEMA.md` §3.

**Acceptance**
- An MDX file with `confidential: true` and a non-null `client` **fails the
  build**. Prove this, then revert the test file.
- Projects load with correct types; no `any` anywhere in the path.

---

## Phase 3 — Static home, resolved state only

Build the home route as it looks *after* the hero sequence finishes. No motion
yet. This is deliberate: it guarantees the no-JS and reduced-motion paths exist
before any animation is written.

**Build**
- Sticky header with the compact masthead, nav, contact link.
- Metadata row: discipline, stack, experience, availability.
- Work index rows per the design brief, desktop and stacked mobile.
- Contact band closing the page.

**Acceptance**
- Fully usable with JavaScript disabled.
- Keyboard navigable; focus rings visible on every interactive element.
- Lighthouse Accessibility 100 on mobile.
- A project with `client: null` and `images: []` renders with no gap, no
  placeholder box, no "image coming soon".

---

## Phase 4 — Hero sequence

**Build**
- `MastheadHero` client component, pinned section ~200vh.
- Framer Motion `useScroll` with `offset`, driving `p` from 0 to 1.
- Stages A, B, C per design brief §5, transform and opacity only.
- Mask-wipe reveal for the three intro lines, sequenced by `p`.
- `prefers-reduced-motion` branch rendering Phase 3's output with no pin.
- Mobile compression to ~150vh.

**Acceptance**
- 60fps while scrolling the sequence on a mid-range Android device. Profile it;
  do not assume.
- Reduced-motion preference produces the Phase 3 page exactly.
- Framer Motion appears in the home bundle only — verify with the bundle analyzer.
- CLS ≤ 0.02 through the whole sequence.

*If the sequence cannot hit 60fps on mobile, shorten it rather than adding
`will-change` everywhere. A janky hero is worse than no hero.*

---

## Phase 5 — Remaining routes

**Build**
- `/work` with URL-based type filtering and the empty-filter state.
- `/work/[slug]` in the fixed section order; evidence section omitted entirely
  when `images` is empty.
- `/about`.
- 404 in the site's visual language.
- Previous/next project navigation.

**Acceptance**
- Filter state survives a page refresh and is shareable as a URL.
- Back from a detail page returns to the filtered index.
- Every route passes Accessibility 100.

---

## Phase 6 — Contact

**Build**
- `/contact` with React Hook Form + the shared Zod schema.
- All five states from the app flow.
- Route handler, honeypot, time-check, rate limit, Resend integration.
- Errors tied to inputs via `aria-describedby`, announced in a live region.

**Acceptance**
- A real message is delivered end to end.
- Honeypot submission returns 200 and sends nothing.
- Sixth request within an hour returns 429.
- Submitting with the keyboard alone works, and focus lands on the first
  invalid field.

---

## Phase 7 — Launch readiness

**Build**
- Per-route metadata, `Person` JSON-LD, generated OG images.
- `sitemap.ts`, `robots.ts`.
- `resume.pdf`.
- Deploy to Vercel with environment variables set.

**Acceptance**
- Lighthouse mobile: Performance ≥ 95, Accessibility 100, Best Practices ≥ 95,
  SEO 100.
- Tested on real iOS Safari and Android Chrome, not just a simulator.
- Link preview renders correctly when pasted into LinkedIn and WhatsApp.

---

## Launch blockers

The site does not go live while any of these remain:

1. Any `[METRIC]` or `[what it improved]` placeholder is still visible.
2. `[X] days weekly` availability is unfilled, or the line is still shown when
   Chrys has decided not to publish availability at all.
3. `[linkedin-url]` is unfilled.
4. Any project has fewer than two real sentences under `## Problem`.
5. Zero screenshots across the entire site — at minimum the document parsing
   engine and devio need visual evidence, since both permit it.
6. The NDA decision in `07-SOURCE-CONTENT.md` §5.7 has not been made for each
   client project.
7. Date of birth or civil status appears anywhere in the built output. Grep
   for them before deploying.

Placeholders exist so these gaps are impossible to miss. Do not fill them with
plausible-sounding invented values to clear the list.

## Phase 8 — Laravel API and admin (post-launch only)

**Do not start this before Phases 1–7 are live with real metrics filled in.**
Full specification in `08-BACKEND.md`.

**Build**
- Laravel 12 + MySQL, Repository and Service layers, Sanctum build token.
- Schema per `08-BACKEND.md` §4, including the database-level confidential
  constraint.
- `GET /api/v1/content` returning one payload matching the TypeScript
  interfaces in `05-DATA-SCHEMA.md` §2.
- Hand-built Blade admin. No Filament, no Nova.
- Debounced Vercel deploy hook on publish.
- `lib/content.ts` in the Next.js app switched from MDX to the API **at build
  time**, with `content/snapshot.json` committed as the fallback.

**Acceptance** — all eight criteria in `08-BACKEND.md` §8, in particular:
a build with the API offline must succeed from the snapshot, and a raw SQL
insert violating the confidential rule must be rejected by the database.

**Then** add it to the site as project 07 with a full architecture write-up
and real screenshots — the one project with no NDA limits.

---

## Post-launch backlog

Dark theme, résumé as a route rather than a PDF, case-study depth on the ERP
work, Arabic localisation. None of it before launch.
