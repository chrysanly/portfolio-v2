# 07 — Source Content

**This document is the single source of truth for every fact on the site.**
It is transcribed from Chrys's CV. The agent must not invent anything that
contradicts it, and must not add facts that aren't here.

Anything still shown as `[BRACKETED]` is genuinely unknown and must ship as a
placeholder. See §6.

---

## 1. Identity

| Field              | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| Full name          | Chrysanly John Corpuz Roma                                                    |
| Display name       | Chrys                                                                         |
| Title              | Senior Full-Stack Developer                                                   |
| Location           | Dubai, UAE                                                                    |
| Experience         | 5+ years                                                                      |
| Email              | chrys.romao21@gmail.com                                                       |
| Phone              | +971 52 925 8013                                                              |
| WhatsApp           | Same number — +971 52 925 8013                                                |
| LinkedIn           | https://www.linkedin.com/in/chrysanly-john-roma-7517012a8/                    |
| Languages          | English, Filipino                                                             |
| Existing portfolio | https://chrysanly.github.io/portfolio_v2/                                     |
| GitHub handle      | chrysanly                                                                     |
| Education          | BS Information Technology, Our Lady of Lourdes College, Valenzuela City, 2020 |

### Do not publish

Date of birth and civil status appear on the CV because Gulf CV convention
expects them. **They must not appear anywhere on the website, in metadata, in
JSON-LD, or in the résumé PDF served from the site.** They are an identity
exposure with no upside for a visitor.

Phone number: publish only on `/contact`, never in the page footer or in
structured data, to limit scraping. The WhatsApp link is the same number in
another form, so the same rule covers it.

---

## 2. Positioning

Use this as the source for the About page and the hero intro. Written from the
CV, tightened for the web:

> Senior full-stack developer with 5+ years building scalable web
> applications, REST APIs and enterprise ERP systems. Laravel, Node.js and
> modern JavaScript frameworks. Strongest in role-based access control,
> service-repository architecture, database optimisation and real-time system
> integration. Leads development teams, mentors engineers, and uses
> AI-assisted workflows to accelerate delivery without loosening code quality.

The hero's three reveal lines stay as specified in `04-UIUX-BRIEF.md`:

```
Senior full-stack developer
building ERP and automation systems
for companies in Dubai.
```

---

## 3. Skills

Group exactly as below. Do not reorder into a "proficiency" ranking — there
is no data for that. Shown with logos in the home page's "What I build with"
section and as words on About; both read `skillGroups` in content/site.ts.

Updated 2026-10-19 from Chrys's resume (`CJ_Roma_Resume_ATS.pdf`, Technical
Skills), at his request ("show all the tech stacks, tools, AI that I am
using… make sure it shows the logos"). Only the skills were taken: the
resume's date of birth, civil status and phone stay off the site (rule 2 of
CLAUDE.md). Groq is from the resume's experience section (used for testing
the CEO dashboard's AI features). Kept on the site, not in the admin, by his
choice.

**Languages & frameworks** — PHP, JavaScript, Python, Dart, SQL, HTML5,
CSS3/SCSS, Laravel, Node.js, Vue, React, Next.js, Angular, .NET Web API,
Flutter, Ionic, Tauri

**Databases** — MySQL, MariaDB, PostgreSQL, MongoDB, Firebase Firestore, SQLite,
Neon Postgres

**AI & agentic engineering** — Claude Code, Model Context Protocol (MCP),
Groq; AI-assisted software development, agentic AI workflows, reusable AI
skills, AI API integration, AI-powered application features, AI-assisted code
analysis and refactoring

**Architecture & practices** — SOLID principles, clean code, Service Layer
pattern, Repository pattern, RESTful API design, RBAC, database query
optimisation, N+1 query prevention, TDD, Agile/Scrum, Conventional Commits

**Auth & security** — Laravel Sanctum, Laravel Passport, OAuth 2.0, JSON Web
Tokens (JWT), Twilio OTP, role-based authorization

**Payments & integrations** — Tabby, Tamara, Etisalat, Stripe, REST API
integrations, mobile API integration

**Tools & platforms** — Visual Studio Code, PhpStorm, Git, GitHub, GitLab,
Azure, AWS, Firebase, Docker, Render, Cloudinary, Composer, NPM, Vite, Webpack, Postman, Apidog,
DBngin, TablePlus, JIRA, Figma

