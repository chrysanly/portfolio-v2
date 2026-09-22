# 04 — UI/UX Design Brief

This document is settled. Build it as written.

## 1. Direction

**Ledger.** An editorial, typographic site with the structure of a printed
index rather than a landing page. There is no hero image, no card grid, no
gradient. The name is the graphic. Everything else is quiet.

Spend all boldness on the masthead. Nothing else on the page competes with it.

## 2. Colour tokens

```css
--ink: #1a1a18; /* primary text, rules */
--ground: #eceae4; /* page background, oyster */
--surface: #f5f3ee; /* raised rows, cards, form fields */
--muted: #55524b; /* secondary text — 7.1:1 on ground */
--faint: #83807a; /* metadata only, never body — 4.6:1 on ground */
--rule: #cfccc3; /* hairlines */
--accent: #7b2d2d; /* oxblood — outcome figures, links, focus */
```

Accent is used for outcome figures, link hover, focus rings and the NDA
marker. Nowhere else. If more than roughly 5% of a screen is oxblood, it is
overused.

Verify `--faint` at its final size before shipping: it is only permitted at
12px and above where it clears 4.5:1.

## 3. Typography

| Role            | Face            | Setting                                               |
| --------------- | --------------- | ----------------------------------------------------- |
| Masthead        | Bodoni Moda 400 | 96–210px fluid, `line-height: 0.86`, letter-spacing 0 |
| Project titles  | Bodoni Moda 600 | 26–30px, `line-height: 1.15`                          |
| Outcome figures | Bodoni Moda 600 | 30px, accent coloured                                 |
| Body            | Public Sans 400 | 15–17px, `line-height: 1.6`                           |
| Metadata        | Public Sans 500 | 11–13px, letter-spacing 0.12em                        |

Scale: 11 / 13 / 15 / 17 / 22 / 26 / 30 / 44 / 96+.
Body line length capped at 68 characters.

Two faces total. Do not introduce a third, and do not use a monospace face for
data labels — that is a template tell.

## 4. Layout

- Left-aligned throughout. Nothing centred except the masthead's edge-to-edge
  distribution.
- 12-column grid, 24px gutters, 64px page margin on desktop, 20px on mobile.
- Border radius: **0** everywhere. This is a deliberate part of the direction.
- No drop shadows. Depth comes from the surface tone and hairline rules.
- Section rhythm: 1px `--rule` hairlines between rows; a 3px `--ink` rule under
  the masthead only.

### Masthead construction

The five letters of CHRYS are individual spans in a flex row with
`justify-content: space-between`, so the name spans the full content width at
any viewport. Do not fake this with `letter-spacing` — it leaves a trailing
space on the right edge.

### Work index row

```
┌────┬──────────────────┬───────────────┬──────────────────┬──────────┐
│ 01 │ Project title    │ Client /      │ Scope, one or    │ [METRIC] │
│    │ (Bodoni 27px)    │ sector        │ two lines        │ label    │
└────┴──────────────────┴───────────────┴──────────────────┴──────────┘
  44px      300px            240px            fluid            132px
```

Numbering is permitted here because the index is an ordered list of work, not
decoration. Below 768px the row stacks: title, then client, then scope, then
the outcome figure aligned left.

## 5. The hero scroll sequence

The one motion moment on the site. A pinned section roughly 200vh tall; scroll
progress within it drives `p` from 0 to 1.

**Stage A — `p = 0`**
Masthead at full width, roughly 210px on desktop. Location line above it.
"Scroll to begin" and a short vertical rule at the bottom. Nothing else.

**Stage B — `p = 0.15 → 0.7`**

- Masthead scales to roughly 132px and moves from centre to upper-left; the
  letters close from edge-to-edge distribution to normal spacing.
- Three intro lines reveal sequentially, each as a mask-wipe upward, not a
  fade: "Senior full-stack developer" at `p ≈ 0.25`, "building ERP and
  automation systems" at `p ≈ 0.40`, "for companies in Dubai." at `p ≈ 0.55`.
- A line that has not revealed yet sits at `--rule` colour; it darkens to
  `--ink` as it arrives. All three occupy their final positions from the
  start so nothing reflows.
- A thin progress rule tracks `p` at the bottom.

**Stage C — `p = 0.7 → 1`**

- Masthead settles to 28px inside a sticky header that gains a 2px `--ink`
  bottom rule.
- The metadata row (discipline, stack, experience and availability) fades in
  beneath it.
- Pin releases; the work index scrolls normally.

### Non-negotiable implementation rules

1. Animate `transform` and `opacity` only. No `width`, `top`, `left` or
   `font-size` transitions — they force layout on every frame.
2. Achieve the size change with `scale`, with `transform-origin` set so the
   masthead converges on its final header position.
