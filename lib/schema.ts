import { z } from 'zod';
import { cleanLine, cleanList, cleanText } from './text';

/**
 * Every string and every list from the content source is normalised before it
 * is validated, not after.
 *
 * Everything here arrives from the admin's forms, so the imperfections are
 * the ordinary ones: a stray emphasis marker left in a
 * form field, a pasted non-breaking space, a Windows line break inside a
 * one-line value, a blank row somebody left in a list. Cleaning on the way in
 * means one place decides what a usable string is, and every consumer — pages,
 * metadata, the OG image, the journey — sees the same value. See lib/text.ts.
 *
 * Chrys asked for this filtering inside the components, on 2026-09-22. It is
 * here instead, one layer earlier, so that a component written later cannot
 * forget to do it; the components keep their own "is this list empty" guards,
 * which is what collapses a section cleanly.
 */

/** A one-line value: no line breaks, no stray emphasis, trimmed. */
const line = (schema: z.ZodString) => z.preprocess((value) => cleanLine(value), schema);

/** Markdown or prose, where the line breaks are content. */
const prose = (schema: z.ZodString) => z.preprocess((value) => cleanText(value), schema);

/**
 * A list with the holes taken out: nulls, blanks and duplicates are dropped
 * rather than failing validation. An empty list is a valid state — the UI
 * collapses the section — because a build that dies when somebody clears a
 * field in the admin is a worse failure than a missing row.
 */
const list = (max: number) =>
  z.preprocess((value) => cleanList(value), z.array(z.string().min(1)).max(max));

/** docs/05-DATA-SCHEMA.md §1 and §2. */
export const PROJECT_TYPES = ['erp', 'automation', 'web', 'integration'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  erp: 'ERP',
  automation: 'Automation',
  web: 'Web',
  integration: 'Integration',
};

export const DEVICES = ['laptop', 'tablet', 'mobile'] as const;
export type Device = (typeof DEVICES)[number];

/**
 * The exact pixel box each frame expects, so a screenshot drops in without
 * being letterboxed and a backend can generate the right crop.
 *
 * These are real viewport sizes, not arbitrary ratios: a 16:10 laptop, a portrait 3:4
 * tablet and a 390x844 phone. The frame's CSS aspect-ratio is derived from
 * these numbers — change them here and the frames follow.
 */
