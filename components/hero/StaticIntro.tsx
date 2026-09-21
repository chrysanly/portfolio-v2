import { getProfile } from '@/lib/profile';

/**
 * The resolved state (stage C), rendered in HTML on the server.
 * This is what a visitor gets with JavaScript off or reduced motion set.
 * MastheadHero enhances it; it never replaces it.
 */
export async function StaticIntro() {
  const profile = await getProfile();

  return (
    <div className="wrap static-intro">
      <h1>{profile.intro.join(' ')}</h1>
      <dl className="meta-row">
        <div>
          <dt>
            <strong>Discipline</strong>
          </dt>
          <dd>{profile.meta.discipline}</dd>
        </div>
        <div>
          <dt>
            <strong>Principal stack</strong>
          </dt>
          <dd>{profile.meta.principalStack}</dd>
        </div>
        <div>
          <dt>
            <strong>Experience</strong>
          </dt>
          <dd>
            {profile.yearsExperience} years, {profile.location} — available {profile.availability}
          </dd>
        </div>
      </dl>
    </div>
  );
}
