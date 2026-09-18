import { site } from '@/content/site';

/**
 * The resolved state (stage C), rendered in HTML on the server.
 * This is what a visitor gets with JavaScript off or reduced motion set.
 * MastheadHero enhances it; it never replaces it.
 */
export function StaticIntro() {
  return (
    <div className="wrap static-intro">
      <h1>{site.intro.join(' ')}</h1>
      <dl className="meta-row">
        <div>
          <dt>
            <strong>Discipline</strong>
          </dt>
          <dd>{site.meta.discipline}</dd>
        </div>
        <div>
          <dt>
            <strong>Principal stack</strong>
          </dt>
          <dd>{site.meta.principalStack}</dd>
        </div>
        <div>
          <dt>
            <strong>Experience</strong>
          </dt>
          <dd>
            {site.yearsExperience} years, {site.location} — available {site.availability}
          </dd>
        </div>
      </dl>
    </div>
  );
}
