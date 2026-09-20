# Progress — session of 20 Sep 2026

Live checklist. `[x]` done and verified, `[~]` in progress, `[ ]` not started.
Pick up at the first `[~]` or `[ ]`.

---

## Back links, and the pager's remaining ghost + a chain of timing bugs behind it

Chrys reported the same hole in the Hero→Details handoff again (a screenshot:
ledger facts washed out, pager already reading a later stop) and asked for
Back buttons on `/work` and `/about`, plus for the showcase's Next/Previous to
step through every project instead of jumping straight past them.

- [x] **Back buttons on `/work` and `/about`** — the existing `BackLink`
      component (already used on `/contact`), dropped in above each page's
      `<h1>`. `app/work/page.tsx`, `app/about/page.tsx`.
- [x] **Longer hold before the ledger clears.** `CLEAR_FROM`/`HANDOVER_FROM`
      were 0.78 — a bare 4% (~26px) after the last ledger row finishes
      revealing, which read as "look at everything, it's already leaving."
      Pushed to 0.83, and `CLEAR_TO`/`HANDOVER_TO`/`WORK_IN_FROM` to 0.9, so
      there's a real pause (~58px) at full reveal before anything starts
      fading. `components/hero/MastheadHero.tsx`.
- [x] **The actual cause of the recurring ghost/mislabel**: `data-hero-stage`
      only had two values (`'hero' | 'details'`), and the pager fell back to
      `data-hero-handoff` — a different, *earlier* threshold tuned for the
      header's own crossfade — to know when the hero was done with the
      screen. Between the two thresholds, the pager already read "Selected
      work" while the ledger was still up to ~65% opaque. Added a third
      `'done'` value to `data-hero-stage`, set exactly at `CLEAR_TO` (when
      the ledger has actually finished fading), and pointed the pager at it
      instead. `components/hero/MastheadHero.tsx`,
      `components/ui/SectionPager.tsx`.
- [x] **Showcase panels as their own pager stops.** "Next" from Details used
      to jump straight to Journey, skipping every project but whichever one
      happened to render at the showcase's own top. `WorkShowcase` now
      exposes one pixel target per panel (`--showcase-panels-y`) and the
      active one (`data-showcase-active`/`data-showcase-panel`, kept live by
      a plain scroll listener — deliberately *not* the same spring the
      panels animate with; see below); the pager expands the single
      "Selected work" marker into one stop per project.
      `components/work/WorkShowcase.tsx`, `components/ui/SectionPager.tsx`.
