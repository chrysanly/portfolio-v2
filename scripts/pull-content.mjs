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

/*
 * Load .env.local, then .env, the way Next does — because this script runs
 * as bare `node` from `prebuild`, outside Next entirely, so nothing has
 * loaded them yet. Without this the credentials sit in .env.local and the
 * pull silently reports "not set" and builds from the MDX instead, which
 * looks exactly like a working build until you notice the content is stale.
 *
 * `process.loadEnvFile` is built into Node (20.12+) — no dotenv dependency,
 * per docs/02-TRD.md §1. First file wins: loadEnvFile does not overwrite a
 * variable that is already set, so a real environment variable (Vercel, CI)
 * still beats anything on disk.
 */
const caBefore = process.env.NODE_EXTRA_CA_CERTS;

for (const file of ['.env.local', '.env']) {
  const at = path.join(process.cwd(), file);
  if (!fs.existsSync(at)) continue;
  try {
    process.loadEnvFile(at);
  } catch {
    // A malformed env file is not worth failing a build over: the checks
    // below already handle "no credentials" as a normal state.
  }
}

/*
 * One exception to "an env file is as good as an environment variable":
 * NODE_EXTRA_CA_CERTS is read by Node once, while it starts, so setting it
 * from a file here is already too late and every HTTPS call still fails
 * verification. Re-running ourselves with it in place is the only way to
 * honour it without asking whoever runs `npm run build` to export it first.
 *
 * This exists for local development against Herd or Valet, which serve
 * .test domains over HTTPS with their own certificate authority. The
 * alternative — NODE_TLS_REJECT_UNAUTHORIZED=0 — turns verification off for
 * every connection the process makes, including the ones to the real
 * internet. Pointing at the one extra CA keeps it on.
 */
if (process.env.NODE_EXTRA_CA_CERTS && !caBefore) {
  const ca = process.env.NODE_EXTRA_CA_CERTS;

  if (!fs.existsSync(ca)) {
    console.warn(
      `[content] NODE_EXTRA_CA_CERTS points at ${ca}, which does not exist. Ignoring it.`,
    );
  } else {
    const { spawnSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');

    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      stdio: 'inherit',
      env: process.env,
    });

    process.exit(result.status ?? 1);
  }
}

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

/**
 * Brings the portrait into the site's own public/ directory and rewrites the
 * payload to point at the local copy.
 *
 * The API sends an absolute URL, because the admin and the site are separate
 * origins. Shipping that URL as-is would mean the published identity card
 * hot-links whatever machine the admin happens to be on — a laptop running
 * Herd, in development — and shows a broken image to everyone else. It would
 * also put a third-party request in front of an above-the-fold image.
 *
 * A failure here is not fatal: the key is dropped and the site falls back to
 * the portrait committed in content/site.ts, which is the same thing that
 * happens when the profile has no photograph at all.
 */
async function localisePortrait(payload) {
  const remote = payload?.site?.portrait;

  if (typeof remote !== 'string' || !/^https?:\/\//i.test(remote)) return;

  try {
    const response = await fetch(remote, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const type = response.headers.get('content-type') ?? '';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const bytes = Buffer.from(await response.arrayBuffer());

    /*
     * The filename carries a hash of the image, so a new photograph is a new
     * URL. A fixed name looked tidier and was wrong: the page kept pointing
     * at /portrait-api.jpg, so every cache between the file and the visitor
     * — the browser's most of all — was free to keep serving the old face
     * long after it had been replaced. Changing the name is the only way to
     * be certain, and it costs nothing.
     */
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 8);

    const file = `portrait-${hash}.${ext}`;
    const dir = path.join(process.cwd(), 'public');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file), bytes);

    // Sweep up the ones this script wrote on earlier pulls. Matched strictly,
    // so the committed fallback (public/portrait.jpg) is never touched.
    for (const old of fs.readdirSync(dir)) {
      if (old !== file && /^portrait-[0-9a-f]{8}\.(jpg|png|webp)$/.test(old)) {
        fs.rmSync(path.join(dir, old), { force: true });
      }
    }

    payload.site.portrait = `/${file}`;
    say(`Saved the portrait to public/${file}`);
  } catch (error) {
    warn(
      `Could not download the portrait (${error.message}). Using the committed one instead.`,
    );
    delete payload.site.portrait;
  }
}

/** Whether a URL points at the admin, ignoring scheme and port. */
function sameHost(candidate) {
  try {
    return new URL(candidate).hostname === new URL(BASE).hostname;
  } catch {
    return false;
  }
}

/**
 * The same treatment for project screenshots.
 *
 * Their `src` is an absolute URL on the admin's host. Left alone, every
 * screenshot on the published site is a request to that host — which on a free
 * tier is asleep most of the time, so a visitor waits 30–60 seconds for it to
 * wake, or sees nothing. It also means the images vanish whenever that host's
 * disk is wiped, which on Render is every deploy.
 *
 * Copying them into public/ makes the built site self-contained: the images
 * ship with it, served from the same CDN as everything else, and the admin
 * being down cannot break them.
 *
 * The cost is that a screenshot uploaded after a build is not on the site until
 * the next one. That is what the deploy hook is for — uploading an image
 * already asks for a rebuild.
 *
 * Anything that is not an absolute http(s) URL is left exactly as it is, so
 * placeholders (placehold.co, picsum) and already-local paths pass through.
 */
async function localiseProjectImages(payload) {
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];
  const dir = path.join(process.cwd(), 'public', 'shots');
  const kept = new Set();
  let copied = 0;
  let skipped = 0;

  const { createHash } = await import('node:crypto');

  for (const project of projects) {
    for (const image of Array.isArray(project.images) ? project.images : []) {
      const remote = image?.src;
      if (typeof remote !== 'string' || !/^https?:\/\//i.test(remote)) continue;

      /*
       * Only mirror what the admin itself is serving — a deliberate
       * third-party placeholder should stay a third-party URL.
       *
       * Compared by hostname, not by URL prefix: the admin stores absolute
       * URLs built from its own APP_URL, which is routinely http where
       * PORTFOLIO_API_URL is https. A string prefix match silently skipped
       * every real upload over that one character.
       */
      if (!sameHost(remote)) {
        skipped += 1;
        continue;
      }

      try {
        const response = await fetch(remote, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

        const type = response.headers.get('content-type') ?? '';
        const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
        const bytes = Buffer.from(await response.arrayBuffer());

        // Hashed, for the same reason as the portrait: a replaced screenshot is
        // a new URL, so no cache can keep serving the old one.
        const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 8);
        const file = `${hash}.${ext}`;

        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, file), bytes);

        image.src = `/shots/${file}`;
        kept.add(file);
        copied += 1;
      } catch (error) {
        // Left pointing at the admin. A missing screenshot is not worth
        // failing a deploy over, and the alt text still describes it.
        warn(`Could not copy ${remote} (${error.message}). Leaving the remote URL.`);
      }
    }
  }

  // Sweep files from earlier pulls that nothing points at any more.
  if (fs.existsSync(dir)) {
    for (const old of fs.readdirSync(dir)) {
      if (!kept.has(old)) fs.rmSync(path.join(dir, old), { force: true });
    }
  }

  if (copied) say(`Copied ${copied} screenshot(s) into public/shots/`);
  if (skipped) say(`${skipped} image(s) left as external URLs (not served by the admin).`);
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

  await localisePortrait(payload);
  await localiseProjectImages(payload);

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
