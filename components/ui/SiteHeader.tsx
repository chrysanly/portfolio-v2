import Link from 'next/link';
import { site } from '@/content/site';
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
          {minimal ? null : (
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
