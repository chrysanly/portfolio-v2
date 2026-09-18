import type { Metadata } from 'next';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { education, employment, languages, site, skillGroups } from '@/content/site';

export const metadata: Metadata = {
  title: 'About',
  description: site.positioning.slice(0, 155),
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader current="/about" />
      <main id="content">
        <div className="wrap">
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
            {site.intro.join(' ')}
          </p>

          <div className="prose-body" style={{ paddingTop: '34px' }}>
            <p>{site.positioning}</p>
          </div>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Current role</h2>
            <p className="prose-body">
              {employment[0].role}, {employment[0].company}, {employment[0].location},{' '}
              {employment[0].period}.
            </p>
          </section>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Experience</h2>
            <ul>
              {employment.map((job) => (
                <li
                  key={`${job.company}-${job.period}`}
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
                    <strong style={{ fontWeight: 500 }}>{job.role}</strong>
                    <span style={{ display: 'block', color: 'var(--color-muted)' }}>
                      {job.company}, {job.location}
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

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Education</h2>
            <p className="prose-body">
              {education.degree}, {education.school}, {education.location}, {education.year}.
            </p>
          </section>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Languages</h2>
            <p className="prose-body">{languages.join(', ')}.</p>
          </section>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Availability</h2>
            <p className="prose-body">
              Based in {site.location}, available {site.availability}.
            </p>
          </section>
        </div>
        <ContactBand />
      </main>
    </>
  );
}
