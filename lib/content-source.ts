import fs from 'node:fs';
import path from 'node:path';

/**
 * The one place the site gets content from.
 *
 * Both halves of the payload — `projects` and `site` — used to be loaded
 * separately, and only one of them was wired to the API. Editing a project
 * appeared immediately; editing a name or a role did not, because that path
 * read `content/snapshot.json` off disk and that file is only rewritten during
 * a build. Same admin, same save, two different behaviours, and no way to guess
 * which you were getting.
 *
 * Order of preference, unchanged from docs/08-BACKEND.md §2:
 *
 *   1. the Laravel API, through Next's data cache
 *   2. content/snapshot.json, written by scripts/pull-content.mjs
 *
 * In production the response is cached under CONTENT_TAG and never expires on
 * its own, so a page render never waits on the API; `revalidateTag` is the only
 * thing that refreshes it. In development the cache is off, so a save in the
 * admin shows on the next request.
 */

/** The cache tag /api/revalidate invalidates to pull fresh content. */
export const CONTENT_TAG = 'content';

const SNAPSHOT = path.join(process.cwd(), 'content', 'snapshot.json');

export interface ContentPayload {
  generated_at?: string;
  site?: unknown;
  projects?: unknown[];
}

async function readApi(): Promise<ContentPayload | null> {
  const base = process.env.PORTFOLIO_API_URL?.trim().replace(/\/+$/, '');
  const token = process.env.PORTFOLIO_API_TOKEN?.trim();

  if (!base || !token) return null;

  try {
    const response = await fetch(`${base}/api/v1/content`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      next:
        process.env.NODE_ENV === 'production'
          ? { tags: [CONTENT_TAG], revalidate: false }
          : { revalidate: 0 },
    });

    if (!response.ok) {
      console.warn(`[content] API returned ${response.status}; falling back.`);
      return null;
    }

    return (await response.json()) as ContentPayload;
  } catch (error) {
    console.warn(`[content] API unreachable: ${(error as Error).message}; falling back.`);
    return null;
  }
}

function readSnapshot(): ContentPayload | null {
  if (!fs.existsSync(SNAPSHOT)) return null;

  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')) as ContentPayload;
  } catch (error) {
    throw new Error(
      `content/snapshot.json exists but could not be read: ${(error as Error).message}`,
    );
  }
}

/**
 * Deduplicates the fetch within a single render pass.
 *
 * A page asks for projects and for the profile, and its metadata and OG image
 * ask again — without this each would be its own request. Next's data cache
 * handles it across requests; this handles it within one. It holds the promise
 * rather than the result, so concurrent callers share one request.
 */
let inFlight: Promise<ContentPayload | null> | null = null;

export function clearContentCache(): void {
  inFlight = null;
}

export async function readContentPayload(): Promise<ContentPayload | null> {
  // No process-level cache in development: a save in the admin must show on the
  // next request without restarting anything.
  if (process.env.NODE_ENV !== 'production') {
    return (await readApi()) ?? readSnapshot();
  }

  if (!inFlight) {
    inFlight = (async () => (await readApi()) ?? readSnapshot())().catch((error) => {
      // A failed read must not be cached, or one bad response poisons every
      // later request until the process restarts.
      inFlight = null;
      throw error;
    });
  }

  return inFlight;
}
