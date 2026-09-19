# 08 — Backend (Laravel API + Admin)

**Build this only after Phases 1–7 are live.** See `06-IMPLEMENTATION-PLAN.md`
Phase 8. A backend built before the public site exists is how this project
stalls.

## 1. What this is for

Two purposes, in order of importance:

1. **It is itself a portfolio project.** Four of the six client projects cannot
   show screenshots. This one has no NDA: Chrys owns it, so the admin UI, the
   schema, the repository and service layers and the RBAC can all be
   photographed, documented and written up. It converts his strongest skill
   into the visual evidence the site is otherwise missing.
2. It removes the need to edit MDX by hand to publish a project.

It is explicitly **not** here to serve page requests. See §2.

## 2. The critical architectural rule

**The public site consumes this API at build time, never at runtime.**

```
Admin edits a project
        │
        ▼
  Laravel API  ──── webhook ────►  Vercel Deploy Hook
        │                                 │
        │   GET /api/v1/content           ▼
        └──────────────────────►  Next.js build
                                          │
                                          ▼
                                  Static site, no server
```

Consequences, all of which are the point:

- The public site keeps free static hosting and sub-second loads.
- **If Laravel is down, the site is unaffected** — the last build is still
  served. The failure mode is "content is stale", never "portfolio is broken".
- No API latency in front of LCP, so the `02-TRD.md` budgets still hold.

Do not add runtime `fetch` calls to this API from any public page. If a future
feature seems to need one, it doesn't — it needs a rebuild trigger.

### Build resilience

`lib/content.ts` in the Next.js app fetches from the API at build, then writes
`content/snapshot.json`, which **is committed**. If the API is unreachable
during a build, fall back to the committed snapshot and log a warning. A build
must never fail because the backend is asleep on a free tier.

## 3. Stack

| Concern | Choice |
|---------|--------|
| Framework | Laravel 12 |
| Database | MySQL 8 |
| Admin auth | PIN (session), single user |
| Build-token auth | Laravel Sanctum, one token for the Next.js build |
| Admin UI | Inertia + React + TypeScript, hand-built |
| Images | Local disk in development, S3-compatible in production |
| Testing | Pest |
| PHP | 8.3 minimum (8.4 in development) |

**Do not use Filament or Nova.** They would build the admin for you, which
defeats purpose #1 — there is nothing to write up if a package generated it.

> **Amended 19 Sep 2026.** This table said "Blade + Alpine.js". Chrys asked for
> Laravel + React, and the reason for the Filament/Nova ban is auto-generation,
> not the templating language — a hand-built React admin is still his code, so
> it does not hit that problem. It serves purpose #1 better, in fact: "Laravel +
> React" is a more hireable combination to show than "Laravel + Blade + Alpine",
> and it matches the TypeScript he already writes on the public site.
>
> The public site was **not** converted. Moving it to Inertia would have turned
> 27 prerendered static pages into per-request PHP responses and killed §2's
> guarantee — the whole reason this backend can be down without the portfolio
> being down. React is on this side of the line only.
>
> Built with the official `laravel/react-starter-kit` (Laravel 12 + Inertia 2 +
> React 19 + TypeScript + Tailwind 4). That kit's tagged release targets
> Laravel 12; its `main` branch targets 13 but is untagged, and an unreleased
> branch is the wrong foundation for something meant to be shown to employers.
Hand-built Blade CRUD is the artefact here.

Architecture follows Chrys's existing practice: Repository pattern for data
access, Service layer for business rules, form requests for validation,
API resources for serialisation, RBAC middleware even with one role (the
pattern is the point, and it's what he'll be asked about).

## 4. Schema

### `projects`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| slug | string(80) unique | URL segment |
| title | string(120) | |
| type | enum | erp, automation, web, integration |
| confidential | boolean, default **true** | safe default |
| client | string(160) nullable | must be null when confidential |
| sector | string(120) nullable | required when confidential |
| year | smallint | |
| role | string(120) | |
| summary | string(200) | shown in the index |
| problem | text | |
| approach | text | markdown |
| stack_notes | text nullable | |
| outcome_value | string(40) | `[METRIC]` until real |
| outcome_label | string(80) | |
| stack | json | array of strings, 1–12 |
| featured | boolean | |
| sort_order | smallint | |
| published_at | timestamp nullable | null = draft, excluded from the API |
| created_at / updated_at | timestamps | |

**Database-level integrity, not just validation:** add a check constraint so
`confidential = 1` requires `client IS NULL AND sector IS NOT NULL`, and
`confidential = 0` requires `client IS NOT NULL`. The same rule exists in the
form request and in the Zod schema on the Next.js side. Three layers, because
an accidental NDA breach is the one failure with real consequences.

### `project_images`

`id`, `project_id` FK cascade, `path`, `alt` (**required**, non-empty),
`caption` nullable, `sort_order`, timestamps.

Uploads are blocked in the service layer when the parent project has
`confidential = true`, unless an explicit `images_cleared` flag is set on the
project. Prevents uploading a client screenshot by accident.

### `messages`

