# 01 — Product Requirements Document

## 1. Problem

Chrys is a senior full-stack developer in Dubai with substantial production
experience, but no public evidence of it. Most of his strongest work is under
NDA and cannot be shown. Prospective clients — small and mid-sized Dubai
companies, plus recruitment and HR firms — have no way to assess him before a
conversation, so every lead starts from zero credibility.

## 2. Goal

A portfolio that establishes senior credibility in under thirty seconds, works
entirely within NDA limits, and produces a qualified enquiry.

## 3. Audience

**Primary — hiring decision-maker at a Dubai company.** Non-technical or
semi-technical. Founder, ops director, or HR lead. Scans, does not read. Needs
to answer: has this person solved a problem like mine, and can I trust him with
it? Arrives from LinkedIn or a referral, usually on mobile.

**Secondary — technical interviewer or lead developer.** Reads the stack, wants
evidence of architectural judgement rather than a list of frameworks.

**Tertiary — recruiter.** Skims for role title, years, stack keywords, location
and availability. Needs those visible without scrolling far.

## 4. Non-goals

- Not a blog. No CMS, no comments, no article pipeline.
- Not a client portal. No authentication, no dashboards.
- Not a proof of animation skill. One deliberate motion moment, nothing else.
- Not a case-study archive. Three to six projects maximum, ever.
- No e-commerce, no booking, no pricing page.

## 5. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Hero states name, role, discipline and location above the fold | Must |
| F2 | Scroll-driven hero sequence resolving the name into the intro | Must |
| F3 | Work index listing projects with scope and outcome | Must |
| F4 | Project cards render correctly with no client name and no images | Must |
| F5 | Project detail pages: problem, approach, stack, outcome | Must |
| F6 | About page: background, how he works, current role | Must |
| F7 | Contact path reachable from every screen | Must |
| F8 | Contact form with validation and success/error states | Must |
| F9 | Projects added by editing a content file, no code changes | Must |
| F10 | Filter the work index by project type, as static routes | Should |
| F11 | Résumé download | Should |
| F12 | Dark theme | **Shipped** — light and dark with a header toggle |
| F14 | Experience timeline on the home route | **Shipped** |
| F15 | Technology marquee on the home route | **Shipped** |
| F16 | Opening splash hold, 1s | **Shipped** — costs the §8.4 performance target, see `02-TRD.md` §4 |
| F13 | Arabic localisation | Won't (this version) |

## 6. Content requirements

Every project entry carries an **outcome**, not a feature list. "Cut invoice
processing from four hours to twenty minutes" earns trust; "built with Laravel
and MySQL" does not. Where the real figure is unknown, the build ships the
`[METRIC]` placeholder so the gap is visible and must be filled before launch.

NDA-covered work is described by sector and scope, never by client name:
"Confidential — vehicle testing sector".

## 7. Content source

All factual content — name, title, experience, contact details, skills,
employment history and the six project entries — is specified in
`07-SOURCE-CONTENT.md`, transcribed from Chrys's CV. That document supersedes
any content sketched elsewhere in this spec set.

Confirmed: 5+ years experience, Senior Full-Stack Developer at Almutakamela
Vehicle Testing and Registration in Dubai since Nov 2025, BS Information
Technology (2020), six candidate projects of which four are featured.

**Still unknown and shipping as placeholders:** outcome metrics for every
project, availability, LinkedIn URL, screenshots. See `07-SOURCE-CONTENT.md`
§6.

**Never published:** date of birth, civil status.

## 8. Success criteria

1. A visitor who scrolls only the hero can state Chrys's role, discipline and
   city.
2. Every project reads as complete with no client name and no screenshots.
3. Adding a fourth project touches one content file and nothing else.
4. Lighthouse: Performance ≥ 95, Accessibility 100, Best Practices ≥ 95,
   SEO 100 on mobile.
5. Contact reachable in one tap from any screen on a 390px viewport.

## 9. Constraints

- Built and maintained at roughly two days per week.
- Deployed on Vercel free tier or equivalent; no recurring infrastructure cost.
- Maintained by one developer. Any pattern that needs explaining twice is wrong.