**Testing & QA** — PHPUnit, Pest, Firebase Emulator, TDD, API testing

**Desktop apps** — Tauri, Rust/Cargo, Orca

Updated again 2026-10-19 at his request: version numbers dropped (Laravel,
Vue, Angular, Ionic), and Next.js, Neon Postgres, Render and Cloudinary added
("add the nextjs, render, cloudinary and neon postgre").

Logos are Simple Icons (CC0, simple-icons 16.35.0) fetched into
`public/logos/` by `scripts/generate-tech-icons.mjs`. Simple Icons publishes
none for VS Code, Azure, AWS, Apidog, DBngin, TablePlus, Twilio, Tabby,
Tamara, Etisalat, PHPUnit, Pest, Orca, Groq, OAuth or SQL. Those are simple
marks drawn by hand in their brand colours (`drawnLogos` in content/site.ts),
because he asked for every tool to show a logo, Tabby, Tamara and Etisalat
by name. Trademarks belong to their owners and only identify the tools.
Practices have no logo and show their group's icon.

The work index shows a **principal stack** only: Laravel, Node.js, Vue, React,
MySQL, TypeScript. The full list lives in the stack section and on About.

---

## 4. Employment history

Used for the About page timeline. Not every role becomes a project.

| Role                        | Company                                       | Location    | Period              |
| --------------------------- | --------------------------------------------- | ----------- | ------------------- |
| Senior Full-Stack Developer | Almutakamela Vehicle Testing and Registration | Dubai, UAE  | Nov 2025 – present  |
| Senior Software Engineer    | OmniQuest PH (Unilab)                         | Philippines | Mar 2025 – Aug 2025 |

> Chrys corrected this title on 19 Sep 2026: it was given here as
> "Senior PHP Developer" and is now Senior Software Engineer. The role string
> is also the key that attaches a project to a post, so it has to match
> `content/projects/crm-systems-integration.mdx` exactly.

| Web Developer | ThinkBit Solutions Phils. Inc | Philippines | Nov 2022 – Feb 2025 |
| Mid Software Developer | TourismoPH | Philippines | Sep 2020 – Oct 2022 |
| Junior Web Developer | V. Zuniga Logistics | Philippines | Nov 2018 – Dec 2020 |

---

## 5. Project entries

Six candidates. **Feature four**; the rest go on `/work` unfeatured. Build
these as `content/projects/*.mdx` per `05-DATA-SCHEMA.md`.

### 5.1 `modular-erp-platform` — featured

```yaml
type: erp
year: 2025
role: Senior Full-Stack Developer
confidential: true # see §5.7 before changing
sector: Vehicle testing and registration
```

**Summary:** Four-module Laravel ERP — Dashboard, Finance, Mobile CIS and API
App — on one codebase with role-based middleware throughout.

**Problem material:** Operations spanning vehicle testing, registration,
finance and field service had no single system; access control and financial
tracking were the weak points.

**Approach material:**

- Role-based middleware for authentication and permission management across
  all four modules
- Finance module: role-permissioned accounting pages, financial aging logic
  for debit and credit balances, asset depreciation tracking
- Mobile CIS module: client service appointment management driven by customer
  information
- Dashboard module: configuration of mobile API data categories and service
  listings
- Secure REST APIs with Laravel Sanctum powering mobile app authentication
- Core business logic refactored onto Repository and Service Layer patterns,
  improving reusability and Eloquent query performance
- Code review and mentoring to hold clean architecture standards

**Stack:** Laravel, MySQL, Laravel Sanctum, REST API, Repository pattern,
Service Layer pattern, RBAC

**Outcome:** `[METRIC]` / `[what it improved]` — unknown, see §6

---

### 5.2 `crm-systems-integration` — featured

```yaml
type: integration
year: 2025
role: Senior Software Engineer
confidential: true
sector: Pharmaceutical
```

**Summary:** Four interconnected systems integrated with a central CRM, with a
reusable event registration module.

**Approach material:**

- Managed one project spanning four interconnected systems feeding a central
  CRM, keeping data flow consistent across platforms
