import Link from 'next/link';
import { site } from '@/content/site';

/**
 * Closes every page. Keeps contact one tap away — docs/03-APPFLOW.md §2.
 * The phone number is deliberately absent: /contact only.
 *
 * The "More" column exists because this is the last thing on the page —
 * Work and About are one tap away for anyone who has read this far without
 * clicking into either, rather than leaving the closing screen a dead end
 * with only a mailto link out.
 */
export function ContactBand() {
  return (
    <section className="contact-band">
      <div className="wrap contact-band__grid">
        <div className="contact-band__main">
          <p className="label">Contact</p>
          <h2 style={{ marginTop: '14px' }}>
            Stop fighting your software. Let&rsquo;s make it work for you.
          </h2>
          <p className="prose-body" style={{ marginTop: '18px' }}>
            Based in {site.location}, providing seamless{' '}
            <b>ERP, automation, and integration solutions</b> that help mid-sized{' '}
            <b>UK & US businesses</b> scale smoothly, eliminate manual data entry, and cut
            operational costs.
          </p>
          <p style={{ marginTop: '26px', display: 'flex', gap: '26px', flexWrap: 'wrap' }}>
            <Link className="button" href="/contact">
              <span className="cta-dot" aria-hidden="true" />
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

        <nav className="contact-band__more" aria-label="More pages">
          <p className="label">Keep exploring</p>
          <ul>
            <li>
              <Link href="/work">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M3 7a2 2 0 0 1 2-2h3.5l1.5 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                All work
              </Link>
            </li>
            <li>
              <Link href="/about">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle
                    cx="12"
                    cy="8"
                    r="3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4.5 20c0-3.87 3.36-7 7.5-7s7.5 3.13 7.5 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                About
              </Link>
            </li>
            <li>
              <a href={site.links.github} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.292-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                  />
                </svg>
                GitHub
              </a>
            </li>
            {/* Added once the real profile URL arrived (2026-09-20). The
                phone and WhatsApp stay off this band — /contact only. */}
            <li>
              <a href={site.links.linkedin} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4v11H3v-11Zm6.5 0h3.8v1.5a4.2 4.2 0 0 1 3.8-2c3 0 4.4 1.8 4.4 5.1v6.4h-4v-5.7c0-1.6-.6-2.5-1.9-2.5-1.1 0-1.9.7-2.2 1.7v6.5h-4v-11Z"
                  />
                </svg>
                LinkedIn
              </a>
            </li>
          </ul>
        </nav>
      </div>

      {/*
        The closing line. Sits outside the two-column grid above so it spans
        the full measure rather than becoming a third column, and reads as
        the end of the page rather than as more content.
      */}
      <div className="wrap contact-band__meta">
        <small>© 2026 {site.name} Roma</small>
        <small>{site.location}</small>
      </div>
    </section>
  );
}
