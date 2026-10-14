import { cache } from 'react';

/**
 * The one place the site gets content from: the Laravel API's
 * `GET /api/v1/content`. There is no other source — no snapshot, no MDX.
 *
 * In production the response is cached in Next's data cache under CONTENT_TAG
 * and never expires on its own (`revalidate: false`), so a page render never
 * waits on the API. Saving in the admin calls /api/revalidate, which
 * invalidates the tag, and the next request regenerates from fresh content.
 * In development the cache is off, so a save shows on the next request.
 *
 * A failed read THROWS. It never returns an empty or partial payload, because
 * whatever this returns is what gets cached:
 *
 *  - at build time, the build fails with the reason, rather than deploying an
 *    empty site;
 *  - at runtime, a failed regeneration leaves Next serving the last good page,
 *    rather than caching a broken one in its place.
 */

/** The cache tag /api/revalidate invalidates to pull fresh content. */
export const CONTENT_TAG = 'content';

export interface ContentPayload {
  generated_at?: string;
  site?: unknown;
  projects?: unknown[];
  journey?: unknown[];
}

class ContentSourceError extends Error {
  constructor(message: string) {
    super(`[content] ${message}`);
    this.name = 'ContentSourceError';
  }
}

function endpoint(): { url: string; token: string } {
  const base = process.env.PORTFOLIO_API_URL?.trim().replace(/\/+$/, '');
  const token = process.env.PORTFOLIO_API_TOKEN?.trim();

  if (!base) {
    throw new ContentSourceError(
      'PORTFOLIO_API_URL is not set. The site has no other content source — set it in .env.local (or the host environment).',
    );
  }

  if (!token) {
    throw new ContentSourceError(
      'PORTFOLIO_API_TOKEN is not set. Issue one with `php artisan portfolio:build-token --email=you@example.com`.',
    );
  }

  return { url: `${base}/api/v1/content`, token };
}

function timeoutMs(): number {
  const value = Number(process.env.PORTFOLIO_API_TIMEOUT);
  return Number.isFinite(value) && value > 0 ? value : 15000;
}

async function readApi(): Promise<ContentPayload> {
  const { url, token } = endpoint();

  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs()),
      next:
        process.env.NODE_ENV === 'production'
          ? { tags: [CONTENT_TAG], revalidate: false }
          : { revalidate: 0 },
    });
  } catch (error) {
    const reason =
      (error as Error).name === 'TimeoutError'
        ? `no response in ${timeoutMs()}ms`
        : (error as Error).message;
    throw new ContentSourceError(`Could not reach ${url}: ${reason}`);
  }

  if (!response.ok) {
    throw new ContentSourceError(`${url} answered ${response.status} ${response.statusText}.`);
  }

  const payload = (await response.json().catch(() => null)) as ContentPayload | null;

  // A shape check only — the Zod schemas in lib/schema.ts are the contract.
  // This catches "the server returned a login page" and similar.
  if (!payload || !Array.isArray(payload.projects) || !payload.site) {
    throw new ContentSourceError(`${url} did not return a content payload.`);
  }

  return payload;
}

/**
 * Deduplicated per render: a page, its metadata and its OG image all ask for
 * content, and React's `cache` makes that one request. Across requests the
 * data cache above is what holds it, so there is no process-level copy to go
 * stale on one server while /api/revalidate refreshed another.
 */
export const readContentPayload = cache(readApi);