- Built a dynamic CRM registration module reusable across multiple events,
  cutting setup time for new campaigns
- Authored technical documentation establishing a local → beta → live
  deployment workflow, improving release stability
- Updated stored procedures and database functions as client requirements
  evolved

**Stack:** PHP, Laravel, SQL, stored procedures, CRM integration

**Outcome:** `[METRIC]` / `[what it improved]`

---

### 5.3 `realtime-platform-suite` — featured

```yaml
type: web
year: 2024
role: Web Developer / Full-stack lead
confidential: true
sector: Software services
```

**Summary:** Multiple production Laravel applications with real-time features,
third-party integrations and secure authentication, plus a legacy Laravel 5
modernisation.

**Approach material:**

- Full-stack Laravel across several high-performance applications
- Real-time backends with Pusher, Firebase and Twilio
- Integrations: Google Maps, Monday.com, AWS S3
- Legacy Laravel 5 systems refactored to current versions, with API and
  database performance work
- Authentication: Twilio OTP and Laravel Passport OAuth
- Proof-of-concept facial recognition login with activity logging
- Ran Agile ceremonies and mentored junior developers

**Stack:** Laravel, Pusher, Firebase, Twilio, AWS S3, Laravel Passport, MySQL

**Outcome:** `[METRIC]` / `[what it improved]`

---

### 5.4 `booking-vendor-platform`

```yaml
type: web
year: 2022
role: Mid Software Developer
confidential: true
sector: Travel and tourism
```

**Summary:** JWT-secured booking system with real-time availability, plus a
vendor management platform migrated from a Laravel CMS to Node.js.

**Approach material:**

- Booking system with real-time availability, REST APIs, React front end
- Vendor management system: Laravel CMS migrated to Node.js, subscription
  features, Angular dashboards documented with Swagger
- Membership system for a government site with bulk CSV upload and dynamic
  region and category reporting

**Stack:** Laravel, Node.js, React, Angular, JWT, Swagger, MySQL

**Outcome:** `[METRIC]` / `[what it improved]`

---

### 5.5 `document-parsing-engine` — featured

```yaml
type: automation
year: 2026
role: Solo build
confidential: false
client: Personal project
```

**Summary:** Structured extraction from supplier PDFs with dynamic
per-company branding applied to generated output.

**Stack:** Python, Laravel, PDF parsing, React, TypeScript

React and TypeScript added on 2026-10-14 from the public repo
`chrysanly/crm-pdf-parser` (Laravel + Inertia React + TypeScript, a Python
sidecar, PDF output through dompdf). See §7.

**Outcome:** `[METRIC]` / `[what it improved]`

_Screenshots permitted — this is his own work. Prioritise capturing them._

---

### 5.6 `devio`

```yaml
type: web
year: 2026
role: Founder
confidential: false
client: devio
```

**Summary:** Own web development practice in Dubai — product sites and
internal tooling for small businesses.

**Outcome:** `[METRIC]` / `[what it improved]`

_Screenshots permitted._

---

### 5.7 `portfolio-backend` — added in Phase 8, not before

The Laravel API and admin specified in `08-BACKEND.md` becomes a seventh
project once built. It is the only project with no NDA limits, so it carries
full screenshots and an architecture write-up. Do not create this MDX entry
until the backend actually exists.

---

### 5.8 NDA decision — Chrys must confirm before launch

Employment at these companies is already public on his CV and LinkedIn, so
naming them is not automatically a breach. **What is usually restricted is
project detail and screenshots, not the employer's name.**

Default in this spec is `confidential: true` for all four client projects,
because that is the safe state. For each one, Chrys decides:

- **Name the client?** If his contract permits, change `confidential` to
  `false` and set `client`. This is a meaningful credibility gain —
  "Almutakamela Vehicle Testing and Registration" reads stronger than
  "Confidential — vehicle testing sector".
- **Show screenshots?** Almost certainly not for client systems. Leave
  `images: []`. The schema and layout already handle this.

Do not change any of these defaults without his explicit instruction.

---

## 5.9 How "What I did" is written on the site

Chrys, 2026-10-14, in his own words:

> Keep the "What I Did" section of my portfolio short and focused on keywords
> or brief phrases rather than detailed descriptions. This will make my
> portfolio cleaner and allow me to explain my responsibilities,
> contributions, and achievements in more detail during interviews.

