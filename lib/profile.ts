import { readContentPayload } from './content-source';
import { profileSchema } from './schema';

/**
 * Who the site says he is, from the API's `site` key — the profile row edited
 * in the admin. There is no fallback: a missing or malformed profile throws,
 * like every other content read (lib/content-source.ts).
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
  /**
   * The downloadable CV, or null when none has been uploaded.
   *
   * Only ever the backend's copy. `docs/resume.pdf` in this repo carries a
   * date of birth and a civil status, so rule 2 of CLAUDE.md bars it from
   * being served; the file behind this URL is whatever Chrys uploads in the
   * admin, which is also how he replaces it without a deploy.
   */
  cv: { url: string; updatedAt: string | null; label: string | null } | null;
  /** Null when the admin leaves the link empty; the UI then omits it. */
  links: { github: string | null; linkedin: string | null };
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

export async function getProfile(): Promise<Profile> {
  const payload = await readContentPayload();
  const parsed = profileSchema.safeParse(payload.site);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid site profile from the API\n${detail}`);
  }

  const api = parsed.data;

  return {
    ...api,
    availability: api.availability ?? '',
    portrait: api.portrait ?? null,
    cv: api.cv
      ? { url: api.cv.url, updatedAt: api.cv.updatedAt ?? null, label: api.cv.label ?? null }
      : null,
    links: { github: api.links.github ?? null, linkedin: api.links.linkedin ?? null },
  };
}
