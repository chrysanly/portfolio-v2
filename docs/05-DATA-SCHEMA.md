# 05 — Data & Backend Schema

There is no content database. Projects are MDX files validated at build time.
The only server-side data path is the contact form.

## 1. Project content model

One file per project: `content/projects/<slug>.mdx`.

### Frontmatter contract

```yaml
---
slug: modular-erp-platform # required, matches filename
title: Modular ERP Platform # required, ≤ 60 chars
type: erp # required: erp | automation | web | integration
confidential: true # required
client: null # null when confidential is true
sector: Vehicle testing # required when confidential is true
year: 2025 # required
role: Senior full-stack developer # required
summary: > # required, ≤ 200 chars — used in the index
  Dashboard, finance, mobile field inspection and public API on one codebase,
  role-based access throughout.
outcome:
  value: '[METRIC]' # required — placeholder until the real figure exists
  label: '[what it improved]' # required
stack: # required, 1–12 entries
  - Laravel
  - MySQL
  - Sanctum
images: [] # may be empty — layout must not depend on it
featured: true # required
order: 1 # required, ascending
---
```

The MDX body supplies the detail sections in fixed order: `## Problem`,
`## Approach`, `## Stack notes`, `## Outcome`.

### Validation rule

`confidential: true` requires `client: null` **and** a non-empty `sector`.
`confidential: false` requires a non-empty `client`. Any violation fails the
build. This is the mechanism that prevents an NDA breach by accident.

## 2. Types

```ts
export type ProjectType = 'erp' | 'automation' | 'web' | 'integration';

export interface ProjectImage {
  src: string;
  alt: string; // required — never generated from the filename
  caption?: string;
}

export interface Outcome {
  value: string; // "[METRIC]" until a real figure exists
  label: string;
}

export interface Project {
  slug: string;
  title: string;
  type: ProjectType;
  confidential: boolean;
  client: string | null;
  sector: string | null;
  year: number;
  role: string;
  summary: string;
  outcome: Outcome;
  stack: string[];
  images: ProjectImage[]; // may be empty
  featured: boolean;
  order: number;
  body: string;
}
```

Display rule derived from the model, to be implemented once in a helper and
reused: `attribution = confidential ? \`Confidential — ${sector} sector\` : client`.
No component reimplements this.

## 3. Site constants

`content/site.ts` — single source for values that appear in more than one place:

```ts
export const site = {
  name: 'Chrys',
  fullName: 'Chrysanly John Corpuz Roma',
  role: 'Senior Full-Stack Developer',
  location: 'Dubai, UAE',
  yearsExperience: '5+',
  availability: '[X] days weekly', // placeholder — still unknown
  email: 'chrys.romao21@gmail.com',
  phone: '+971 52 925 8013', // render on /contact only, never in footer or JSON-LD
  links: {
    linkedin: '[linkedin-url]', // placeholder — still unknown
    github: 'https://github.com/chrysanly',
    resume: '/resume.pdf',
  },
  intro: [
    'Senior full-stack developer',
    'building ERP and automation systems',
    'for companies in Dubai.',
  ],
} as const;
```

Values are transcribed from `07-SOURCE-CONTENT.md` §1. Do not add `dateOfBirth`
or `civilStatus` — they are on the source CV and are deliberately excluded.

The three `intro` strings are the hero's reveal lines. Changing them changes
the sequence with no code edit.

## 4. Contact submission

```ts
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  message: z.string().trim().min(20).max(2000),
  website: z.literal('').optional(), // honeypot — any value means bot
});

export type ContactInput = z.infer<typeof contactSchema>;
```

Used by React Hook Form on the client and by the route handler on the server.
One schema, two consumers.

### Endpoint

`POST /api/contact`

| Status | Body                                                                 |
| ------ | -------------------------------------------------------------------- |
| 200    | `{ ok: true }`                                                       |
| 422    | `{ ok: false, errors: Record<keyof ContactInput, string> }`          |
| 429    | `{ ok: false, message: 'Too many messages. Try the direct email.' }` |
| 500    | `{ ok: false, message: 'Message could not be sent.' }`               |

Rejection order: honeypot filled → return 200 without sending (do not tell a
bot it failed); rate limit exceeded → 429; schema invalid → 422; mail provider
error → 500.

**No submission is persisted.** Messages are relayed by email and nothing is
stored. There is no database, no ORM, and no personal data at rest — which
keeps the site outside data-retention obligations entirely.

## 5. Environment

```
RESEND_API_KEY=
CONTACT_TO_EMAIL=
NEXT_PUBLIC_SITE_URL=
```

Commit `.env.example` with empty values. Never commit real values.

## 6. If persistence is added later

Only reason would be reliability of delivery. In that case: one table,
`contact_submissions`, with `id`, `name`, `email`, `company`, `message`,
`ip_hash`, `created_at`, `delivered_at`. Hash the IP, never store it raw, and
add a retention policy before writing the first row. Not in scope for v1.
