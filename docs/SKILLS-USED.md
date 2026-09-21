# Skills used on this project

A running record of which agent skills are installed and which were actually
invoked, for what, and what they contributed. Updated whenever a skill is added
or used.

Skills live in `~/.claude/skills/` — they are global to the machine, not part of
this repository, so nothing here is installed by cloning the project.

---

## Installed sources

| Source | Skills | Installed |
|--------|--------|-----------|
| Bundled with Claude Code | `frontend-design` (later replaced, see below) | pre-existing |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `ui-ux-pro-max`, `design`, `design-system`, `ui-styling`, `brand`, `banner-design`, `slides` | 2026-09-19 |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `animate`, `animate-expo`, `animation-vocabulary`, `apple-design`, `ask-sonner`, `emil-design-eng`, `find-animation-opportunities`, `improve-animations`, `mobile-native`, `pick-ui-library`, `prototype`, `review-animations`, `write-swift` | 2026-09-19 |
| [anthropics/skills](https://github.com/anthropics/skills) `skills/frontend-design` | `frontend-design` (replaced the bundled copy) | 2026-09-19 |
| [iart-ai/web-animation-skills](https://github.com/iart-ai/web-animation-skills) | `60fps-animation`, `accessible-animation`, `ascii-animation`, `glassmorphism`, `gsap-web`, `lottie-animation`, `micro-interaction`, `page-transition-animation`, `svg-animation` | 2026-09-19 |

38 `SKILL.md` files total.

---

## Actually invoked

### `frontend-design` — hero stage B composition
**When:** designing the descriptive content for the hero sequence.

**What it changed:** its calibration section names "a broadsheet layout with
hairline rules, zero border-radius and a high-contrast serif" as one of three
looks AI design defaults to — which is precisely the direction
`04-UIUX-BRIEF.md` specifies. It also says the brief's own words win where the
brief pins a direction, so the direction stayed.

Where it did change the outcome: it warns that "a big number with a small label
plus supporting stats" is the template answer. That pushed the hero's facts away
from a stat row and toward a **statement of account** — ruled entries closing on
a total line — which is the vernacular of the ERP finance modules Chrys actually
builds, and which the direction's own name (Ledger) already implied.

### `ui-ux-pro-max` — work index rows, section transition, theme toggle
**When:** fixing the work index rows, the gap between sections, and the toggle.

**What it contributed:** honestly, little for these three. It is a search tool
over a database oriented to SaaS and app patterns. Two of three queries returned
**zero results** (`list row baseline alignment scannable` → no match;
`theme toggle sun moon` in the icons domain → no match). Its own instructions
require saying so rather than presenting a miss as a recommendation.

The one query that did hit (`table row hierarchy scanning`) confirmed two things
already being applied: keep a consistent modular type scale rather than
arbitrary sizes, and keep heading levels sequential. The actual row fix —
switching from flex to grid so columns align across rows regardless of how a
title wraps, and nudging the small cells down to meet the title's first baseline
— came from reading the rendered output, not from the database.

### `animate` — the scroll-driven work showcase
**When:** turning the work index into a pinned sequence.

**What it changed:** it front-loads two gates before any code — frequency tier
and a named purpose — and the showcase passes both (rare/first-time; purpose is
*explanation* plus *spatial consistency*). That mattered: without the gate the
temptation is to animate the rows themselves, which a visitor scans dozens of
times and which the skill would reject outright.

Concretely it set: `ease-out` for entering and exiting rather than `ease-in`;
the exit as the entrance reversed, so scrolling back does not feel like a
different animation; `scale(0.985)` rather than `scale(0)` as a start state;
transform and opacity only; and reduced-motion shipped with the animation
instead of after it. Its "never drive a child's transform from a CSS variable
on the parent" rule is why the panel's inner figure gets its own ref rather
than inheriting a var.

### `animate` — the experience journey
**When:** turning the static employment list into a scroll-revealed journey.

**What it changed:** its "cheapest tool that works" rule is the reason this is
an `IntersectionObserver` plus CSS transitions rather than another Framer
Motion scroll binding. Nothing here is scrubbed — each row reveals once and
stays — so scroll-linking it would have been more machinery for the same
result, and CSS transitions keep running while the main thread is busy.

It also set the reveal direction (rows rise, matching the showcase so the page
has one motion vocabulary), `cubic-bezier(0.23, 1, 0.32, 1)` rather than a
built-in ease, and the rule that the animation ships with its reduced-motion
path — which here meant inverting the default so rows are visible unless JS
confirms motion is wanted, rather than hidden until JS rescues them.

### `animate` + `ui-ux-pro-max` — the horizontal journey rebuild
**When:** after Chrys asked for the journey to run sideways, for the rail to
stay pinned, and for the degree to open the run as plain text.

**What it changed:** `animate`'s gate put this in the rare tier — passed once
per visit — which is what justifies a scroll-scrubbed treatment here when the
earlier vertical reveal only warranted an `IntersectionObserver`. Purpose:
spatial consistency. A career is a path, and travel along an axis says that
better than a stack of rows.

It also settled two implementation details. Transform only: the strip is
translated, never scrolled with `scrollLeft`, so nothing reflows. And the
current-stop treatment is a colour transition on a border and a rail tick, not
a keyframe, because scroll can retarget it many times a second.

`ui-ux-pro-max`'s priority-1 contrast rule is what caught the rail captions:
they were quietened to 40% opacity, which measured 1.7:1 on the light ground.
They are now quietened with colour instead. The same pass finally fixed
`--color-faint` in light mode — 3.27:1 before, 4.68:1 now — which had been the
one thing holding the light theme at Lighthouse accessibility 95. All four
pages now score 100.

**Measured, not assumed:** the card bodies became the scroll containers after a
harness showed the tallest stop overrunning its cap by 31px at 720px viewport
height and losing its last contributions. A decorative chapter numeral hanging
past the card edge was adding 40px of scrollable overflow to every stop,
putting a scrollbar on cards that fit; moving the scroller inside the card
fixed both.

### `animate` — the lanyard, and the dependency it talked me out of

**When:** Chrys sent reactbits.dev/components/lanyard and asked for that exact
behaviour on his ID badge.

**What it changed:** the skill's "cheapest tool that works" rule is what stopped
this becoming a react-three-fiber install. The reference is a 3D Rapier scene;
what the interaction actually needs is a rope that bends, a card that swings and
a drag that carries velocity, and all three are two-dimensional. Written by hand
that is 2kB against roughly 600kB for the dependency, and the home page's
first-load went 139kB → 141kB instead of blowing a 120kB budget by five times.

It also set the two details that make it read as physical rather than animated:
transform and opacity only — the strap is an SVG path whose `d` is rewritten,
never a layout change — and the idle motion applied to the anchor rather than
the card, so the cord carries it down instead of the card oscillating on its
own.

`ui-ux-pro-max`'s priority-7 rule ("motion conveys meaning, spatial continuity")
is why the drag is unclamped in direction but bounded to the stage: you can
throw it, but not behind the masthead.

### `run` — driving the admin instead of reading it
**When:** verifying the toast, confirm-dialog, PIN and nameplate work in
`portfolio-api`, 2026-09-21.

**What it changed:** its central rule — launching is not running, drive the app
to a point where a user would see something, and *look at the screenshot* —
found three defects that every static check had passed.

The PIN keypad submitted five of six characters. TypeScript, ESLint and 119
backend tests were green, because the bug was a race: the keypad calls submit
the instant the sixth character is typed, and Inertia's `useForm` had not
committed that character yet, so `post()` serialised the previous state. Only a
real browser typing at real speed produced it. The fix is `transform(() => ({
pin }))`, taking the value from the argument rather than from `data`.

Switching the texture off left the cursor light on, lighting a mesh that was no
longer there. Two selectors of identical specificity, decided by source order —
invisible in the file, obvious the moment the button was clicked.

The texture button's glyph was four triangles sampled from the real mesh. It
read as a smudge at fifteen pixels. Looking at the captured button, rather than
at the SVG source, is the only way that registers.

Also worth recording: the skill says to check for a project skill first. There
is none for this repo, and the fallback pattern it points at
(`examples/playwright.md`) was the right one — a Herd-served Laravel app needs
no driver beyond `page.goto` and `ignoreHTTPSErrors`.

### Not used for the splash, the ID badge or the cursor
Those were built without a skill. `micro-interaction` and `accessible-animation`
were the plausible candidates; the work was small enough and constrained enough
by `04-UIUX-BRIEF.md` that reading the rendered output was faster than querying.
Recorded here so the absence is deliberate rather than an oversight.

---

## Not yet used

`animate`, `emil-design-eng`, `60fps-animation`, `accessible-animation`,
`micro-interaction`, `page-transition-animation`, `svg-animation` and
`apple-design` are all plausible for the next round of motion work on the hero
and the section transitions. `gsap-web`, `lottie-animation` and `glassmorphism`
are not: GSAP and Lottie are dependencies `02-TRD.md` §1 rules out, and
glassmorphism contradicts the flat, shadowless direction in `04-UIUX-BRIEF.md`
§4.

`animate-expo`, `write-swift`, `mobile-native`, `ask-sonner`, `pick-ui-library`,
`slides`, `banner-design` and `brand` are for other kinds of project.

---

## How to keep this current

Add a row to **Installed sources** when a skill is installed, and a short
section under **Actually invoked** the first time one is used on this project —
naming what it actually changed, including when the answer is "nothing useful".
A skill that produced no verified match is worth recording precisely so the next
session does not spend time on it again.
