import { z } from 'zod';

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
 * These are real viewport sizes, not arbitrary ratios: a 16:10 laptop, a 4:3
 * tablet and a 390x844 phone. The frame's CSS aspect-ratio is derived from
 * these numbers — change them here and the frames follow.
 */
export const DEVICE_SIZES: Record<Device, { width: number; height: number }> = {
  laptop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
};

/** What the file actually is. Videos cannot go in an `<img>`. */
export const MEDIA_KINDS = ['image', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const projectImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1, 'alt is required — never generate it from the filename'),
  caption: z.string().optional(),
  /**
   * Absent on everything uploaded before videos were allowed, so it is
   * inferred from the extension rather than required — see `mediaKind()`.
   */
  kind: z.enum(MEDIA_KINDS).optional(),
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
 * What to render a piece of evidence with. Trusts an explicit `kind` when
 * the backend sends one and falls back to the extension, because the
 * snapshot may predate the field — and because an MDX entry written by hand
 * will never bother to set it.
 */
export function mediaKind(image: { src: string; kind?: MediaKind }): MediaKind {
  if (image.kind) return image.kind;
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(image.src) ? 'video' : 'image';
}

export const outcomeSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
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
    title: z.string().min(1).max(60),
    type: z.enum(PROJECT_TYPES),
    confidential: z.boolean(),
    client: z.string().min(1).nullable().default(null),
    sector: z.string().min(1).nullable().default(null),
    year: z.number().int().min(2000).max(2100),
    role: z.string().min(1),
    summary: z.string().min(1).max(200),
    outcome: outcomeSchema,
    stack: z.array(z.string().min(1)).min(1).max(12),
    /**
     * What was actually built, verbatim from that project's "Approach
     * material" bullets in docs/07-SOURCE-CONTENT.md §5. Shown in the journey
     * under the role it was built in.
     */
    contributions: z.array(z.string().min(1)).max(8).default([]),
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
  title: z.string().min(1).max(140),
  organisation: z.string().min(1).max(160),
  location: z.string().min(1).max(120),
  /** Free text — "Nov 2022 – Feb 2025", or just "2020" for a degree. */
  period: z.string().min(1).max(60),
  /** The editorial arc beside the real job title. A degree has none. */
  phase: z.string().max(120).nullable().default(null),
  learned: z.string().max(400).nullable().default(null),
  order: z.number().int().min(0),
});

export type JourneyStopData = z.infer<typeof journeyStopSchema>;

/**
 * The identity the site is written about: the hero's opening lines, the
 * ledger beneath them, and the card on the lanyard — the contract the
 * backend's `ProfileResource` is written against.
 *
 * Every field is optional. The payload's `site` key predates this table and
 * older snapshots carry only a handful of these, so a missing key falls back
 * to `content/site.ts` rather than failing a build. What is validated is the
 * shape of whatever *is* there.
 *
 * No phone number, deliberately, and no date of birth or civil status —
 * docs/07-SOURCE-CONTENT.md §1. Those never travel in this payload.
 */
export const profileSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  fullName: z.string().min(1).max(160).optional(),
  role: z.string().min(1).max(120).optional(),
  location: z.string().min(1).max(120).optional(),
  yearsExperience: z.string().min(1).max(20).optional(),
  availability: z.string().max(60).nullable().optional(),
  email: z.string().email().optional(),
  languages: z.array(z.string().min(1).max(40)).optional(),
  portrait: z.string().min(1).nullable().optional(),
  links: z
    .object({
      github: z.string().nullable().optional(),
      linkedin: z.string().nullable().optional(),
    })
    .optional(),
  intro: z.array(z.string().min(1).max(120)).optional(),
  notes: z.array(z.string().min(1).max(300)).optional(),
  positioning: z.string().max(1200).optional(),
  meta: z
    .object({
      discipline: z.string().max(200),
      architecture: z.string().max(240),
      principalStack: z.string().max(240),
      databases: z.string().max(240),
      security: z.string().max(240),
      currentRole: z.string().max(240),
    })
    .optional(),
});

export type ProfileData = z.infer<typeof profileSchema>;

/** docs/05-DATA-SCHEMA.md §4. One schema, two consumers. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'Name is too long.'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .max(160, 'Email is too long.'),
  company: z.string().trim().max(120, 'Company is too long.').optional().or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(20, 'Tell me a little more — at least 20 characters.')
    .max(2000, 'Message is too long.'),
  website: z.literal('').optional(), // honeypot — any value means bot
});

export type ContactInput = z.infer<typeof contactSchema>;
