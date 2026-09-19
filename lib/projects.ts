import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  PROJECT_TYPES,
  type Project,
  type ProjectType,
  projectFrontmatterSchema,
} from './schema';

/** Reserved because /work/type/[type] occupies this segment under /work. */
const RESERVED_SLUGS = new Set(['type']);

const CONTENT_DIR = path.join(process.cwd(), 'content', 'projects');
const SNAPSHOT = path.join(process.cwd(), 'content', 'snapshot.json');

/**
 * Where the content comes from, in order of preference.
 *
 * docs/08-BACKEND.md §2: the Laravel API is read at build time by
 * scripts/pull-content.mjs, which writes content/snapshot.json. By the time
 * anything renders, the content is a local file — there is no API call in front
 * of a page request, ever.
 *
 * Falling back to the MDX means this repository still builds on its own, with
 * no backend and no snapshot. That is not a nicety: it is how the site was
 * built for its first seven phases, and it keeps working.
 *
 * Both paths run through the same Zod schema below, so a backend that drifts
 * from the contract fails the build in exactly the same way a bad MDX file
 * does.
 */
function readSnapshot(): unknown[] | null {
  if (!fs.existsSync(SNAPSHOT)) return null;

  try {
    const payload = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
    if (!Array.isArray(payload?.projects)) return null;
    return payload.projects;
  } catch (error) {
    throw new Error(
      `content/snapshot.json exists but could not be read: ${(error as Error).message}`,
    );
  }
}

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
function readAll(): Project[] {
  const fromApi = readSnapshot();

  if (fromApi) {
    const projects = fromApi.map((row, i) =>
      validate(row, `content/snapshot.json (project ${i + 1})`),
    );
    return finalise(projects);
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

let cache: Project[] | null = null;

export function getAllProjects(): Project[] {
  if (!cache) cache = readAll();
  return cache;
}

export function getFeaturedProjects(): Project[] {
  return getAllProjects().filter((p) => p.featured);
}

export function getProject(slug: string): Project | undefined {
  return getAllProjects().find((p) => p.slug === slug);
}

export function getProjectsByType(type?: ProjectType): Project[] {
  const all = getAllProjects();
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

export function adjacentProjects(slug: string): {
  previous: Project | null;
  next: Project | null;
} {
  const all = getAllProjects();
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1) return { previous: null, next: null };
  return { previous: all[i - 1] ?? null, next: all[i + 1] ?? null };
}
