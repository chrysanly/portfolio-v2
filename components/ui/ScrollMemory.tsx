'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

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
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
