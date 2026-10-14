import { readContentPayload } from './content-source';
import {
  PROJECT_TYPES,
  type Project,
  type ProjectType,
  projectFrontmatterSchema,
} from './schema';

/** Reserved because /work/type/[type] occupies this segment under /work. */
const RESERVED_SLUGS = new Set(['type']);

/**
 * Projects, from the API through content-source.ts — the only source.
 *
 * Every row runs through the Zod schema, so a backend that drifts from the
 * contract fails the build (or, at runtime, the regeneration) rather than
 * rendering a broken page.
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
 * build — docs/02-TRD.md §8. An empty list is a supported state.
 */
async function readAll(): Promise<Project[]> {
  const payload = await readContentPayload();

  return finalise(
    (payload.projects ?? []).map((row, i) => validate(row, `the API (project ${i + 1})`)),
  );
}

/** Slugs must be unique and must not collide with a route segment. */
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
