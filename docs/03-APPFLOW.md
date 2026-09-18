# 03 — App Flow

## 1. Route map

```
/                    Home — hero sequence, work index, contact band
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
