import { type JourneyStopData, journeyStopSchema } from './schema';
import { readContentPayload } from './content-source';

/**
 * The career timeline, from the API's `journey` key — edited in the admin.
 * There is no fallback: a malformed stop throws, like every other content
 * read (lib/content-source.ts). An empty list is a valid state.
 *
 * Returned oldest first — the order the site walks a career, rather than the
 * CV's newest-first.
 */
export interface JourneyEntry {
  kind: 'work' | 'education';
  title: string;
  organisation: string;
  location: string;
  period: string;
  phase: string | null;
  /** HTML from the admin's TipTap field; older rows may hold plain text. */
  learned: string | null;
  /**
   * Slugs of the projects built at this stop, as the backend states them.
   * Empty when nothing is attached — the timeline then falls back to matching
   * a project's role against the title.
   */
  projects: string[];
}

export async function getJourney(): Promise<JourneyEntry[]> {
  const payload = await readContentPayload();
  const rows = payload.journey ?? [];

  const parsed = rows.map((row, i) => {
    const result = journeyStopSchema.safeParse(row);

    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid journey stop from the API (stop ${i + 1})\n${detail}`);
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

/** Just the jobs — for "N companies" counts, which a degree is not. */
export async function getRoles(): Promise<JourneyEntry[]> {
  return (await getJourney()).filter((stop) => stop.kind === 'work');
}
