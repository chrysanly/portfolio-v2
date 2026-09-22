# Chrys — Portfolio (public site)

Next.js 15 App Router, React 19, TypeScript, Tailwind v4. Deployed static to
Vercel. This is one of two repositories:

| Repo                                | What it is                         | Where it runs  |
| ----------------------------------- | ---------------------------------- | -------------- |
| `chrysanly/portfolio-v2` (this one) | the public site                    | Vercel, static |
| `chrysanly/portfolio-api`           | Laravel 12 + Inertia + React admin | a PHP host     |

Usually checked out side by side, as `portfolio/` and `portfolio-api/`.

**"The backend", "the API" and "the admin" always mean the `portfolio-api`
repo** — a separate checkout with its own `CLAUDE.md`, whose rules take
precedence inside that directory. On the **work PC** it lives at
`C:\Users\admin\Desktop\Chrys\Personal\portfolio-api`; other machines are
listed in `docs/BACKEND-LOCATION.md`, which also covers the crossing points.

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

Three sources, in order of preference, all resolved in `lib/projects.ts`:

1. `content/snapshot.json` — written by `scripts/pull-content.mjs` from the
   Laravel API, and **committed**.
2. `content/projects/*.mdx` — the original source, still fully supported.

`npm run build` runs the pull first (via `prebuild`). Behaviour:

| `PORTFOLIO_API_URL`  | What happens                                 |
| -------------------- | -------------------------------------------- |
| empty                | builds from the MDX. No backend needed.      |
| set, API reachable   | pulls, rewrites the snapshot, builds from it |
| set, API unreachable | warns, builds from the committed snapshot    |

The build never fails because the backend is asleep — `docs/08-BACKEND.md` §2,
"Build resilience". To go back to MDX, delete `content/snapshot.json`.

**Never add a runtime `fetch` to the API from a page.** The site is static and
must stay that way; if a feature seems to need runtime data, it needs a rebuild
trigger instead.

## Local HTTPS: NODE_EXTRA_CA_CERTS

Herd serves `portfolio-api.test` with its own certificate authority, which Node
does not trust. Without `NODE_EXTRA_CA_CERTS` pointing at it, every content
fetch fails with a bare `fetch failed` and the build quietly uses the snapshot —
which looks like a working build until you notice the content is stale.

```
NODE_EXTRA_CA_CERTS=C:/Users/<you>/.config/herd/config/valet/CA/LaravelValetCASelfSigned.crt
```

Note that `scripts/pull-content.mjs` runs as a bare node process from
`prebuild`, so `next.config.ts` never loads for it — anything set there does not
apply to the pull. The script re-spawns itself once with the CA in place,
because Node reads that variable only at startup.

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

| Task              | Command                               |
| ----------------- | ------------------------------------- |
| Dev               | `npm run dev`                         |
| Build             | `npm run build` (pulls content first) |
| Types + lint      | `npm run check`                       |
| Format            | `npm run format`                      |
| Pull content only | `npm run content:pull`                |

## Connecting to the backend

In `.env.local`:

```
PORTFOLIO_API_URL=https://portfolio-api.test     # or the live URL
PORTFOLIO_API_TOKEN=<from the backend>
```

Issue the token in the API repo with
`php artisan portfolio:build-token --email=...`. It is shown once, and its only
ability is `content:read` — it cannot publish, delete, or read messages.

## Which skills have been used

`docs/SKILLS-USED.md` is kept current on Chrys's standing instruction. Add a
section the first time a skill is used on this project, naming what it actually
changed — including when the answer is "nothing useful".
