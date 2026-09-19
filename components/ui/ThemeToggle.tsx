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
    const applied = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(applied);
  }, []);

  function toggle() {
    const target: Theme = theme === 'dark' ? 'light' : 'dark';

    const apply = () => {
      setTheme(target);
      document.documentElement.dataset.theme = target;
    };

    try {
      localStorage.setItem('theme', target);
    } catch {
      // Private mode or blocked storage: the choice simply will not persist.
    }

    /*
     * Swapping the palette changes eight custom properties on :root, which
     * invalidates style for the whole document — every rule, the two grain
     * layers, the atmosphere and the masthead all repaint in one frame, and on
     * this page that is long enough to see.
     *
     * A view transition hands that to the compositor instead: the browser
     * snapshots the old frame, applies the change while nothing is on screen,
     * and crossfades two bitmaps. The repaint still happens, but it happens
     * behind a still image rather than in front of the visitor.
     *
     * Where the API is missing the swap is simply instant, which is the right
     * fallback — an instant change is not laggy, it is just abrupt.
     */
    const start = (
      document as Document & {
        startViewTransition?: (cb: () => void) => unknown;
      }
    ).startViewTransition;

    if (!start || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply();
      return;
    }
    start.call(document, apply);
  }

  // Nothing is rendered until the applied theme is known, so the button never
  // claims the wrong state during hydration.
  if (theme === null) return null;

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Dark' : 'Light';

  /*
   * Sun and moon, drawn inline — docs/02-TRD.md §1 allows no icon package. Both
   * glyphs stay in the DOM and crossfade, so the header never reflows on a
   * swap. The visible word stays too: an icon-only control gives voice control
   * nothing to say, and the accessible name has to contain the visible text or
   * "click Light" fails.
   */
  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-next={next}
      onClick={toggle}
      aria-label={`${label} theme`}
    >
      <span className="theme-toggle__glyphs" aria-hidden="true">
        <svg className="theme-toggle__sun" viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="4.4" />
          <g strokeLinecap="round">
            <path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
          </g>
        </svg>
        <svg className="theme-toggle__moon" viewBox="0 0 24 24" focusable="false">
          <path d="M20.7 14.6A9 9 0 1 1 9.4 3.3a7.2 7.2 0 0 0 11.3 11.3Z" />
        </svg>
      </span>
      <span className="theme-toggle__text">{label}</span>
    </button>
  );
}
