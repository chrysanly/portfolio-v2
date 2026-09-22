# Kickoff Prompt

Copy everything inside the code block below into Claude Code, Cursor, or
whichever agent you're building with. Run it from the repo root, with `docs/`
in place and `MastheadHero.tsx` at `components/hero/MastheadHero.tsx`.

```
This repo has a complete specification in ./docs and one pre-written component.

FIRST: read ./docs/00-START-HERE.md, then all eight numbered documents in
order. 07-SOURCE-CONTENT.md is transcribed from my CV and is the only source
of factual content — read it carefully. Do not write code until you have read
them all.

BUILD ONLY PHASE 1 from docs/06-IMPLEMENTATION-PLAN.md. Stop when its
acceptance criteria are met, summarise what you built, and wait for me before
starting Phase 2. Same for every phase after.

THE HERO IS ALREADY DESIGNED AND WRITTEN.
components/hero/MastheadHero.tsx is the approved implementation of the scroll
sequence specified in docs/04-UIUX-BRIEF.md §5. When you reach Phase 4, wire it
up as-is. Do not rewrite it, do not substitute a different animation approach,
and do not "improve" the easing. It needs exactly two changes:

  1. Smooth the scroll progress. Wrap scrollYProgress in useSpring
     (stiffness ~90, damping ~24, restDelta 0.001) and drive the paint
     function from the spring value, not the raw progress. Motion should
     trail the scroll slightly, not track it frame-for-frame.
  2. Add the CSS from the published template for .masthead, .intro,
     .hero__eyebrow, .hero__foot and .progress into the Tailwind layer,
     using the tokens from docs/04-UIUX-BRIEF.md §2. Do not hardcode hexes.

FOUR RULES THAT OVERRIDE ANY INSTINCT TO BE HELPFUL:

  1. Every fact comes from docs/07-SOURCE-CONTENT.md. Do not invent,
     embellish or infer anything that isn't in it — not a project, not a
     skill, not a date, not a number. Where that document shows a bracketed
     placeholder ([METRIC], [what it improved], [X] days weekly,
     [linkedin-url]), output it exactly as written. Those gaps are my
     pre-launch checklist. Do not replace [METRIC] with a plausible figure.

  2. Never publish my date of birth or civil status. They are on my CV
     because of Gulf convention. They must not appear in any page, any
     metadata, any JSON-LD, or the résumé served from the site. My phone
     number goes on /contact only — not in the footer, not in structured data.

  3. Do not redesign. docs/04-UIUX-BRIEF.md is settled, including the
     zero border-radius, the two-typeface limit and the copy rules in §7.
     If something looks wrong to you, build it as written and raise it
     separately in your summary.

  4. Do not add dependencies beyond docs/02-TRD.md §1 without asking first.
     No component library, no icon package, no extra animation library.

NDA DEFAULTS: all four client projects are confidential: true with client:
null. Do not change that for any project unless I tell you to, project by
project. See docs/07-SOURCE-CONTENT.md §5.8.

BACKEND: docs/08-BACKEND.md is Phase 8 and is POST-LAUNCH. Do not scaffold
Laravel, do not create a database, and do not wire the site to an API during
Phases 1-7. Content comes from local MDX until the site is live. If you think
a phase needs the backend early, it doesn't - say so and continue.

QUALITY FLOOR, enforced every phase, not bolted on at the end:
  - The resolved layout renders in HTML. Motion enhances it. The site must be
    complete and usable with JavaScript disabled.
  - prefers-reduced-motion: reduce renders the resolved state with no pin and
    no scroll listener. This is a required code path.
  - Accessibility 100 in Lighthouse. Semantic elements only, never onClick on
    a div, visible focus rings on everything interactive.
  - A project with client: null and images: [] must render as a complete,
    intentional row. No placeholder boxes, no "image coming soon".
  - The build fails if any MDX project violates the Zod schema. Prove this
    works in Phase 2 before moving on.

Start with Phase 1. Tell me your plan before you write files.
```

## Continuing between phases

When a phase finishes, don't paste the whole prompt again. Use:

```
Phase N acceptance criteria are met. Proceed to Phase N+1 from
docs/06-IMPLEMENTATION-PLAN.md. The three rules and the quality floor from the
kickoff still apply.
```

## If the agent drifts

Common failures and the correction for each:

| What it does                                            | What to say                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Fills in a number for `[METRIC]`                        | "Rule 1. Revert that to the placeholder."                                         |
| Invents a project or a skill not in the CV              | "Rule 1. Only what's in 07-SOURCE-CONTENT.md."                                    |
| Publishes DOB, civil status, or the phone in the footer | "Rule 2. Remove it."                                                              |
| Names a client on a confidential project                | "NDA defaults. Set confidential: true, client: null."                             |
| Rounds corners, adds a card shadow                      | "Rule 3. Border radius is 0 everywhere, see 04-UIUX-BRIEF §4."                    |
| Installs shadcn, lucide, GSAP                           | "Rule 4. Remove it and use what's in 02-TRD §1."                                  |
| Rewrites the hero with its own animation                | "MastheadHero.tsx is approved. Restore it and apply only the two listed changes." |
| Builds several phases at once                           | "Stop. Finish Phase N's acceptance criteria only."                                |
| Starts scaffolding Laravel early                        | "08-BACKEND.md is Phase 8, post-launch. Remove it."                               |
| Wires the site to fetch the API at runtime              | "08-BACKEND.md §2. Build time only. The site stays static."                       |
| Installs Filament for the admin                         | "08-BACKEND.md §3. Hand-built Blade. The point is that I built it."               |
| Adds fade-in on every section                           | "04-UIUX-BRIEF §6. One motion moment on the site. Remove the rest."               |

## Before launch

`docs/06-IMPLEMENTATION-PLAN.md` ends with five launch blockers. All five are
about content you have to supply — outcome metrics, years, contact details,
real problem statements, screenshots. No agent can fill those in honestly.