So the site shows each bullet in §5 as a short phrase (48 characters at most),
cut down from that bullet's own words — nothing added. The full bullets above
stay here as the source; the short phrases live in
`portfolio-api/database/seeders/data/projects.json` and the admin.

## 5.10 Availability — the closing statement

Chrys, 2026-10-14, in his own words:

> My portfolio should primarily highlight my professional experience and real
> projects. At the bottom, include a statement that I am open to remote
> opportunities worldwide, not just in the US or UK, so I can attract clients
> from different countries.
>
> Mention that I am open to both part-time and full-time opportunities,
> depending on discussion and agreement.

On the site, once per page, in the closing strip of the contact band:

> **Working remotely with teams anywhere in the world**
> Part-time or full-time, as we agree.

Reworded 2026-10-16 at Chrys's request ("remove the redundant … because I
always see it. change the description"): the same three facts — remote,
worldwide, part-time or full-time by agreement — in fresher words, nothing
added. It used to appear twice on the home page (also as "Next chapter" at the
end of the journey); it now appears only here. The earlier wording was:

> **Open to remote work worldwide**
> Part-time or full-time, by agreement.

The band's lead no longer names "UK & US businesses" for the same reason.

## 6. Still unknown — must ship as placeholders

| Placeholder                       | What's needed                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `[METRIC]` / `[what it improved]` | One measurable outcome per project. The single highest-value gap on the site. |
| `[X] days weekly`                 | Availability, if he wants it public                                           |
| Screenshots                       | For the two projects where they're permitted                                  |

The LinkedIn URL was supplied on 2026-09-20 and is recorded in §1. It is live
on `/contact` and in the contact band that closes every page.

**Metrics are the priority.** Every bullet in §5 describes what was built. Not
one says what changed as a result. "Refactored onto Repository and Service
Layer patterns" is a developer statement; "cut average query time on the
finance dashboard from X to Y" is a business one, and the second is what
converts a visitor into an enquiry.

For each featured project, Chrys should supply one of: time saved, error rate
reduced, throughput increased, cost avoided, or users served. An honest
approximation stated as approximate is fine. An invented number is not.

---

## 7. Checked against GitHub — 2026-10-14

Chrys asked that everything here be "accurate and consistent with my GitHub
repositories", in plain words. The public repos under `github.com/chrysanly`
and the profile README were read; private repos were not.

**Changed, because a repo backs it**

| Where                        | Change                          | Evidence                                                               |
| ---------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| §5.5 Document Parsing Engine | Stack adds React and TypeScript | `crm-pdf-parser`: Inertia React + TypeScript beside Laravel and Python |

**Consistent — nothing to change**

- Role and focus: the profile README says "Senior Full-Stack Engineer" with
  ERP, financial aging, asset depreciation and multi-tenant work — matching
  §1, §2 and §5.1.
- Patterns: SOLID, Service and Repository layers and RBAC, as in §2 and §5.1.
- Document Parsing Engine: the README's "unstructured vendor data into
  multi-tenant branded digital reports" matches §5.5's summary.

**For Chrys to decide — not changed, because no public repo settles it**

1. **Years of experience.** The profile shows "6+" but the positioning
   paragraph in §2 says "5+ years". GitHub does not say which.
2. **Project name.** The GitHub README lists a "CRM Communication Suite"
   (legacy refactor, real-time messaging). The site calls the closest project
   "Real-time Platform Suite" (§5.3). Same project, or a different one?
3. **devio's stack** is still `[stack]`. `devio-atlas` (a real-estate demo,
   Laravel + React + TypeScript) is public, but it is a demo, not a statement
   of what the practice uses — so the placeholder stays until Chrys confirms.
4. **Stack the README names and the site does not:** CodeIgniter, Yii2,
   MariaDB, Bootstrap, Jira, Postman. Add any of them to §3?
5. **Stack the site names and the README does not:** Node.js, PostgreSQL,
   MongoDB, Firebase. All four appear in §4–§5 project history, so they stay;
   the README could list them too.
6. **Every client project** (§5.1–§5.4) is under NDA with no public repo, so
   none of it can be checked against GitHub — it rests on the CV.
