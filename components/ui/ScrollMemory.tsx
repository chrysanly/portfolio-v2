'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { rememberPreviousPath } from '@/lib/nav';

/**
 * Restores scroll position on Back/Forward; a fresh visit or a forward
 * `<Link>` still starts at the top.
 *
 * `history.scrollRestoration` is forced to 'manual' for the whole site
 * (see layout.tsx) so a refresh never resumes mid pinned-hero — but that
 * also silences the browser's own Back restoration, which used to leave
 * every return trip at the top of the page. This fills the gap by hand:
 * the scroll position is written to `sessionStorage` under its pathname on
 * every scroll, and a `popstate` (the only signal that distinguishes Back
 * from a forward navigation) reads it back once the new route has painted.
 *
 * It also keeps the session's navigation trail (`lib/nav.ts`), which the Back
 * control reads to know whether it has anywhere to go back to. Same event,
 * same bookkeeping — a second component listening to the same clicks and the
 * same route changes would only be a second thing to keep in step.
 */
const key = (pathname: string) => `scrollY:${pathname}`;

export function ScrollMemory() {
  const pathname = usePathname();
  const isBack = useRef(false);
  const pathRef = useRef(pathname);

  useEffect(() => {
    const onPopState = () => {
      isBack.current = true;
    };

    /*
     * Where the visitor is leaving from, written at click time rather than
     * once the route has changed.
     *
     * The transition effect below knows the same thing, but it runs too late
     * to be read: effects fire child-first, so the Back control on the page
     * being *entered* has already made its decision by then and every one of
     * them read an empty trail and rendered Home. Capture phase, before the
     * router sees the click, is early enough for everybody.
     */
    const onLinkClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      const href = anchor?.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      if (new URL(href, window.location.href).pathname === window.location.pathname) return;
      rememberPreviousPath(window.location.pathname);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onLinkClick, true);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onLinkClick, true);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(key(pathRef.current), String(window.scrollY));
        } catch {
          // Private mode / storage disabled: nothing to restore, nothing lost.
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (pathRef.current === pathname) return;
    const back = isBack.current;
    // A backstop for a navigation with no click behind it — `router.push`
    // from code. Too late for the page being entered (see the click listener
    // above), in time for the one after it.
    rememberPreviousPath(pathRef.current);
    pathRef.current = pathname;
    isBack.current = false;

    if (!back) {
      window.scrollTo(0, 0);
      return;
    }

    let y = 0;
    try {
      y = Number(sessionStorage.getItem(key(pathname))) || 0;
    } catch {
      y = 0;
    }

    // Pinned sections (the hero, the showcase) finish measuring their real
    // height a frame or two after the route paints; landing before that
    // clamps the restore to whatever height the page happened to have yet.
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  }, [pathname]);

  return null;
}