3. The final resolved layout is what renders in HTML. Motion is applied on top.
   With JS disabled or reduced motion set, the page is already correct.
4. `prefers-reduced-motion: reduce` → no pin, no scroll listener, stage C
   markup at natural document flow.
5. Scroll progress via Framer Motion's `useScroll` with `offset`. No manual
   scroll event listeners, no `scroll-behavior` hacks.
6. Mobile: the sequence compresses to roughly 150vh and the masthead's
   final size is 22px. It must not feel like a wall between the visitor and
   the content — if it takes more than two thumb swipes, shorten it.

## 6. Interaction

Everything other than the hero is instant or near-instant. Hover and focus
transitions are 120ms. No entrance animations on sections, no parallax, no
scroll-triggered fades anywhere else on the site. That restraint is what makes
the hero read as intentional.

Focus ring: 2px `--accent`, 2px offset, on every interactive element.

## 7. Copy rules

- Sentence case everywhere except the masthead and metadata labels.
- No all-caps eyebrow labels above headings. Metadata may be letterspaced
  small caps; headings may not have labels stacked above them.
- Do not join metadata with middle dots (`A · B · C`). Use a comma or a
  table cell.
- Buttons name their action: "Send message", not "Submit" or "Send message →".
  No arrow glyphs appended to link text.
- Do not accent a single word inside a headline in a different colour.

## 8. Responsive

| Breakpoint | Behaviour                                                           |
| ---------- | ------------------------------------------------------------------- |
| ≥ 1280px   | Full grid, masthead 210px → 28px                                    |
| 768–1279px | Margins to 40px, masthead 150px → 26px                              |
| < 768px    | Single column, margins 20px, index rows stack, masthead 84px → 22px |

## 8b. Changes made during the build

This document was settled before the first build. These are the points where
the built site now differs, each with its reason. They are decisions Chrys
approved, not drift.

| Item                   | Spec said                  | Built                                                                    | Why                                                                                                                      |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Hero track             | ~200vh                     | **180vh**                                                                | §5.6 warns the sequence must not be a wall; the shorter track ends into Selected Work instead of dead scroll             |
| Masthead in stages A–B | moves centre to upper-left | stays **horizontally centred**, docks left only in stage C               | Chrys's direction                                                                                                        |
| Outcome figure         | accent (§2)                | **ink at rest, accent on hover**                                         | `03-APPFLOW.md` §4 already specified accent on hover; four accent figures down the index broke the ~5% oxblood cap in §2 |
| Ground                 | flat colour                | flat colour **plus a two-layer inline grain**, the coarse layer drifting | Chrys's direction; no gradient, no image dependency                                                                      |
| Cursor                 | not specified              | a spot that inverts by `mix-blend-mode: difference`                      | Chrys's direction; one treatment legible on both themes                                                                  |
| Border radius          | 0 everywhere               | 0 everywhere **except** the cursor spot and the identity badge           | A round cursor is an affordance, not visual language; the badge depicts a physical object                                |
| Shadows                | none                       | none **except** the identity badge                                       | Same reason                                                                                                              |
| Theme                  | light only                 | **light and dark, with a toggle**                                        | `01-PRD.md` F12, brought forward from the post-launch backlog                                                            |
| Opening                | none                       | **A load-gated splash**                                                  | Chrys's direction. Clears when fonts and document are ready, 420ms floor, 2.6s ceiling — see `02-TRD.md` §4              |
| Home header            | logo, nav, contact         | **Logo and theme toggle only**                                           | Chrys's direction; home carries its own links. Other routes keep the nav                                                 |
| Experience             | not specified              | **A horizontal journey**, vertical scroll driving sideways travel        | Chrys's direction; a career is a path, and an axis says that better than a stack of rows                                 |

### Dark palette

Measured against its own ground: ink 15.5:1, muted 7.5:1, faint 5.2:1,
accent 5.4:1. The accent is oxblood lifted toward terracotta because `#7B2D2D`
sits at 1.5:1 on a dark ground and fails as a link colour.

**The light `--faint` in §2 is annotated 4.6:1 but measures 3.27:1 on
`--ground`.** It is the only WCAG failure left on the site and the only reason
light mode scores 95 rather than 100 for accessibility. `--muted`'s 7.1:1 is
also its ratio against `--surface`, not `--ground` (6.48:1). Both figures look
to have been taken against the wrong background. Unresolved — see
`CONTENT-TODO.md`.

## 9. Honest note for the build

This direction sits close to a recognisable "editorial AI portfolio" look —
broadsheet rules, zero radius, high-contrast serif. What keeps it from landing
there is discipline: the copy rules in §7, the restraint in §6, and real
screenshots and real outcome numbers in the content. If those are skipped, the
design will read as generic no matter how well the CSS is written.
