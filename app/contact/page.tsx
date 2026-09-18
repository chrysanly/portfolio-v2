import type { Metadata } from 'next';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactForm } from '@/components/ui/ContactForm';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Get in touch with ${site.name}, ${site.role} in ${site.location}.`,
};

/** The only route on which the phone number appears — docs/07-SOURCE-CONTENT.md §1. */
export default function ContactPage() {
  return (
    <>
      <SiteHeader current="/contact" />
      <main id="content">
        <div className="wrap">
          <h1 className="section-label">Contact</h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1.375rem, 2.6vw, 1.875rem)',
              lineHeight: 1.35,
              maxWidth: '12em',
            }}
          >
            Tell me what you are trying to build or fix.
          </p>

          <div style={{ paddingTop: '44px' }}>
            <ContactForm email={site.email} />
          </div>

          <section className="detail-section" style={{ paddingTop: '64px' }}>
            <h2>Direct</h2>
            <ul style={{ display: 'grid', gap: '10px', fontSize: 'var(--text-body)' }}>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
              </li>
              <li style={{ color: 'var(--color-muted)' }}>{site.location}</li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
