import path from 'node:path';
import { languages as fallbackLanguages, site } from '@/content/site';
import { readContentPayload } from './content-source';
import { profileSchema } from './schema';


/**
 * Who the site says he is, from the same two sources as everything else and
 * in the same order of preference — docs/08-BACKEND.md §2.
 *
 *  1. `content/snapshot.json`'s `site` key, written from the Laravel admin.
 *  2. `content/site.ts`, the hardcoded copy the site shipped with.
 *
 * Merged rather than chosen between: the API's payload is a superset that
 * grew over time, so an older snapshot may carry six keys where the current
 * one carries fifteen. Anything absent falls through to the file, which
 * means a stale snapshot degrades field by field instead of all at once.
 *
 * The phone number never comes from the API — docs/07-SOURCE-CONTENT.md §1
 * keeps it off every payload — so it is read from `content/site.ts` alone
 * and rendered only on /contact.
 */
export interface Profile {
  name: string;
  fullName: string;
  role: string;
  location: string;
  yearsExperience: string;
  availability: string;
  email: string;
  languages: readonly string[];
  portrait: string | null;
  links: { github: string; linkedin: string };
  intro: readonly string[];
  notes: readonly string[];
  positioning: string;
  meta: {
    discipline: string;
    architecture: string;
    principalStack: string;
    databases: string;
    security: string;
    currentRole: string;
  };
}

async function fromApi() {
  const payload = await readContentPayload();
  const raw = payload?.site;

  if (!raw || typeof raw !== 'object') return null;

  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid site profile from the content source\n${detail}`);
  }

  return parsed.data;
}

/**
 * This used to read `content/snapshot.json` straight off disk. That file is
 * only rewritten by `scripts/pull-content.mjs` during a build, so changing a
 * name or a role in the admin genuinely did require a rebuild before it
 * appeared — while a project edit showed up immediately. Same admin, same
 * save, two different behaviours. Both go through one loader now.
 */
let cache: Profile | null = null;

export function clearProfileCache(): void {
  cache = null;
}

export async function getProfile(): Promise<Profile> {
  // Cached for the life of the process only in production; in development a
  // save must show on the next request.
  if (cache && process.env.NODE_ENV === 'production') return cache;

  const api = await fromApi();

  const profile: Profile = {
    name: api?.name ?? site.name,
    fullName: api?.fullName ?? site.fullName,
    role: api?.role ?? site.role,
    location: api?.location ?? site.location,
    yearsExperience: api?.yearsExperience ?? site.yearsExperience,
    availability: api?.availability ?? site.availability,
    email: api?.email ?? site.email,
    languages: api?.languages ?? fallbackLanguages,
    portrait: api?.portrait !== undefined ? api.portrait : site.portrait,
    links: {
      github: api?.links?.github ?? site.links.github,
      linkedin: api?.links?.linkedin ?? site.links.linkedin,
    },
    intro: api?.intro ?? site.intro,
    notes: api?.notes ?? site.notes,
    positioning: api?.positioning ?? site.positioning,
    meta: api?.meta ?? site.meta,
  };

  cache = profile;

  return profile;
}
