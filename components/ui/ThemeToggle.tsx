'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Theme toggle — docs/02-TRD.md §2 names this as one of the few client
 * components the site is allowed.
 *
 * The applied theme is set by a blocking script in the document head, so the
 * first paint is already correct and there is no flash. This component only
 * reflects that state and lets the visitor change it. With JavaScript off the
 * button never renders and the site stays in its light default, which is the
 * palette docs/04-UIUX-BRIEF.md §2 specifies.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private mode or blocked storage: the choice simply will not persist.
    }
  }

  // Nothing is rendered until the applied theme is known, so the button never
  // claims the wrong state during hydration.
  if (theme === null) return null;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
      aria-label="Dark theme"
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="theme-toggle__dot" aria-hidden="true" />
      <span className="theme-toggle__text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