`id`, `name`, `email`, `company` nullable, `message`, `ip_hash` (**hashed, never
raw**), `created_at`, `delivered_at` nullable.

Retention: a scheduled command deletes rows older than 180 days. Write the
command in the same phase as the table, not later.

### `users`

Standard Laravel. One account. No public registration route — remove it.

## 5. Endpoints

### Build-time content (Sanctum token)

```
GET /api/v1/content
```

Returns everything the site needs in one response: site constants, published
projects with images, ordered. One call, one round trip, no N+1.

```json
{
  "generated_at": "2026-09-18T10:00:00Z",
  "site": { "name": "Chrys", "role": "...", "yearsExperience": "5+", "...": "..." },
  "projects": [ { "slug": "...", "title": "...", "images": [] } ]
}
```

Shape must match the TypeScript interfaces in `05-DATA-SCHEMA.md` §2 exactly.
Where they differ, the TypeScript wins and the API resource adapts.

Never expose date of birth, civil status, or the phone number in this payload —
`07-SOURCE-CONTENT.md` §1.

> **Amended 19 Sep 2026 — authentication.** This said Laravel Breeze with email
> and password. Chrys asked for a PIN instead: one field, one person, nothing to
> remember. Implemented with the PIN in `ADMIN_PIN` and stored only as a bcrypt
> hash in the account's password column, five attempts a minute per IP, and
> constant-time comparison. Registration, password reset, email verification and
> password confirmation routes are **deleted**, not unlinked.
>
> This is a real reduction in strength — six digits is a million combinations —
> and the throttle is the only thing that makes it acceptable. Do not remove it,
> and do not add a second admin account without replacing the mechanism: a PIN
> carries no identifier, so it cannot tell two people apart.

### Contact relay (public, rate-limited)

```
POST /api/v1/messages
```

Replaces the Next.js route handler from Phase 6 **only if** you want messages
stored. Same Zod-equivalent validation, same honeypot, same 5-per-IP-per-hour
limit, same status codes as `05-DATA-SCHEMA.md` §4. Stores the row, queues the
email, returns 200.

If you keep the Phase 6 email-only handler instead, that is a valid choice —
say so explicitly rather than leaving both wired up.

> **Decided 19 Sep 2026: both, in a defined order.** The Next.js handler still
> owns delivery — moving the form to Laravel would make a static site depend on
> a PHP host at runtime for the one thing a visitor can actually do, which
> contradicts §2. But an inbox that is always empty is not worth building.
>
> So `app/api/contact/route.ts` sends the email first, then posts a copy to
> `/api/v1/messages` through `lib/archive.ts`. The copy is awaited — a
> serverless function can be frozen the moment it responds, so a floating
> promise would be cut off — and its failure is swallowed and logged. The
> message has already been delivered; telling the sender otherwise because a
> database was asleep would be a lie. With `PORTFOLIO_API_URL` unset it does
> nothing at all.

### Publish trigger

On project create, update, delete or publish, a service dispatches a queued job
that POSTs to the Vercel Deploy Hook. Debounce: one rebuild per 60 seconds, so
editing five fields doesn't fire five builds.

## 6. Admin

Routes under `/admin`, session-authenticated, all behind `auth` and a
`role:admin` middleware.

- Project list with draft/published state and a reorder control
- Project create/edit form, with the confidential toggle disabling and clearing
  the client field in the UI
- Image upload with a **required** alt-text field — the form will not submit
  without it
- Message inbox, read-only, with delivered status
- A "Rebuild site" button showing the last build time

Keep it plain and legible. This screen gets screenshotted.

## 7. Environment

```
APP_KEY=
DB_*=
SANCTUM_STATEFUL_DOMAINS=
VERCEL_DEPLOY_HOOK_URL=
MAIL_* / RESEND_API_KEY=
CONTACT_TO_EMAIL=
```

On the Next.js side: `CONTENT_API_URL`, `CONTENT_API_TOKEN`.

## 8. Acceptance criteria

1. `GET /api/v1/content` returns a payload that type-checks against the
   TypeScript interfaces with no adapters in the Next.js app.
2. A build with the API switched off completes successfully from
   `content/snapshot.json`.
3. Attempting to save a project with `confidential = true` and a client name
   fails at the database level, not only in the form. Prove it with a Pest test
   and a raw SQL insert.
4. Uploading an image to a confidential project is rejected.
5. A save in the admin produces a live site update within two minutes.
6. Five rapid saves produce one rebuild, not five.
7. Pest covers: the confidential constraint, the rate limiter, the honeypot,
   the debounce.
8. No raw IP is stored anywhere.

## 9. This becomes project 07

Once live, add it to the site as a seventh project — the only one with a full
architecture write-up and real screenshots.

```yaml
slug: portfolio-backend
type: automation
confidential: false
client: Personal project
featured: true
```

Write-up should cover: why build-time over runtime, the three-layer NDA
constraint, the repository and service split, the debounced rebuild, and the
snapshot fallback. That reasoning is the actual demonstration of seniority —
more than the code itself.
