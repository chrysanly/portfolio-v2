# 02 — Technical Requirements Document

## 1. Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15.5.x | App Router. 15.5.25 or later — 15.1.x carries CVE-2025-66478 |
| Language | TypeScript, `strict: true` | Content model is typed end to end |
| Styling | Tailwind CSS v4 | Tokens declared in `@theme`, see the design brief |
| Motion | Framer Motion | Needed only for the hero; nothing else justifies it |
| Content | Local MDX + typed frontmatter | No CMS, no database for content |
| Frontmatter parser | `gray-matter` | Required by the MDX choice above |
| MDX renderer | `next-mdx-remote` | Required by the MDX choice above |
| Forms | React Hook Form + Zod | Same Zod schema validates client and server |
| Mail | Resend | Free tier sufficient; swap point isolated in one module |
| Hosting | Vercel | Zero config, free tier |
| Fonts | `next/font/google` — Bodoni Moda, Public Sans | Self-hosted at build, no layout shift |

**Do not add** a CMS, state manager, component library, animation library
beyond Framer Motion, icon package (inline SVG only), or analytics beyond a
single privacy-preserving script. Ask first.

A dependency that is strictly required to implement a choice already made in
this table (a parser for the MDX content layer, a security patch release of a
listed package) is pre-approved. Name it in your summary; do not stop to ask.

## 2. Rendering

- Every page statically generated. `generateStaticParams` for project routes.
- The contact endpoint is the only dynamic surface: a single Route Handler at
  `app/api/contact/route.ts`, Node runtime.
- No client components above what motion and forms require. The hero,
  the theme toggle if built, and the contact form are client components.
  Everything else is a server component.

## 3. Project structure

```
app/
  layout.tsx                 root: fonts, metadata, skip link
  page.tsx                   home
  work/page.tsx              index, optional type filter
  work/[slug]/page.tsx       project detail
  about/page.tsx
  contact/page.tsx
  api/contact/route.ts
  sitemap.ts  robots.ts  opengraph-image.tsx
components/
  hero/                      MastheadHero, useHeroScroll
  work/                      WorkIndexRow, ProjectMeta, OutcomeFigure
  ui/                        Prose, Field, Button, Rule
content/
  projects/*.mdx
  site.ts                    name, role, location, links, placeholders
lib/
  projects.ts                read, validate, sort
  schema.ts                  Zod schemas, inferred types
  mail.ts                    Resend wrapper, the only vendor-aware file
```

## 4. Budgets

| Metric | Budget |
|--------|--------|
| LCP (mobile, 4G) | ≤ 1.8s |
| CLS | ≤ 0.02 |
| INP | ≤ 200ms |
| JS shipped to the home route | ≤ 120KB gzipped |
| Lighthouse Accessibility | 100, no exceptions |

Framer Motion is imported only in the hero module so it stays out of every
other route's bundle.

## 5. Accessibility

- Semantic elements only. A clickable thing is an `<a>` or a `<button>`. Never
  `onClick` on a `div`.
- Every interactive element has a visible focus ring that meets 3:1 against
  its background.
- Skip-to-content link as the first focusable element.
- Text contrast 4.5:1; 3:1 for text at 24px and above. Verify the muted greys
  in the design brief rather than assuming.
- `prefers-reduced-motion: reduce` renders the hero's **final state
  immediately** with no scroll dependency and no transition. This is a
  required code path, not a nicety.
- The hero must be fully readable with JavaScript disabled — render the
  resolved state in HTML and let motion enhance it.
- Touch targets ≥ 44×44px.
- Form fields have real `<label>` elements. Errors are tied to inputs by
  `aria-describedby` and announced in a live region.

## 6. Contact endpoint

- Validates with the shared Zod schema; rejects with 422 and field-level errors.
- Honeypot field plus a minimum time-on-form check. No CAPTCHA.
- Rate limit: 5 requests per IP per hour, in-memory is acceptable at this scale.
- Never echoes submitted values back into HTML.
- `RESEND_API_KEY` and `CONTACT_TO_EMAIL` come from environment variables and
  are never committed. Provide `.env.example` with empty values.

## 7. SEO

- Per-route `metadata`. Title pattern: `Chrys — {page}`.
- `Person` JSON-LD on the home route.
- Generated OG image per project route.
- `sitemap.ts` and `robots.ts` generated from the project list.

## 8. Quality gates

- ESLint and Prettier; `tsc --noEmit` clean.
- Build fails if any MDX file fails Zod validation — a malformed project must
  not reach production.
- No `any`. No `@ts-ignore` without a comment naming the reason.
