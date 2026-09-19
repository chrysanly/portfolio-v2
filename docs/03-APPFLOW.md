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