- [x] **Three timing bugs found *while building and testing* the above, not
      shipped with them:**
  - The pager only recomputed on native `scroll` events, but
    `data-hero-stage`/`data-showcase-*` change on every animation frame
    while their springs settle — which keeps going after the scroll itself
    has stopped. A single abrupt jump fires one `scroll` event and no more,
    so a recompute triggered only by that event could freeze the label on a
    stale reading indefinitely. Fixed with a `MutationObserver` on those
    attributes, recomputing whenever they change regardless of scroll
    events.
  - `go()`'s fixed 700ms unmute assumed raw scrolling finishing meant the
    jump was over. It doesn't — `data-hero-stage` and `data-showcase-panel`
    are driven by springs trailing the scroll, and unmuting the instant the
    scroll itself stops (whether by a fixed delay or by `scrollend`) can
    still be well before those settle, especially over a long jump. The
    result was a visible flicker: the correct label right after the click,
    reverting to a stale one once unmuted, then correcting itself again a
    few hundred ms later as the spring finished. Fixed by polling
    `currentIndex()` itself after a jump and staying muted until it agrees
    with the destination (or a 1.5s backstop), rather than guessing at any
    fixed delay.
  - Even after both of those, "Details" → "Selected work" still stuck for
    the better part of a second on a big jump: `data-hero-stage` and
    `data-showcase-active` are driven by two *separate* springs (the hero's
    own, the showcase's own), and `currentIndex()` checked the hero's first
    unconditionally — so a lagging hero spring could override an
    already-correct, geometry-based showcase reading. Reordered to check the
    showcase first: it comes from a plain scroll listener, not a spring, so
    it's already right the instant the raw scroll position enters its
    range and never needs to wait on an unrelated spring.

Verified: a full forward scroll sweep logs all eight labels (Hero, Details,
four showcase panels, Journey, Tech stack, Contact) in the right order with
zero console errors; a Next-button walkthrough lands correctly at every stop
across repeated runs, with no flicker on any individual transition (traced
frame-by-frame). `npm run check` clean; clean `next build` → `next start`,
all routes and the CSS bundle return 200.

---

## Hero → Selected Work handoff glitch (reported via screenshot, fixed)

Chrys's screenshots showed the pager reading "02 SELECTED WORK" while the ID
card and ledger facts were still fully opaque, and a second shot with the
ledger and the showcase panel both faintly visible at once — a ghost overlap.
A red "1 Issue" dev-overlay badge was visible in both. Reproduced with a
headless Playwright instance against an isolated port (not the dev server
Chrys had open, to avoid disturbing it) and fixed all three:

- [x] **Pager mislabeling.** `#showcase` carries `margin-top: -88svh`
      (`globals.css`) to sit over the hero's own emptied stage, which puts
      its *measured* DOM top near the hero's midpoint. `SectionPager`'s
      nearest-top logic doesn't know that position is a layout trick, so it
      called "Selected work" current at ~5% of the hero's scroll — roughly
      half a viewport before the hero actually starts clearing. Fixed by
      holding the pager at "Opening" until `data-hero-handoff` is `'on'`,
      the same signal the header itself waits for before it un-hides.
      `components/ui/SectionPager.tsx`.
- [x] **Ghost overlap.** The ledger's fade-out window (scroll progress
      0.78–0.86) and the showcase's fade-in window (0.8–0.95) overlapped by
      6% of the hero's track, so both unrelated layouts rendered at partial
      opacity simultaneously. Measured a 0–50%+ simultaneous-opacity window
      before the fix; moved `WORK_IN_FROM` to start exactly at
      `HANDOVER_TO`, so the showcase never begins fading in until the ledger
      has *finished* fading out — sequential, not simultaneous. Confirmed by
      instrumenting `--work-in` and the ledger's `--fade` custom property
      across a 1px-resolution scroll sweep: worst-case overlap is now ~3%,
      down from 50%+. `components/hero/MastheadHero.tsx`.
- [x] **The "1 Issue" badge.** A genuine React hydration-mismatch warning,
      not cosmetic — the blocking script in `layout.tsx`'s `<head>` sets
      `data-motion`/`data-hero-handoff`/`data-theme` on `<html>` before
      hydration (deliberately, to avoid a flash of the wrong state), and
      React flagged that as an error on every single load. Added
      `suppressHydrationWarning` to the `<html>` element — the standard
      pattern for exactly this case. Confirmed zero console errors after.
      `app/layout.tsx`.

Re-verified once Chrys stopped his `next dev` session: clean `next build` →
`next start`, `/`, `/work`, `/about`, `/contact` and the CSS bundle all return
200. `npm run check` clean throughout.

---

## Section pager: Hero / Details split

Chrys asked for six pager stops — Hero, Details, Selected work, Journey, Tech
stack, Contact — with "Details" being the lanyard card + ledger facts. The
hero's hold-then-reveal sequence was previously one stop ("Opening"); splitting
it into two is harder than it sounds because both live inside the same pinned
box, so neither has a DOM position that means anything as a scroll offset —
the same problem the showcase's pulled-up position caused for the *previous*
fix above, just one level deeper.

