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

export const projectImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1, 'alt is required — never generate it from the filename'),
  caption: z.string().optional(),
});

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
