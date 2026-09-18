import Link from 'next/link';
import { site } from '@/content/site';

/**
 * Closes every page. Keeps contact one tap away — docs/03-APPFLOW.md §2.
 * The phone number is deliberately absent: /contact only.
 */
export function ContactBand() {
  return (
    <section className="contact-band">
      <div className="wrap">
        <p className="label">Contact</p>
        <h2 style={{ marginTop: '14px' }}>
          Have a system that needs building, or one that needs fixing?
        </h2>
        <p className="prose-body" style={{ marginTop: '18px' }}>
          Based in {site.location}. Working with small and mid-sized companies on ERP,
          automation and integration work.
        </p>
        <p style={{ marginTop: '26px', display: 'flex', gap: '26px', flexWrap: 'wrap' }}>
          <Link className="button" href="/contact">
            Send a message
          </Link>
          <a
            href={`mailto:${site.email}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: '44px',
              fontSize: 'var(--text-body)',
            }}
          >
            {site.email}
          </a>
        </p>
      </div>
    </section>
  );
}