- [x] **`DETAILS_START` (0.3 of the hero's scroll progress)** is the new
      boundary. `MastheadHero` exposes it two ways: `data-hero-stage`
      (`'hero' | 'details'`, written every paint, read by the pager while the
      hero hasn't handed off) and `--hero-details-y` (an absolute pixel
      scrollY, computed once in `measure()` from the track's real geometry —
      the *only* way the pager's "jump to Details" button can land somewhere
      meaningful, since `hero__body`'s own `getBoundingClientRect()` reflects
      its `position: absolute; top: 100%` offset from the masthead, not a
      scroll position). `components/hero/MastheadHero.tsx`.
- [x] **`SectionPager` reads `data-hero-stage` instead of clamping to a
      single index** while the hero hasn't handed off, and overrides
      "Details"'s measured top with `--hero-details-y` for the click-to-jump
      case. `components/ui/SectionPager.tsx`.
- [x] **Renamed the DOM markers** to match Chrys's naming: `Opening`→`Hero`
      (`MastheadHero.tsx`), `The journey`→`Journey`, `Stack`→`Tech stack`
      (`app/page.tsx`). `Selected work` and `Contact` were already right.
- [x] **Boundary bug caught and fixed during testing, not left in.** The
      first version landed the "jump to Details" click exactly on
      `DETAILS_START`, and the stage flag used `p <= DETAILS_START ? 'hero'
      : 'details'` — so arriving there still read `'hero'`, and the very
      next scroll tick flipped the label straight back to "Hero" right after
      the user had clicked past it. Fixed by landing the jump 6% further in
      (comfortably inside "Details", not balanced on the boundary) rather
      than chasing exact floating-point equality between a rounded pixel
      value and a spring-derived progress value — confirmed stable under a
      1px scroll nudge in both directions.
- Not changed: at the very bottom of the page, Tech stack (a short, 160px
  band) and Contact share the final screen, and Contact occupies more of the
  viewport there — so the pager settles on "Contact" immediately after a
  direct jump to Tech stack, same as it already did for Stack before this
  session. This is the existing "nearest to viewport-centre wins at the
  bottom" rule doing what it says on the tin, not a regression; during normal
  scrolling "Tech stack" reads correctly across its full ~1500px range.

Verified: a full forward scroll sweep across the entire page logs all six
labels in order with zero console errors, and a Next-button walkthrough
(Hero→Details→Selected work→Journey→Contact, Next disabled at Contact) lands
correctly at every stop. `npm run check` clean; production build/start clean
(see below).

---

## This batch (current work)

- [x] **1. Section next/previous navigation** — turned out to already be
      built (`components/ui/SectionPager.tsx`, wired into `app/page.tsx`,
      styles at `.pager` in `globals.css`) — landed in the last commit but
      this file was never updated to say so. Re-verified today: builds
      clean, renders on `/`, keyboard-operable, hidden under reduced motion.
- [x] **2. "Send a message" in the header** — built per the recommendation
      below (not the floating version). `SiteHeader` renders a `.header-cta`
      link in place of the nav on the minimal (home) header; it reveals on
      the same `[data-hero-handoff='on']` rule as the logo, so it appears the
      moment the header takes over from the hero. Inner pages don't need it —
      they already carry the nav's "Contact" link (item 5).
- [ ] **3. Stack + contact bands redesigned** — the two sections in your
      screenshot. **Blocked**: this session has no access to that screenshot
      or the earlier conversation describing what was wrong with them. I did
      not guess — tell me what to change (too plain, contrast, layout,
      mobile-specific?) and I'll build it next.
- [x] **4. Restore scroll position on Back** — `components/ui/ScrollMemory.tsx`,
      mounted in `app/layout.tsx`. Every scroll position is written to
      `sessionStorage` keyed by pathname; a `popstate` (Back/Forward) reads it
      back once the new route has painted, a forward `<Link>` or a refresh
      still lands at the top. `history.scrollRestoration` stays `'manual'`.
- [x] **5. Header nav on inner pages** — turned out to already be built too:
      `SiteHeader` renders the Work/About/Contact nav with `aria-current`
      whenever `minimal` isn't passed, and `/work`, `/about`, `/contact` all
      pass `current="..."`. Re-verified today via a production build.

### Verified today (build 20 Sep 2026)

`npm run check` clean. `next build` clean — one prerender failure on
`/work/[slug]/opengraph-image` on the first attempt, gone on a from-clean
rebuild, so a transient Next.js build-worker race, not a regression from
today's changes. Cleared `.next`, ran `next start` once, confirmed `/`,
`/work`, `/about`, `/contact` all return 200 and the CSS bundle returns 200
before trusting any of it — the two traps in `CLAUDE.md`. Server stopped
afterward.

`/` first load is **141 KB against the 120 KB budget in `docs/02-TRD.md`
§4** — already documented as over budget at 124 KB, so it's grown another
17 KB since that was last measured. Not moved by today's `.header-cta` link
or `ScrollMemory` (both add well under 1 KB) — this predates this session's
changes. Worth finding out what grew it before it drifts further.

Not yet checked in a real browser over CDP (no such tool available in this
session) — the header CTA's reveal timing and the Back-restore feel should
still get an eyeball pass against a real scroll.

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
