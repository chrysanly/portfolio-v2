# 03 — App Flow

## 1. Route map

```
/                    Home — hero sequence, work index, experience, stack, contact band
/work                All projects
/work/type/[type]    Filtered index, one static page per type
/work/[slug]         Project detail
/about               Background, working style, current role
/contact             Form plus direct email
/resume.pdf          Static asset
404                  Not found
```

## 2. Primary journey

```
LinkedIn / referral
        │
        ▼
    /  Home ──── hero sequence resolves ────► work index visible
        │                                          │
        │                                          ▼
        │                                  /work/[slug]  detail
        │                                          │
        ▼                                          ▼
   /contact  ◄───────── contact band ──────────────┘
        │
        ▼
  submit → success state → email delivered
```

The visitor is never more than one tap from contact: the masthead's contact
link persists after the hero resolves, and a contact band closes every page.

## 3. Home route states

| State | Trigger | What renders |
|-------|---------|--------------|
| `initial` | Load, scroll 0 | Masthead at full width, location line, scroll cue |
| `transition` | Scroll 0 → 1 of the pinned section | Masthead contracting, intro lines revealing |
| `resolved` | Pinned section complete | Masthead as compact logo in a sticky header, work index below |
| `reduced` | `prefers-reduced-motion` | `resolved` immediately, no pin, no scroll dependency |
| `no-js` | JavaScript unavailable | `resolved` markup, static |

### The identity badge

A lanyard hangs in the hero's right-hand column with Chrys's card on it. Chrys
asked for the behaviour of `reactbits.dev/components/lanyard`. That component is
a rope of Rapier rigid bodies rendered through react-three-fiber, and its stack
— three, @react-three/fiber, @react-three/drei, @react-three/rapier, meshline —
is roughly 600kB of JavaScript against the 120kB first-load budget in
`01-PRD.md` §8. `02-TRD.md` §1 does not allow it, so the physics is written by
hand in `components/hero/IdCard.tsx` instead. It costs 2kB.

It is the same simulation, in two dimensions:

- A Verlet chain of seventeen points with gravity and one distance constraint
  per segment, relaxed twelve times a frame. The cord bends and goes slack; it
  is not a strap being rotated.
- The card is two more points in the same chain — the slot it hangs by and its
  bottom edge — so it swings on the cord rather than being pinned to it, and
  its rotation is an output of the physics rather than something authored.
- A weak upright constraint stands in for clip friction. Without it the card is
  two points falling at the same rate, no torque restores it, and it settles at
  whatever angle it stopped at.
- Grab it anywhere and it follows the point you grabbed; let go and the
  velocity is already in the integrator.
- The idle sway is applied to the **anchor**, so the cord carries the movement
  down as a real one would.

The webbing is an SVG ribbon built by offsetting the cord along its normal,
with the wordmark set on a `<textPath>` so the print bends with the strap. The
at-rest geometry is written into the markup, so the cord is drawn correctly
before the solver's first frame. The solver does not start until the splash has
cleared and does not run while the hero is off screen.

### The contact page

One screen, no scrolling: the heading and the direct details on the left, the
form on the right. They are a pair — a page whose entire job is "get in touch"
should not need scrolling to show both ways of doing it. Below 1280px they
stack, with the form above the address, because the form is what the visitor
came to use.

A **Back** control sits above the heading. It uses history when the previous
entry is one of ours — checked by referrer origin, because `history.length > 1`
is true for any tab that has been anywhere — and otherwise falls back to a plain
link to `/`, which is also what it is before hydration and with JavaScript off.

**Two delivery paths.** The form emails through Resend *and* posts a copy to the
Laravel inbox, and it only reports failure when both fail. It used to be
email-only, so a missing `RESEND_API_KEY` lost the message and told the sender
it had failed. See `08-BACKEND.md` §5.

### Feedback on every click

`RouteVeil` covers the gap between a click and the next paint. Chrys's words:
"it looks like nothing happened when I click something." It borrows the opening
splash's language so a navigation reads as the same site, and it is capped three
ways — path change, explicit done event, and a hard 1400ms ceiling. A veil that
could strand someone behind it would be worse than no veil.

It listens for link clicks on the document in the capture phase, so it still
sees a click that a component then calls `preventDefault` on, and it is told
explicitly about the two transitions that are not link clicks: the Back
control's `router.back()`, and the contact form's submit.

### Refresh returns to the top

`history.scrollRestoration` is set to `'manual'` in the head script, and the
splash clears with a `scrollTo(0, 0)` unless the URL carries a fragment. A
reload half way down a pinned hero otherwise drops the visitor into the middle
of a scroll sequence with no context.

### Changing theme

The toggle runs the swap inside a view transition. Changing the palette
rewrites eight custom properties on `:root`, which invalidates style for the
whole document — every rule, both grain layers, the atmosphere and the masthead
repaint in one frame, and on this page that is long enough to see. A view
transition hands it to the compositor: the browser snapshots the old frame,
applies the change while nothing is on screen, and crossfades two bitmaps.
Where the API is missing the swap is instant, which is the right fallback.

