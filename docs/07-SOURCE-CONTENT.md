# 07 — Source Content

**This document is the single source of truth for every fact on the site.**
It is transcribed from Chrys's CV. The agent must not invent anything that
contradicts it, and must not add facts that aren't here.

Anything still shown as `[BRACKETED]` is genuinely unknown and must ship as a
placeholder. See §6.

---

## 1. Identity

| Field | Value |
|-------|-------|
| Full name | Chrysanly John Corpuz Roma |
| Display name | Chrys |
| Title | Senior Full-Stack Developer |
| Location | Dubai, UAE |
| Experience | 5+ years |
| Email | chrys.romao21@gmail.com |
| Phone | +971 52 925 8013 |
| Languages | English, Filipino |
| Existing portfolio | https://chrysanly.github.io/portfolio_v2/ |
| GitHub handle | chrysanly |
| Education | BS Information Technology, Our Lady of Lourdes College, Valenzuela City, 2020 |

### Do not publish

Date of birth and civil status appear on the CV because Gulf CV convention
expects them. **They must not appear anywhere on the website, in metadata, in
JSON-LD, or in the résumé PDF served from the site.** They are an identity
exposure with no upside for a visitor.

Phone number: publish only on `/contact`, never in the page footer or in
structured data, to limit scraping.

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

Group exactly as below on the About page. Do not reorder into a "proficiency"
ranking — there is no data for that.

**Languages & frameworks** — PHP, JavaScript, Dart, SQL, HTML, CSS/SCSS,
Laravel 7–12, Node.js, Vue 3, React, Angular 7–10, .NET Web API, Flutter,
Ionic 5

**Databases** — MySQL, MariaDB, PostgreSQL, MongoDB, Firebase Firestore

**Architecture & practices** — SOLID, Repository pattern, Service Layer
pattern, RESTful API design, RBAC, TDD, clean code, conventional commits,
Agile/Scrum

**Auth & security** — Laravel Sanctum, Laravel Passport OAuth, Twilio OTP, JWT

**Tools & platforms** — Git, GitHub, GitLab, Azure, AWS, Firebase, Docker,
Postman, JIRA, Figma, Composer, NPM, Vite, Webpack

**Testing** — PHPUnit, Pest, Firebase Emulator

**AI-assisted development** — code integration, optimisation, workflow
automation

The work index shows a **principal stack** only: Laravel, Node.js, Vue, React,
MySQL, TypeScript. The full list lives on About.

---

## 4. Employment history

Used for the About page timeline. Not every role becomes a project.

| Role | Company | Location | Period |
|------|---------|----------|--------|
| Senior Full-Stack Developer | Almutakamela Vehicle Testing and Registration | Dubai, UAE | Nov 2025 – present |
| Senior Software Engineer | OmniQuest PH (Unilab) | Philippines | Mar 2025 – Aug 2025 |

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
confidential: true          # see §5.7 before changing
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

**Stack:** Python, Laravel, PDF parsing

**Outcome:** `[METRIC]` / `[what it improved]`

*Screenshots permitted — this is his own work. Prioritise capturing them.*

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

*Screenshots permitted.*

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

## 6. Still unknown — must ship as placeholders

| Placeholder | What's needed |
|-------------|---------------|
| `[METRIC]` / `[what it improved]` | One measurable outcome per project. The single highest-value gap on the site. |
| `[X] days weekly` | Availability, if he wants it public |
| LinkedIn URL | Full profile URL |
| Screenshots | For the two projects where they're permitted |

**Metrics are the priority.** Every bullet in §5 describes what was built. Not
one says what changed as a result. "Refactored onto Repository and Service
Layer patterns" is a developer statement; "cut average query time on the
finance dashboard from X to Y" is a business one, and the second is what
converts a visitor into an enquiry.

For each featured project, Chrys should supply one of: time saved, error rate
reduced, throughput increased, cost avoided, or users served. An honest
approximation stated as approximate is fine. An invented number is not.
