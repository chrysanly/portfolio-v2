import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAllProjects } from '../lib/projects';
import { getProfile } from '../lib/profile';
import { getJourney } from '../lib/journey';
import { configureApi, json, mockFetch, payload, project, site, stop } from './fixtures';

const realFetch = globalThis.fetch;

/** Serves one payload for the duration of a test. */
const serve = (body: unknown) => mockFetch(() => json(body));

describe('content from the API', () => {
  beforeEach(configureApi);

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  describe('projects', () => {
    it('validates and sorts by order', async () => {
      serve(
        payload({
          projects: [
            project({ slug: 'second', order: 2 }),
            project({ slug: 'first', order: 1 }),
          ],
        }),
      );

      const projects = await getAllProjects();

      assert.deepEqual(
        projects.map((p) => p.slug),
        ['first', 'second'],
      );
      assert.equal(projects[0].problem, 'Operations spread across layers.');
    });

    it('fails on a confidential project that names its client — the NDA guard', async () => {
      serve(payload({ projects: [project({ client: 'Acme Corp' })] }));

      await assert.rejects(getAllProjects(), /confidential: true requires client: null/);
    });

    it('fails on a duplicate slug', async () => {
      serve(payload({ projects: [project({ order: 1 }), project({ order: 2 })] }));

      await assert.rejects(getAllProjects(), /Duplicate project slug/);
    });

    it('keeps placeholders exactly as written', async () => {
      serve(payload());

      const [first] = await getAllProjects();

      assert.equal(first.outcome.value, '[METRIC]');
      assert.equal(first.outcome.label, '[what it improved]');
    });

    it('carries the nda flag and the kind the API sends', async () => {
      serve(
        payload({
          projects: [
            project({
              images: [
                {
                  src: 'https://res.example/v.mp4',
                  alt: 'A walkthrough',
                  kind: 'video',
                  nda: true,
                  device: 'laptop',
                },
              ],
            }),
          ],
        }),
      );

      const [first] = await getAllProjects();

      assert.equal(first.images[0].nda, true);
      assert.equal(first.images[0].kind, 'video');
    });
  });

  describe('profile', () => {
    it('reads the profile from the API', async () => {
      serve(payload());

      const profile = await getProfile();

      assert.equal(profile.fullName, 'Chrysanly John Corpuz Roma');
      assert.equal(profile.links.linkedin, null);
      assert.equal(profile.cv, null);
    });

    it('fails on a profile missing a required field, rather than falling back', async () => {
      const { fullName: _removed, ...partial } = site();
      void _removed;
      serve(payload({ site: partial }));

      await assert.rejects(getProfile(), /Invalid site profile from the API[\s\S]*fullName/);
    });

    it('never carries a phone number, date of birth or civil status', async () => {
      serve(
        payload({
          site: site({
            phone: '+971 00 000 0000',
            dateOfBirth: '1990-01-01',
            civilStatus: 'x',
          }),
        }),
      );

      const profile = (await getProfile()) as unknown as Record<string, unknown>;

      assert.equal('phone' in profile, false);
      assert.equal('dateOfBirth' in profile, false);
      assert.equal('civilStatus' in profile, false);
    });
  });

  describe('journey', () => {
    it('returns the stops oldest first, without the order field', async () => {
      serve(
        payload({
          journey: [
            stop({ title: 'Later', order: 2 }),
            stop({ title: 'Earlier', order: 1, kind: 'education' }),
          ],
        }),
      );

      const journey = await getJourney();

      assert.deepEqual(
        journey.map((s) => s.title),
        ['Earlier', 'Later'],
      );
      assert.equal('order' in journey[0], false);
    });

    it('fails on a malformed stop', async () => {
      serve(payload({ journey: [stop({ kind: 'hobby' })] }));

      await assert.rejects(getJourney(), /Invalid journey stop from the API \(stop 1\)/);
    });
  });
});