### Home section order

1. Hero sequence (pinned, ~180vh)
2. Selected work — a pinned showcase stepping through the four featured
   projects one at a time, each with device frames when screenshots exist.
   The plain list is what renders with JavaScript off or reduced motion set.
3. The journey — the run from the 2020 degree to the current post, read
   oldest-first and walked **sideways**: vertical scroll drives horizontal
   travel across a pinned strip, one card per stop. Each card carries the phase
   of the arc, the real job title, the technologies used there, the projects
   built in it with a per-project NDA marker, the sourced "what I built"
   bullets and a `[what I learned here]` placeholder. With JavaScript off or
   reduced motion the same cards stack vertically — one component, one set of
   markup, gated on `[data-motion]`

   Stop 01 is the degree, and it is set as plain text: no border, no panel, no
   chapter numeral, just the qualification, the school and the year in the
   display face. It is where the story starts, not a job, and it should not
   look like one.

   Under the strip a rail stays pinned to the stage — a progress bar plus one
   numbered tick per stop, the current one carrying the accent. Inactive ticks
   are quietened with colour rather than opacity; dimming a 9px caption to 40%
   measured 1.7:1.

   The strip carries half a card of lead-in and run-out so the first and last
   stops each reach the middle of the screen. Without it the degree and the
   current post sat at the edges and never became the card being read.

   Each card is its own height, and its body — not the card — is the scroll
   container, capped to the stage. On a 900px-tall screen nothing scrolls; on a
   short laptop the longest stops scroll rather than silently cutting the last
   contributions off the bottom.
4. Stack — the technology marquee
5. Contact band

Sections 3 and 4 were added after the first build. The reasoning is §3 of the
PRD: a recruiter skims for role title, years, stack keywords and location, and
needs them without scrolling far. The work index alone gave a technical reader
a title and a sentence to judge, which is not enough.

The work index is pulled up over the hero's emptied stage and revealed as the
sequence resolves — without that there is a full screen of nothing between the
masthead docking and Selected Work. This is the one scroll-triggered reveal on
the site and it exists to hide an overlap, not to decorate an entrance.

Detailed timing is in `04-UIUX-BRIEF.md` §5.

## 4. Work index states

- **Default:** all projects, newest first.
- **Filtered:** one type active as a **static route segment**, `/work/type/erp`,
  generated at build with `generateStaticParams`. Not a query string: `?type=`
  forces the route dynamic, which costs the static guarantee. Not client-side
  `useSearchParams` either, which breaks without JavaScript. Segments give all
  three — static, shareable, and working with JS off.
- **Empty filter result:** "No projects in this category yet." plus a link
  clearing the filter. Must not render an empty page.
- **Row hover/focus:** the row's background shifts to the surface tone and the
  outcome figure takes the accent colour. Focus produces the same treatment as
  hover.

## 5. Project detail structure

Fixed order, every project:

1. Title, client line (or sector line when confidential), year, role
2. Outcome figure, stated large
3. Problem — what was broken before
4. Approach — decisions made and why
5. Stack — labelled list
6. Evidence — screenshots when permitted; **omitted entirely** when not, never
   replaced by a placeholder graphic
7. Next / previous project

## 6. Contact form states

| State | Behaviour |
|-------|-----------|
| `idle` | Empty fields, submit enabled |
| `invalid` | Inline errors under each field on blur and on submit; focus moves to the first invalid field |
| `submitting` | Submit disabled, label reads "Sending" |
| `success` | Form replaced by confirmation naming what happens next and the expected reply window |
| `error` | Form values preserved, message explains the failure and offers the direct email address as a fallback |

Fields: name (required, 2–80), email (required, valid), company (optional),
message (required, 20–2000), plus a hidden honeypot. The message minimum
exists to filter one-line spam.

## 7. Navigation rules

- Header appears only after the hero resolves on the home route; it is present
  from the top on every other route.
- **The home header is the wordmark and the theme toggle only.** Home is a
  single narrative that carries its own links — the work index, "All work", and
  the contact band closing the page — so a nav bar there is furniture. Every
  other route keeps the nav: without it there is no way back, and F7 requires
  the contact path to be reachable from every screen.
- Current route is marked with `aria-current="page"`.
- The logo returns to home from every route except home, where it scrolls to
  the top.
- Back from a project detail returns to the work index with the filter intact.

## 8. Error and edge cases

- 404: the masthead, a line explaining the page doesn't exist, links to work
  and home. Same visual language as the site.
- Contact endpoint unreachable: `error` state, direct email offered.
- Long project title: wraps to two lines, never truncates with an ellipsis.
- No projects at all: the work index shows a short holding line. The build must
  not crash on an empty content directory.
