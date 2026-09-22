# START HERE — Chrys Portfolio

You are building a personal portfolio site for **Chrys**, a senior full-stack
developer in Dubai, UAE. This folder is the complete specification. Read it
before writing code.

## Read in this order

| #   | File                        | What it settles                                                                |
| --- | --------------------------- | ------------------------------------------------------------------------------ |
| 1   | `01-PRD.md`                 | Who it's for, what it must do, what success means                              |
| 2   | `02-TRD.md`                 | Stack, constraints, performance and accessibility budgets                      |
| 3   | `03-APPFLOW.md`             | Every route, every state, how a visitor moves through                          |
| 4   | `04-UIUX-BRIEF.md`          | Design tokens, type, the hero scroll mechanic                                  |
| 5   | `05-DATA-SCHEMA.md`         | Content model, TypeScript types, contact submissions                           |
| 6   | `06-IMPLEMENTATION-PLAN.md` | Phased build order with acceptance criteria                                    |
| 7   | `07-SOURCE-CONTENT.md`      | **Every real fact.** The only source for names, dates, skills and projects     |
| 8   | `08-BACKEND.md`             | Laravel API and admin. **Phase 8 only — do not build before the site is live** |

## Rules of engagement

1. **Every fact comes from `07-SOURCE-CONTENT.md`.** Do not invent, embellish
   or infer anything not in it. Where that document shows a bracketed
   placeholder (`[METRIC]`, `[what it improved]`, `[X] days weekly`), output
   it exactly as written — those gaps are the pre-launch checklist. Never
   replace a placeholder with a plausible-sounding value.
2. **Never publish date of birth or civil status.** They appear on the source
   CV by Gulf convention and must not reach the website, its metadata, its
   JSON-LD, or the résumé served from it. See `07-SOURCE-CONTENT.md` §1.
3. **Do not redesign.** `04-UIUX-BRIEF.md` is settled. If something in it seems
   wrong, build it as written and raise the concern separately.
4. **Build in the phase order** of `06-IMPLEMENTATION-PLAN.md`. Finish a phase
   and meet its acceptance criteria before starting the next. Do not scaffold
   everything at once.
5. **NDA is a hard constraint.** Several projects cannot name their client or
   show screenshots. Every component that displays a project must render
   correctly with `client: null` and `images: []`. See `05-DATA-SCHEMA.md`,
   and `07-SOURCE-CONTENT.md` §5.8 for which projects are affected.
6. **Ask before adding dependencies** beyond those listed in `02-TRD.md`.
7. **State assumptions** in your response, not in code comments that will rot.

## The spec has been amended

`01-PRD.md`, `02-TRD.md`, `03-APPFLOW.md` and `04-UIUX-BRIEF.md` were updated
after the build to match what was actually shipped, with Chrys's authorisation.
`04-UIUX-BRIEF.md` §8b is the list of design decisions that differ from the
original direction and why. Rule 3 below still stands for everything else.

Two documents record open work rather than settled decisions:
`CONTENT-TODO.md` (every placeholder still in the built output, and the résumé
PDF that must not be published as-is) and `SKILLS-USED.md`.

## One-line summary

A quiet, typographic, editorial portfolio whose single memorable moment is the
hero: the name CHRYS set as a full-width masthead that contracts into the site's
own logo as the visitor scrolls, revealing the intro beneath it.
