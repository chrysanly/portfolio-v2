import path from 'node:path';
import { education, employment } from '@/content/site';
import { type JourneyStopData, journeyStopSchema } from './schema';
import { readContentPayload } from './content-source';

/**
 * The career timeline, from the same two sources as the projects and in the
 * same order of preference — docs/08-BACKEND.md §2.
 *
 *  1. `content/snapshot.json`, written from the Laravel admin at build time.
 *  2. `content/site.ts`, the hardcoded copy the site shipped with.
 *
 * The fallback is not a nicety. It is what lets this repository build on its
 * own with no backend, and it is what keeps the site up the first time
 * someone runs a build before the journey table has anything in it.
 *
 * Both paths return the same shape, oldest first — the order the site walks
 * a career, rather than the CV's newest-first.
 */
export interface JourneyEntry {
  kind: 'work' | 'education';
  title: string;
  organisation: string;
  location: string;
  period: string;
  phase: string | null;
  /** HTML from the admin's TipTap field, or plain text on an older snapshot. */
  learned: string | null;
  /**
   * Slugs of the projects built at this stop, as the backend states them.
   * Empty when the payload predates the relation — the timeline then falls
   * back to matching a project's role against the title, as it always did.
   */
  projects: string[];
}

async function fromApi(): Promise<JourneyEntry[] | null> {
  const payload = await readContentPayload();
  const rows = (payload as { journey?: unknown } | null)?.journey;

  // A snapshot written before the journey existed has no such key. That is a
  // fallback, not a failure — an older build script should not break a build.
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const parsed = rows.map((row, i) => {
    const result = journeyStopSchema.safeParse(row);

    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(
        `Invalid journey stop from the content source (stop ${i + 1})\n${detail}`,
      );
    }

    return result.data;
  });

  // `order` did its job in the sort and is not part of the rendered shape.
  return [...parsed]
    .sort((a, b) => a.order - b.order)
    .map((stop: JourneyStopData) => ({
      kind: stop.kind,
      title: stop.title,
      organisation: stop.organisation,
      location: stop.location,
      period: stop.period,
      phase: stop.phase,
      learned: stop.learned,
      projects: stop.projects,
    }));
}

/**
 * The shape the site shipped with, mapped onto the one above.
 *
 * `content/site.ts` lists employment newest first, which is CV order rather
 * than narrative order, and keeps the degree in a separate export. Both are
 * reconciled here so that whichever source is in play, everything downstream
 * sees one list in one order.
 */
function fromSiteContent(): JourneyEntry[] {
  const roles: JourneyEntry[] = employment.map((job) => ({
    kind: 'work',
    title: job.role,
    organisation: job.company,
    location: job.location,
    period: job.period,
    phase: job.phase,
    learned: job.learned,
    // The hardcoded fallback has no relation to carry, so the role matching
    // downstream is what attaches work to it.
    projects: [],
  }));

  const degree: JourneyEntry = {
    kind: 'education',
    title: education.degree,
    organisation: education.school,
    location: education.location,
    period: String(education.year),
    phase: null,
    learned: null,
    projects: [],
  };

  // The degree opens the run: chronologically it overlaps the first job, but
  // it is where the story starts.
  return [degree, ...[...roles].reverse()];
}

/**
 * Read through the shared loader, like projects and the profile. This used to
 * come off `content/snapshot.json` directly, which only a build rewrites — so
 * editing the journey in the admin needed a rebuild before it appeared.
 */
let cache: JourneyEntry[] | null = null;

export function clearJourneyCache(): void {
  cache = null;
}

export async function getJourney(): Promise<JourneyEntry[]> {
  if (cache && process.env.NODE_ENV === 'production') return cache;

  const entries = (await fromApi()) ?? fromSiteContent();
  cache = entries;

  return entries;
}

/** Just the jobs — for "N companies" counts, which a degree is not. */
export async function getRoles(): Promise<JourneyEntry[]> {
  return (await getJourney()).filter((stop) => stop.kind === 'work');
}
