# Progress — session of 19 Sep 2026

Live checklist. `[x]` done and verified, `[~]` in progress, `[ ]` not started.
Pick up at the first `[~]` or `[ ]`.

---

## This batch (current work)

- [ ] **1. Section next/previous navigation** — jump one section at a time
      instead of scrolling. Buttons fixed to the viewport edge, keyboard
      accessible.
- [ ] **2. Floating "Send a message"** — persistent contact affordance.
      *Recommendation below — read before building.*
- [ ] **3. Stack + contact bands redesigned** — the two sections in your
      screenshot.
- [ ] **4. Restore scroll position on Back** — currently every entry to a page
      starts at the top, which is right for a refresh and wrong for Back.
- [ ] **5. Header nav on inner pages** — decide whether to show Work/About/
      Contact links, and mark the current one.

### My recommendations for 2 and 5, before I build them

**2 — a floating button is the wrong shape here.** A round button pinned over
the corner is an app convention and it would sit on top of the hero, the
showcase device frames and the journey cards, which are the three things the
page exists to show. Better: the header is already fixed, already has the logo
and the toggle, and already has empty space between them. A small **"Send a
message" in the header**, appearing once you have scrolled past the hero, gives
a permanent route to contact without covering anything. Say the word if you
want the floating version instead.

**5 — adding the nav links does not break the home design.** The logo and nav
are hidden on home until the hero hands the masthead over — that is the
`:has(.hero)` rule fixed earlier today. Inner pages already show them. So the
links can be added safely; `aria-current` marks the page you are on.

---

## Done earlier today

### The journey (horizontal career run)
- [x] Rail pinned to the stage, progress bar + numbered ticks
- [x] All six stops reach the centre — lead-in/run-out padding
- [x] Degree opens as stop 01, plain text, no panel
- [x] Cards natural height, two-column contributions
- [x] Card body scrolls, not the card — no content ever cut
- [x] Verified: Lighthouse 100 accessibility on all four routes

### The lanyard ID badge
- [x] Verlet-chain physics, hand-written (react-three-fiber refused: ~600kB
      against a 120kB budget)
- [x] Draggable, throwable, settles naturally
- [x] SVG webbing with printed wordmark, swivel clip
- [x] Solver waits for the splash and pauses off-screen

### Site behaviour
- [x] Refresh returns to the top (`scrollRestoration = 'manual'`)
- [x] Theme swap crossfaded via the View Transition API
- [x] `--faint` contrast fixed — 3.27:1 → 4.68:1
- [x] Logo and nav visible on `/work`, `/about`, `/contact` (they were
      invisible on every inner page — no way out except browser Back)

### The backend — `portfolio-api`
- [x] Laravel 12 + Inertia 2 + React 19 + TypeScript, Herd, PHP 8.4
- [x] Laravel Boost installed (MCP + 6 skills + guidelines)
- [x] Schema: projects, project_images, messages + NDA check constraint
- [x] `GET /api/v1/content` behind a scoped Sanctum token
- [x] Repository + Service layers, form requests, API resources
- [x] PIN login (010121), throttled 5/min, hashed, in `.env` only
- [x] Admin: dashboard, project CRUD, reorder, screenshots, message inbox
- [x] Deploy hook, debounced 60s
- [x] Message retention command, scheduled daily
- [x] 59 tests passing, Pint clean

### The connection
- [x] `npm run build` pulls from the API, falls back to a committed snapshot
- [x] Proven end to end: admin edit → API → build → live page
- [x] Contact form has two delivery paths (email + inbox), fails only if both do
- [x] Contact page: one screen, Back control, loading state, route veil

---

## Open, not started

- [ ] Push `portfolio-api` to GitHub (local commits, no remote yet)
- [ ] Deploy the site to Vercel and set `VERCEL_DEPLOY_HOOK_URL`
- [ ] `RESEND_API_KEY` + `CONTACT_TO_EMAIL` — needed for actual email;
      messages reach the admin inbox without them
- [ ] Content placeholders: `[METRIC]` ×6, `[what it improved]` ×6,
      `[problem statement]` ×5, `[what I learned here]` ×5, `[X] days weekly`,
      `[linkedin-url]` — see `CONTENT-TODO.md`
- [ ] `docs/resume.pdf` — blocked: contains date of birth and civil status

---

## Watch out for (cost me time today)

1. **Your dev server on :3000 shares `.next`** with production builds and wipes
   them. Verify against `localhost:3000`, do not build a second copy.
2. **Never pipe `next build` through `head`** — SIGPIPE kills the build and the
   log still says "Compiled successfully".
3. **`.env.example` is committed, `.env` is not.** A real token in the example
   file goes public. One was found and revoked today.
