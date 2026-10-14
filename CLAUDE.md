# Chrys — Portfolio (public site)

Next.js 15 App Router, React 19, TypeScript, Tailwind v4. Deployed to Vercel
with every page cached. This is one of two repositories:

| Repo                                | What it is                         | Where it runs  |
| ----------------------------------- | ---------------------------------- | -------------- |
| `chrysanly/portfolio-v2` (this one) | the public site                    | Vercel, cached |
| `chrysanly/portfolio-api`           | Laravel 12 + Inertia + React admin | a PHP host     |

Always checked out side by side: this repo is `portfolio/` on the work PC and
`portfolio-v2/` on the home PC, with `portfolio-api/` beside it on both.

**"The backend", "the API" and "the admin" always mean the `portfolio-api`
repo** — a separate checkout with its own `CLAUDE.md`, whose rules take
precedence inside that directory. On the **work PC** it lives at
`D:\Chrys\Personal\portfolio repo\portfolio-api`; on the **home PC** at
`D:\Projects\portfolio-api`. `docs/BACKEND-LOCATION.md` has the machine table,
the per-machine PHP binary, and the crossing points.

## Read the specification first

`docs/` holds eight numbered documents and they are the source of truth, not
this file. Before changing anything non-trivial, read the one that covers it —
particularly `07-SOURCE-CONTENT.md`, which is the only sanctioned source for
every fact on the site.

## Rules that override any instinct to improve things

1. **Every fact comes from `docs/07-SOURCE-CONTENT.md`.** Bracketed placeholders
   like `[METRIC]` and `[what I learned here]` ship verbatim. Never replace one
   with a plausible-looking figure — an invented metric on a portfolio is a lie
   told to an employer. Open items are tracked in `docs/CONTENT-TODO.md`.
2. **Never publish date of birth or civil status.** Not on a page, not in
   metadata, not in JSON-LD, not in a résumé served from the site. The phone
   number appears on `/contact` only — never in the footer or structured data.
   `docs/resume.pdf` contains all three and is therefore **not** published.
3. **NDA default.** All four client projects are `confidential: true` with
   `client: null`. Do not change one without explicit per-project instruction.
   The rule is enforced in `lib/schema.ts` and fails the build in both
   directions.
   **Screenshots of NDA work may be shown, marked and blurred.** Each image
   carries an `nda` flag from the API, and this site draws the treatment from
   it — an `NDA` ribbon in the selected accent across the top-right corner,
   plus a blur on the picture (`components/work/NdaWatermark.tsx`, `.nda` in `globals.css`).
   Never render an image that arrives with `nda: true` without both, and never
   composite either into a file: they are CSS so that a clearance can take
   them off later, and so that the mark reads on a light screenshot and a dark
   one. The blur is the part that actually withholds the contents — the ribbon
   only states the restriction.
4. **No new dependencies** beyond `docs/02-TRD.md` §1 without asking. There is
   no icon package — icons are inline SVG. react-three-fiber was asked for and
   refused: ~600kB against a 120kB first-load budget.

## Where the content comes from

**The database is the only content source. The site reads it through
`GET /api/v1/content`, caches every page, and refreshes on save.**

```
Admin saves a published project
        │
        ▼
  Laravel API ── POST /api/revalidate ──►  Next.js on Vercel
        ▲                                        │
        │      GET /api/v1/content               │ regenerates the cached
        └────────────────────────────────────────┘ pages from fresh content
```

How it behaves, all of which is deliberate:

- **Pages are cached, not rendered per request.** `lib/content-source.ts`
  fetches with the `content` cache tag and `revalidate: false`, so a visitor
  is served the cached page and never waits on the API. In development the
  cache is off and every request reads the API.
- **A save refreshes the site.** Saving a published project (or "Sync site" on
  the dashboard) POSTs to the site's `/api/revalidate` with the shared secret;
  the tag is invalidated and the next request regenerates from fresh content.
- **A failed read throws.** No snapshot, no MDX, no fallback. At build time the
  build fails with a `[content] …` message naming the reason. At runtime a
  failed regeneration leaves Next serving the last good page — an empty or
  partial page is never cached in its place.
- **If Laravel is down,** a running production site keeps serving its cached
  pages; only a new build, or a regeneration after a save, needs the API up.

There is no committed snapshot, no MDX and no build-time pull script any
more. Do not reintroduce a local copy of the content: two sources is how the
site and the admin came to disagree.

Every row is validated by the Zod schemas in `lib/schema.ts`, so a backend
that drifts from the contract fails the build. The phone number is the one
fact that never comes from the API: it lives in `content/site.ts` and renders
on `/contact` only.

## Local HTTPS: NODE_EXTRA_CA_CERTS

Herd serves `portfolio-api.test` with its own certificate authority, which Node
does not trust. Point `NODE_EXTRA_CA_CERTS` at it in `.env.local`:

```
NODE_EXTRA_CA_CERTS=C:/Users/<you>/.config/herd/config/valet/CA/LaravelValetCASelfSigned.crt
```

Node reads that variable only at startup, so `dev`, `build` and `start` run
through `scripts/with-ca.mjs`, which loads it before Next starts. Without it
every content read fails with `fetch failed` — and with no fallback, the build
says so. Certificate verification is never switched off
(`NODE_TLS_REJECT_UNAUTHORIZED=0` is gone from `next.config.ts`).

`curl --cacert` still fails on Windows with `CERT_TRUST_REVOCATION_STATUS_UNKNOWN`.
That is schannel, not the certificate; Node uses OpenSSL and is fine.

## Verification, and the traps in it

Claims about performance and layout on this project are measured in a real
browser over CDP, never asserted from reading the code. Two traps have produced
false alarms repeatedly:

- **Never run `next build` while `next start` is running.** Every asset 400s and
  Lighthouse reports failures that look like real regressions. Stop the server,
  `rm -rf .next`, build once, serve once, and check the CSS returns 200 before
  believing any number.
- **Never use Chrome's `--virtual-time-budget`** to capture scroll animation. It
  starves Framer's rAF and the page reads as frozen.

## Commands

| Task         | Command                                         |
| ------------ | ----------------------------------------------- |
| Dev          | `npm run dev` (reads the API on every request) |
| Build        | `npm run build` (needs the API reachable)       |
| Types + lint | `npm run check`                                 |
| Tests        | `npm test` (Node's own `node:test`, no deps)    |
| Format       | `npm run format`                                |

## Connecting to the backend

In `.env.local`:

```
PORTFOLIO_API_URL=https://portfolio-api.test     # or the live URL
PORTFOLIO_API_TOKEN=<from the backend>
REVALIDATE_SECRET=<same as SITE_REVALIDATE_SECRET in the API>
```

These are required — there is no other content source. Placeholders are in
`.env.example`; real values go only in `.env.local` or the host's environment.

Issue the token in the API repo with
`php artisan portfolio:build-token --email=...`. It is shown once, and its only
ability is `content:read` — it cannot publish, delete, or read messages.

## Which skills have been used

`docs/SKILLS-USED.md` is kept current on Chrys's standing instruction. Add a
section the first time a skill is used on this project, naming what it actually
changed — including when the answer is "nothing useful".
