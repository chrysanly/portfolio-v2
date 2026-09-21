import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { clearContentCache, readContentPayload } from './content-source';
import {
  PROJECT_TYPES,
  type Project,
  type ProjectType,
  projectFrontmatterSchema,
} from './schema';

/** Reserved because /work/type/[type] occupies this segment under /work. */
const RESERVED_SLUGS = new Set(['type']);

const CONTENT_DIR = path.join(process.cwd(), 'content', 'projects');

/**
 * Projects, from whichever source content-source.ts resolves — the API first,
 * the committed snapshot after it, and the MDX below that.
 *
 * All three run through the same Zod schema, so a backend that drifts from the
 * contract fails exactly the way a bad MDX file does.
 */
function validate(data: unknown, source: string): Project {
  const parsed = projectFrontmatterSchema.safeParse(data);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid project data from ${source}\n${detail}`);
  }

  const body =
    typeof (data as { body?: unknown }).body === 'string'
      ? (data as { body: string }).body.trim()
      : '';

  return { ...parsed.data, body };
}

/**
 * Read, validate and sort. A malformed project throws here, which fails the
 * build — docs/02-TRD.md §8. Empty content directory is a supported state.
 */
async function readAll(): Promise<Project[]> {
  const payload = await readContentPayload();

  if (payload && Array.isArray(payload.projects)) {
    return finalise(
      payload.projects.map((row, i) => validate(row, `the content source (project ${i + 1})`)),
    );
  }

  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));

  const projects = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const parsed = projectFrontmatterSchema.safeParse(data);

    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
      throw new Error(`Invalid project frontmatter in content/projects/${file}\n${detail}`);
    }

    const expected = file.replace(/\.mdx$/, '');
    if (parsed.data.slug !== expected) {
      throw new Error(
        `Slug mismatch in content/projects/${file}: slug is "${parsed.data.slug}", filename says "${expected}".`,
      );
    }

    return { ...parsed.data, body: content.trim() };
  });

  return finalise(projects);
}

/** The checks that apply whichever source the projects came from. */
function finalise(projects: Project[]): Project[] {
  const seen = new Set<string>();
  for (const p of projects) {
    if (seen.has(p.slug)) throw new Error(`Duplicate project slug: ${p.slug}`);
    if (RESERVED_SLUGS.has(p.slug)) {
      throw new Error(`Reserved project slug: "${p.slug}" collides with /work/type/[type].`);
    }
    seen.add(p.slug);
  }

  return projects.sort((a, b) => a.order - b.order);
}

/**
 * Deduplicates the work within a single render pass.
 *
 * A page can ask for the projects several times — the page body, its metadata
 * and its OG image all do — and without this each would be a separate call.
 * Next's own data cache handles it across requests; this handles it within one.
 *
 * It holds the promise rather than the result, so concurrent callers share the
 * one request instead of starting several before the first resolves. It is
 * cleared whenever content is revalidated, and in development it is never
 * populated at all, so a save in the admin is visible on the next refresh.
 */
export function clearProjectCache(): void {
  clearContentCache();
}

export async function getAllProjects(): Promise<Project[]> {
  return readAll();
}

export async function getFeaturedProjects(): Promise<Project[]> {
  return (await getAllProjects()).filter((p) => p.featured);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getAllProjects()).find((p) => p.slug === slug);
}

export async function getProjectsByType(type?: ProjectType): Promise<Project[]> {
  const all = await getAllProjects();
  return type ? all.filter((p) => p.type === type) : all;
}

export function isProjectType(value: string | undefined): value is ProjectType {
  return !!value && (PROJECT_TYPES as readonly string[]).includes(value);
}

/**
 * The one place attribution is computed. docs/05-DATA-SCHEMA.md §2 —
 * no component reimplements this.
 */
export function attribution(
  project: Pick<Project, 'confidential' | 'client' | 'sector'>,
): string {
  return project.confidential
    ? `Confidential — ${project.sector} sector`
    : (project.client as string);
}

/** Two-part form for the work index cell: line, then a quieter qualifier. */
export function attributionParts(
  project: Pick<Project, 'confidential' | 'client' | 'sector'>,
): { primary: string; secondary: string | null } {
  return project.confidential
    ? { primary: 'Confidential', secondary: `${project.sector} sector` }
    : { primary: project.client as string, secondary: null };
}

export async function adjacentProjects(slug: string): Promise<{
  previous: Project | null;
  next: Project | null;
}> {
  const all = await getAllProjects();
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1) return { previous: null, next: null };
  return { previous: all[i - 1] ?? null, next: all[i + 1] ?? null };
}
