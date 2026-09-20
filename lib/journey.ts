import fs from 'node:fs';
import path from 'node:path';
import { education, employment } from '@/content/site';
import { type JourneyStopData, journeyStopSchema } from './schema';

const SNAPSHOT = path.join(process.cwd(), 'content', 'snapshot.json');

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
  learned: string | null;
}

function fromSnapshot(): JourneyEntry[] | null {
  if (!fs.existsSync(SNAPSHOT)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  } catch (error) {
    throw new Error(
      `content/snapshot.json exists but could not be read: ${(error as Error).message}`,
    );
  }

  const rows = (payload as { journey?: unknown }).journey;

  // A snapshot written before the journey existed has no such key. That is a
  // fallback, not a failure — an older build script should not break a build.
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const parsed = rows.map((row, i) => {
    const result = journeyStopSchema.safeParse(row);

    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid journey stop from content/snapshot.json (stop ${i + 1})\n${detail}`);
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
  }));

  const degree: JourneyEntry = {
    kind: 'education',
    title: education.degree,
    organisation: education.school,
    location: education.location,
    period: String(education.year),
    phase: null,
    learned: null,
  };

  // The degree opens the run: chronologically it overlaps the first job, but
  // it is where the story starts.
  return [degree, ...[...roles].reverse()];
}

let cache: JourneyEntry[] | null = null;

export function getJourney(): JourneyEntry[] {
  if (!cache) cache = fromSnapshot() ?? fromSiteContent();
  return cache;
}

/** Just the jobs — for "N companies" counts, which a degree is not. */
export function getRoles(): JourneyEntry[] {
  return getJourney().filter((stop) => stop.kind === 'work');
}
