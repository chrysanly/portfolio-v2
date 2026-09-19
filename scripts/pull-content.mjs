/**
 * Pulls content from the Laravel API and writes content/snapshot.json.
 *
 * docs/08-BACKEND.md §2: the public site consumes the API **at build time,
 * never at runtime**. This script is that build step. It runs before `next
 * build`, so by the time a page renders, the content is already a local file
 * and there is no API in front of LCP.
 *
 * Three states, and all three are normal:
 *
 *  1. PORTFOLIO_API_URL unset  — do nothing. Local development and CI work with
 *     no backend at all, off the MDX in content/projects.
 *  2. API reachable            — fetch, write the snapshot, build from it.
 *  3. API unreachable          — warn loudly and leave the committed snapshot
 *     alone. §2 "Build resilience": a build must never fail because the backend
 *     is asleep on a free tier. The failure mode is stale content, never a
 *     broken deploy.
 *
 * The snapshot IS committed. That is what makes state 3 work, and it means the
 * exact content of any past build is in git.
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.PORTFOLIO_API_URL ?? '').trim().replace(/\/+$/, '');
const TOKEN = (process.env.PORTFOLIO_API_TOKEN ?? '').trim();
const TIMEOUT_MS = Number(process.env.PORTFOLIO_API_TIMEOUT ?? 15000);

const SNAPSHOT = path.join(process.cwd(), 'content', 'snapshot.json');

/** Prefixed so the line is findable in a Vercel build log. */
const say = (msg) => console.log(`[content] ${msg}`);
const warn = (msg) => console.warn(`[content] ${msg}`);

if (!BASE) {
  say('PORTFOLIO_API_URL is not set — building from local content. This is fine.');
  process.exit(0);
}

if (!TOKEN) {
  warn(`PORTFOLIO_API_URL is set to ${BASE} but PORTFOLIO_API_TOKEN is not.`);
  warn('The endpoint requires a token, so this would 401. Skipping the pull.');
  warn('Issue one with: php artisan portfolio:build-token --email=you@example.com');
  process.exit(0);
}

const url = `${BASE}/api/v1/content`;

/** Keeps a hung backend from hanging the whole deploy. */
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

try {
  say(`Fetching ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const payload = await response.json();

  /*
   * A shape check, not a content check. The real validation is the Zod schema
   * in lib/projects.ts, which runs at build time and fails the build on any
   * drift — that is the guarantee, and duplicating it here would mean two
   * schemas to keep in step. This only catches "the server returned a login
   * page" and similar, which would otherwise overwrite a good snapshot with
   * rubbish.
   */
  if (!payload || !Array.isArray(payload.projects)) {
    throw new Error('response had no projects array — is this really the content endpoint?');
  }

  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  say(`Wrote ${payload.projects.length} projects to content/snapshot.json`);
} catch (error) {
  const reason =
    error?.name === 'AbortError' ? `no response in ${TIMEOUT_MS}ms` : error.message;

  warn(`Could not reach the API: ${reason}`);

  if (fs.existsSync(SNAPSHOT)) {
    warn('Building from the committed snapshot instead. Content may be stale.');
  } else {
    warn('There is no committed snapshot, so this build uses the local MDX.');
  }

  // Deliberately not a failure. See the header.
} finally {
  clearTimeout(timer);
}
