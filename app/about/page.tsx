import type { Metadata } from 'next';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { BackLink } from '@/components/ui/BackLink';
import { site, skillGroups } from '@/content/site';
import { getJourney, getRoles } from '@/lib/journey';
import { getProfile } from '@/lib/profile';

export const metadata: Metadata = {
  title: 'About',
  description: site.positioning.slice(0, 155),
};

export default function AboutPage() {
  /*
   * The journey, from the admin when there is one and from content/site.ts
   * when there is not — lib/journey.ts decides. It arrives oldest first,
   * which is the order the home page's timeline walks; a CV reads the other
   * way, so this page reverses it and takes the current post off the end.
   */
  const profile = getProfile();
  const roles = getRoles();
  const newestFirst = [...roles].reverse();
  const current = newestFirst[0];
  const degree = getJourney().find((stop) => stop.kind === 'education');

  return (
    <>
      <SiteHeader current="/about" />
      <main id="content">
        <div className="wrap">
          <BackLink />
          <h1 className="section-label">About</h1>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1.375rem, 2.6vw, 1.875rem)',
              fontWeight: 400,
              lineHeight: 1.35,
              maxWidth: '13em',
            }}
          >
            {profile.intro.join(' ')}
          </p>

          <div className="prose-body" style={{ paddingTop: '34px' }}>
            <p>{profile.positioning}</p>
          </div>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Current role</h2>
            <p className="prose-body">
              {current.title}, {current.organisation}, {current.location}, {current.period}.
            </p>
          </section>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Experience</h2>
            <ul>
              {newestFirst.map((job) => (
                <li
                  key={`${job.organisation}-${job.period}`}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '22px',
                    padding: '20px 0',
                    borderTop: '1px solid var(--color-rule)',
                    fontSize: 'var(--text-body)',
                  }}
                >
                  <span style={{ width: '220px', flex: 'none', color: 'var(--color-faint)' }}>
                    {job.period}
                  </span>
                  <span style={{ flex: '1 1 260px' }}>
                    <strong style={{ fontWeight: 500 }}>{job.title}</strong>
                    <span style={{ display: 'block', color: 'var(--color-muted)' }}>
                      {job.organisation}, {job.location}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Skills</h2>
            <dl style={{ display: 'grid', gap: '22px' }}>
              {skillGroups.map((group) => (
                <div
                  key={group.label}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '22px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--color-rule)',
                  }}
                >
                  <dt
                    style={{
                      width: '220px',
                      flex: 'none',
                      fontSize: 'var(--text-body)',
                      fontWeight: 500,
                    }}
                  >
                    {group.label}
                  </dt>
                  <dd
                    style={{
                      flex: '1 1 260px',
                      fontSize: 'var(--text-body)',
                      color: 'var(--color-muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    {group.items.join(', ')}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {degree && (
            <section className="detail-section" style={{ paddingTop: '64px' }}>
              <h2>Education</h2>
              <p className="prose-body">
                {degree.title}, {degree.organisation}, {degree.location}, {degree.period}.
              </p>
            </section>
          )}

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Languages</h2>
            <p className="prose-body">{profile.languages.join(', ')}.</p>
          </section>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Availability</h2>
            <p className="prose-body">
              Based in {profile.location}, available {profile.availability}.
            </p>
          </section>
        </div>
        <ContactBand />
      </main>
    </>
  );
}
