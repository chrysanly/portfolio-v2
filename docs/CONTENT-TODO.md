# CONTENT-TODO

Every placeholder currently reaching the built output, grouped by the file you
edit to fix it. Nothing here has been guessed or filled in — that is deliberate.

Generated from `.next/server/app/**/*.html` after a clean build on 2026-09-18.
Regenerate the inventory any time with:

```bash
grep -rlo '\[METRIC\]\|\[what it improved\]\|\[X\] days weekly\|\[problem statement[^]]*\]\|\[stack\]' .next/server/app --include=*.html
```

Mapped to the launch blockers in `06-IMPLEMENTATION-PLAN.md`:

| Blocker | Section below |
|---------|---------------|
| 1 — `[METRIC]` / `[what it improved]` visible | §2 |
| 2 — `[X] days weekly` unfilled or unwanted | §1 |
| 3 — `[linkedin-url]` unfilled | §1 |
| 4 — fewer than two real sentences under `## Problem` | §3 |
| 5 — zero screenshots site-wide | §6 |
| 6 — NDA decision not made per project | §7 |
| 7 — date of birth or civil status in the output | **clear in the built site**; NOT clear in `docs/resume.pdf` — see §5 |

§4 (devio's stack) and §5 (the missing résumé) are not numbered blockers but
both must be resolved before launch.

---

## 1. `content/site.ts`

| Line | Placeholder | What to supply |
|------|-------------|----------------|
| 15 | `availability: '[X] days weekly'` | The number of days a week you want to take on work — or tell me to remove the availability line entirely. It currently renders on **`/about`** and in the home metadata row on **`/`**. Launch blocker 2 says an unfilled value *and* an unwanted-but-still-shown line both block launch. |
| 19 | `links.linkedin: '[linkedin-url]'` | Your full LinkedIn profile URL. |

**Note on the LinkedIn URL:** it is a launch blocker, but it does not currently
appear in any built page — nothing on the site links to LinkedIn. Supplying the
URL alone will not make it visible. Tell me where it should go (About, the
contact page, the `Person` JSON-LD `sameAs` array, or all three) and I will wire
it up. I did not choose a placement for you.

---

## 2. Outcome metrics — all six projects

This is the single highest-value gap on the site (`07-SOURCE-CONTENT.md` §6).
Every project's frontmatter has the same two fields, and both render: the value
large on the detail page, and both together in the work index row.

For each, supply **one** of: time saved, error rate reduced, throughput
increased, cost avoided, or users served. An honest approximation stated as
approximate is fine.

| File | Lines | Fields |
|------|-------|--------|
| `content/projects/modular-erp-platform.mdx` | 14–15, 59 | `outcome.value`, `outcome.label`, and the `## Outcome` body line |
| `content/projects/crm-systems-integration.mdx` | 14–15, 50 | same three |
| `content/projects/realtime-platform-suite.mdx` | 14–15, 55 | same three |
| `content/projects/document-parsing-engine.mdx` | 14–15, 41 | same three |
| `content/projects/booking-vendor-platform.mdx` | 14–15, 50 | same three |
| `content/projects/devio.mdx` | 14–15, 38 | same three |

Visible on: `/`, `/work`, all four `/work/type/*` pages, and all six
`/work/[slug]` pages.

---

## 3. Problem statements — five projects

`06-IMPLEMENTATION-PLAN.md` launch blocker 4: **at least two real sentences**
under `## Problem`. Only the ERP platform had problem material in the CV, so the
other five ship a bracketed placeholder rather than an invented paragraph.

What each needs: what was broken, slow, manual or risky *before* you built it.
Not what you built — that is already written under `## Approach`.

| File | Line | Placeholder |
|------|------|-------------|
| `content/projects/crm-systems-integration.mdx` | 29 | `[problem statement — what was broken before]` |
| `content/projects/realtime-platform-suite.mdx` | 31 | `[problem statement — what was broken before]` |
| `content/projects/document-parsing-engine.mdx` | 27 | `[problem statement — what was broken before]` |
| `content/projects/booking-vendor-platform.mdx` | 31 | `[problem statement — what was broken before]` |
| `content/projects/devio.mdx` | 25 | `[problem statement — what was broken before]` |

`modular-erp-platform.mdx` already has a real two-sentence problem statement
taken from `07-SOURCE-CONTENT.md` §5.1 and needs nothing.

---

## 4. `content/projects/devio.mdx` — stack

| Line | Placeholder | What to supply |
|------|-------------|----------------|
| 17 | `stack: ["[stack]"]` | §5.6 of the source document gives devio no stack, and the Zod schema requires 1–12 entries, so it ships as a literal placeholder. List what you actually build devio sites with. |
| 34 | `## Stack notes` body reads `[stack notes]` | One or two sentences, or tell me to drop the section for this project. |

---

## 5. `docs/resume.pdf` — BLOCKED, do not publish as-is

The file now exists at `docs/resume.pdf`. It has **not** been copied to
`public/` and the About link is still removed, because its text contains:

```
Date of Birth: June 24, 1997
Civil Status: Single
```

`07-SOURCE-CONTENT.md` §1 forbids both anywhere on the site, explicitly
including "the résumé PDF served from the site", and launch blocker 7 covers
the built output. Publishing this file would breach that in one step.

It also carries the phone number, which is fine — that is permitted on
`/contact`, and a downloaded résumé is not page metadata.

**What to supply:** the same résumé with those two lines removed. Export a web
version of the CV without them; keep the Gulf-convention version for direct
applications if you want it. Drop it at `public/resume.pdf` and tell me — I
will restore the About link and re-scan the file before it ships.

Re-scan at any time with the extractor in the session scratchpad, or simply
search the PDF text for "Date of Birth" and "Civil Status" before handing it
over.

## 6. Screenshots — two projects

`images: []` on every project, so the Evidence section is omitted entirely
everywhere. That is correct behaviour, not a gap to patch — but launch blocker 5
requires at least the two projects that permit visuals to have them.

| File | Why it is permitted |
|------|---------------------|
| `content/projects/document-parsing-engine.mdx` | Your own work, `confidential: false` |
| `content/projects/devio.mdx` | Your own practice, `confidential: false` |

Each image needs `src`, and **`alt` is required by the schema** — the build
fails without it. A `caption` is optional.

Do **not** add screenshots to the four confidential projects.

---

## 7. NDA decision — four projects

`07-SOURCE-CONTENT.md` §5.8. All four client projects currently ship the safe
default: `confidential: true`, `client: null`. Nothing changes without your
explicit instruction, project by project.

| File | Current sector line | If you permit naming the client |
|------|--------------------|----------------------------------|
| `content/projects/modular-erp-platform.mdx` | Vehicle testing and registration | `confidential: false` + `client: Almutakamela Vehicle Testing and Registration` |
| `content/projects/crm-systems-integration.mdx` | Pharmaceutical | `confidential: false` + the client name |
| `content/projects/realtime-platform-suite.mdx` | Software services | `confidential: false` + the client name |
| `content/projects/booking-vendor-platform.mdx` | Travel and tourism | `confidential: false` + the client name |

The schema enforces the pairing in both directions, so a half-finished change
fails the build rather than leaking a name.

---

## Not a content gap — for completeness

These are open items that are **not** placeholders, listed so they are not lost:

- **Deploy to Vercel** with `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and
  `NEXT_PUBLIC_SITE_URL` set. Until `NEXT_PUBLIC_SITE_URL` exists, the sitemap,
  robots and OG image URLs fall back to `https://chrys.dev`, which is a guess.
- **End-to-end email delivery** is unproven — no Resend key has ever been set,
  so the send path has only been exercised to its failure branch.
- **`06-IMPLEMENTATION-PLAN.md` launch blocker 6 cites `07-SOURCE-CONTENT.md`
  §5.7** for the NDA decision. That moved to §5.8 when `portfolio-backend` took
  §5.7. A stale cross-reference in the spec, not in the code.