export const DEVICE_SIZES: Record<Device, { width: number; height: number }> = {
  laptop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

/** What the file actually is. Videos cannot go in an `<img>`. */
export const MEDIA_KINDS = ['image', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const projectImageSchema = z.object({
  src: line(z.string().min(1)),
  alt: line(z.string().min(1, 'alt is required — never generate it from the filename')),
  caption: line(z.string()).optional(),
  /** Decided by the backend (ProjectImageResource) for every file it serves. */
  kind: z.enum(MEDIA_KINDS).default('image'),
  /**
   * Whether this file is still under the client's NDA. The backend allows a
   * screenshot onto a confidential project and marks it instead of refusing
   * it, and the mark is drawn here — see `NdaWatermark`.
   *
   * The backend sends it on every image; the default only covers a field
   * the payload omits, which the backend's own tests rule out.
   */
  nda: z.boolean().default(false),
  /** Which frame the showcase renders this in. */
  device: z.enum(DEVICES).default('laptop'),
  /**
   * Intrinsic size. Optional because DEVICE_SIZES supplies the default, but
   * worth setting when a backend serves the file: the browser reserves the box
   * before the image arrives, so a slow image cannot shift the layout.
   */
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

/**
 * What to render a piece of evidence with: the backend's `kind`, as sent.
 * It knows what the file is — a Cloudinary video URL carries no extension to
 * guess from.
 */
export function mediaKind(image: { kind: MediaKind }): MediaKind {
  return image.kind;
}

export const outcomeSchema = z.object({
  /*
   * The bracketed placeholders pass through untouched. They are real content
   * under rule 1 of CLAUDE.md — the site ships the placeholder rather than an
   * invented figure, and docs/CONTENT-TODO.md section 2 tracks them. The
   * cleaning here removes formatting damage, never a value.
   */
  value: line(z.string().min(1)),
  label: line(z.string().min(1)),
});

export type ProjectImage = z.infer<typeof projectImageSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;

/**
 * The cross-validation on confidential/client is the mechanism that prevents
 * an NDA breach by accident. A violation fails the build — see lib/projects.ts.
 */
export const projectFrontmatterSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
    title: line(z.string().min(1).max(60)),
    type: z.enum(PROJECT_TYPES),
    confidential: z.boolean(),
    client: line(z.string().min(1)).nullable().default(null),
    sector: line(z.string().min(1)).nullable().default(null),
    year: z.number().int().min(2000).max(2100),
    role: line(z.string().min(1)),
    summary: line(z.string().min(1).max(200)),
    outcome: outcomeSchema,
    /*
     * No lower bound any more. It was `.min(1)`, which turned an empty stack
     * in the admin into a failed build for the whole site; the section now
     * collapses instead, which is Chrys's brief of 2026-09-22 item 1 and the
     * better failure by a distance.
     */
    stack: list(12),
    /**
     * What was actually built, verbatim from that project's "Approach
     * material" bullets in docs/07-SOURCE-CONTENT.md §5. Shown in the journey
     * under the role it was built in.
     */
    contributions: list(8).default([]),
    /**
     * The problem the project solved, one short paragraph. The showcase puts
     * it beside "What I did"; empty when the admin leaves it blank, and the
     * column is then not drawn.
     */
    problem: prose(z.string().max(1500)).default(''),
    /**
     * Markdown on the tools and why they were chosen. Its own section of the
     * case study, after the approach; null when the admin leaves it blank.
     */
    stackNotes: prose(z.string()).nullable().default(null),
    /**
     * The engineering the case study is actually about — stored procedures for
     * transaction safety, a Repository and Service split enforcing SOLID,
     * Pusher plus S3 plus Passport. Asked for on 2026-09-22: a technical lead
     * reads this paragraph and often nothing else.
     *
     * Optional: a project without one simply does not draw the section.
     */
    engineeringDepth: prose(z.string().max(1200)).nullable().default(null),
    images: z.array(projectImageSchema).default([]),
    featured: z.boolean(),
    order: z.number().int().min(0),
  })
  .superRefine((value, ctx) => {
    if (value.confidential) {
      if (value.client !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['client'],
          message: 'confidential: true requires client: null',
        });
      }
      if (!value.sector) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sector'],
          message: 'confidential: true requires a non-empty sector',
        });
      }
    } else if (!value.client) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['client'],
        message: 'confidential: false requires a non-empty client',
      });
    }
  });

export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;

export interface Project extends ProjectFrontmatter {
  body: string;
}

/**
 * A stop on the career timeline, as the API sends it — the contract the
 * backend's `JourneyStopResource` is written against. Validated on the way
 * in for the same reason projects are: a backend that drifts should fail the
 * build, not quietly render a broken timeline.
 *
 * Deliberately absent: the technologies and projects shown under each stop.
 * Those are derived here by matching a project's role against `title`, so
 * carrying them would be carrying the same facts twice.
 */
