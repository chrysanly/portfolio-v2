import Link from 'next/link';
import { site } from '@/content/site';
import { HowItWorksButton } from './HowItWorksButton';
import { ThemeToggle } from './ThemeToggle';

const LETTERS = site.name.toUpperCase().split('');

const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * The masthead's destination. Server-rendered on every route so the resolved
 * state exists in HTML; on the home route the hero hides it until handoff.
 * `id="logo"` is the measurement target for MastheadHero.
 */
/**
 * `minimal` strips the nav down to the wordmark and the theme toggle. The home
 * route uses it: it is a single narrative that already carries its own links —
 * the work index, "All work", and the contact band closing the page — so a nav
 * bar there is furniture.
 *
 * Every other route keeps the nav. Without it there is no way back, and
 * docs/01-PRD.md F7 requires the contact path to be reachable from every
 * screen.
 */
export function SiteHeader({ current, minimal }: { current?: string; minimal?: boolean }) {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link id="logo" className="logo" href="/" aria-label={`${site.name}, home`}>
          {LETTERS.map((ch, i) => (
            <span key={i} aria-hidden="true">
              {ch}
            </span>
          ))}
        </Link>
        <div className="site-header__end">
          {minimal ? (
            // The home route's nav is the page itself, but contact still needs a
            // permanent route in once the hero has handed the masthead over —
            // reuses the same [data-hero-handoff] reveal as the logo, so it
            // appears at exactly the moment the header becomes the way around
            // the page rather than sitting on top of the hero.
            // Below 480px only "Message" shows, so the row fits a 320px
            // phone; the accessible name stays whole.
            <Link href="/contact" className="header-cta" aria-label="Send a message">
              <span className="cta-dot" aria-hidden="true" />
              <span className="cta__long">Send a message</span>
              <span className="cta__short" aria-hidden="true">
                Message
              </span>
            </Link>
          ) : (
            <nav className="site-nav" aria-label="Main">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current === item.href ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
          <HowItWorksButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
