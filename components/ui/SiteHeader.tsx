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
export function SiteHeader({ current }: { current?: string }) {
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
