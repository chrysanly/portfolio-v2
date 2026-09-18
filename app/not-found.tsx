import Link from 'next/link';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { site } from '@/content/site';

const LETTERS = site.name.toUpperCase().split('');

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="content">
        <div className="wrap" style={{ paddingTop: '56px' }}>
          <div
            className="masthead"
            aria-hidden="true"
            style={{ fontSize: 'clamp(64px, 12vw, 160px)' }}
          >
            {LETTERS.map((ch, i) => (
              <span key={i} aria-hidden="true">
                {ch}
              </span>
            ))}
          </div>
          <h1 className="section-label">Page not found</h1>
          <p className="prose-body">
            That page doesn&rsquo;t exist. It may have moved, or the link may be wrong.
          </p>
          <p style={{ paddingTop: '26px', display: 'flex', gap: '26px', flexWrap: 'wrap' }}>
            <Link style={{ fontSize: 'var(--text-body)' }} href="/">
              Home
            </Link>
            <Link style={{ fontSize: 'var(--text-body)' }} href="/work">
              Work
            </Link>
            <Link style={{ fontSize: 'var(--text-body)' }} href="/contact">
              Contact
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
