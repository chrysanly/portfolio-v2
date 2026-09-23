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

  /*
   * True from the moment a navigation starts until the new route has
   * mounted, and the scroll listener writes nothing while it is.
   *
   * Between those two moments the old page is torn down, the document
   * collapses, the browser clamps the scroll to 0 — and `pathRef` still names
   * the page being left, so that 0 overwrote its real position. Measured: 725
   * (the first showcase panel) became 0 before the project page had painted,
   * and Back landed on the held masthead instead (Chrys, 2026-09-23). The
   * position is written once, at click time, instead.
   */
  const leaving = useRef(false);
  const leavingTimer = useRef(0);

  useEffect(() => {
    const freeze = () => {
      leaving.current = true;
      // A navigation that never lands (an error, a cancelled load) must not
      // leave the memory frozen for the rest of the visit.
      window.clearTimeout(leavingTimer.current);
      leavingTimer.current = window.setTimeout(() => {
        leaving.current = false;
      }, 3000);
    };

    const onPopState = () => {
      isBack.current = true;
      freeze();
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

      // Only a click that navigates this tab freezes the memory; a new tab
      // or a modified click leaves this page where it is.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (anchor?.target && anchor.target !== '_self') return;
      try {
        sessionStorage.setItem(key(window.location.pathname), String(window.scrollY));
      } catch {
        // Nothing to restore, nothing lost.
      }
      freeze();
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onLinkClick, true);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onLinkClick, true);
      window.clearTimeout(leavingTimer.current);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        if (leaving.current) return;
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
    // The new page is mounted and `pathRef` names it, so the scrolls below
    // are recorded against the right page.
    leaving.current = false;
    window.clearTimeout(leavingTimer.current);

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