export const journeyStopSchema = z.object({
  kind: z.enum(['work', 'education']),
  title: line(z.string().min(1).max(140)),
  organisation: line(z.string().min(1).max(160)),
  location: line(z.string().min(1).max(120)),
  /** Free text — "Nov 2022 – Feb 2025", or just "2020" for a degree. */
  period: line(z.string().min(1).max(60)),
  /**
   * The dates the period is worked out from, ISO `YYYY-MM-DD`. Null on a stop
   * saved before the dates existed, and `endedOn` null for the post held now.
   * The site prints `period`; these are for anything that needs to compare.
   */
  startedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  endedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  /** The editorial arc beside the real job title. A degree has none. */
  phase: line(z.string().max(120)).nullable().default(null),
  /**
   * HTML, written in the admin's TipTap field and sanitised there against an
   * allowlist (`App\Services\RichText`). The ceiling is on the markup rather
   * than the prose: the same two sentences cost three times as much once they
   * are two tagged paragraphs with a link in them.
   *
   * Rows written before the editor hold plain text, which is why the timeline
   * wraps anything that does not start with a tag in a paragraph.
   */
  learned: z.string().max(20000).nullable().default(null),
  /**
   * The slugs of the projects built at this stop, stated by the backend.
   *
   * It used to be derived here, by matching a project's `role` against this
   * `title`. That made the job title load-bearing — rewording either side
   * silently emptied a stop, with nothing to report it — so the backend now
   * carries an explicit relation. Only slugs: the projects themselves are in
   * the same payload, and sending them twice invites disagreement.
   *
   * Defaults empty, and the timeline falls back to the old matching when it
   * is.
   */
  projects: list(40).default([]),
  order: z.number().int().min(0),
});

export type JourneyStopData = z.infer<typeof journeyStopSchema>;

/**
 * The identity the site is written about: the hero's opening lines, the
 * ledger beneath them, and the card on the lanyard — the contract the
 * backend's `ProfileResource` is written against.
 *
 * The API is the only source, so the fields are required: a profile missing
 * one fails the build rather than rendering a hole. Only what the admin may
 * legitimately leave empty — availability, portrait, CV, the two links — is
 * nullable.
 *
 * No phone number, deliberately, and no date of birth or civil status —
 * docs/07-SOURCE-CONTENT.md §1. Those never travel in this payload.
 */
export const profileSchema = z.object({
  name: line(z.string().min(1).max(60)),
  fullName: line(z.string().min(1).max(160)),
  role: line(z.string().min(1).max(120)),
  location: line(z.string().min(1).max(120)),
  yearsExperience: line(z.string().min(1).max(20)),
  availability: line(z.string().max(60)).nullable().optional(),
  email: line(z.string().email()),
  languages: list(20),
  portrait: line(z.string().min(1)).nullable().optional(),
  links: z.object({
    github: line(z.string().url()).nullable().optional(),
    linkedin: line(z.string().url()).nullable().optional(),
  }),
  intro: list(6),
  notes: list(12),
  positioning: prose(z.string().max(1200)),
  /**
   * The CV, when one has been uploaded in the admin — absent or null until
   * then, and the hero's second button is not drawn at all in that case.
   *
   * A URL and nothing else: the file lives in the backend's media storage,
   * which is where it can be replaced without a deploy. Never `docs/resume.pdf`
   * from this repo — that copy carries a date of birth and a civil status and
   * is barred by rule 2 of CLAUDE.md.
   */
  cv: z
    .object({
      url: line(z.string().min(1)),
      updatedAt: line(z.string()).nullable().optional(),
      label: line(z.string().max(60)).nullable().optional(),
    })
    .nullable()
    .optional(),
  meta: z.object({
    discipline: z.string().max(200),
    architecture: z.string().max(240),
    principalStack: z.string().max(240),
    databases: z.string().max(240),
    security: z.string().max(240),
    currentRole: z.string().max(240),
  }),
});

export type ProfileData = z.infer<typeof profileSchema>;

/** docs/05-DATA-SCHEMA.md §4. One schema, two consumers. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'Name is too long.'),
  email: z.string().trim().email('Enter a valid email address.').max(160, 'Email is too long.'),
  company: z.string().trim().max(120, 'Company is too long.').optional().or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(20, 'Tell me a little more — at least 20 characters.')
    .max(2000, 'Message is too long.'),
  website: z.literal('').optional(), // honeypot — any value means bot
});

export type ContactInput = z.infer<typeof contactSchema>;
