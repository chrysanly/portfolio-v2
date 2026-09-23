'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * A short veil over navigations and over the contact form's submit.
 *
 * Chrys's complaint was exact: "it looks like nothing happened when I click
 * something." On a static site a route change is fast but not instant, and
 * between the click and the new paint there is no feedback at all — which reads
 * as a dead button, and the usual response is to click again.
 *
 * It borrows the opening splash's language deliberately, so a navigation feels
 * like the same site rather than a different effect. It is much quicker, and it
 * is capped three ways: it hides when the path changes, it hides on an explicit
 * done event, and it hides after MAX_MS whatever happens. A veil that can
 * strand a visitor behind it would be far worse than no veil.
 */

/** Long enough to register, short enough not to be in the way. */
const MIN_MS = 260;
const MAX_MS = 1400;

export function showVeil() {
  window.dispatchEvent(new CustomEvent('route:veil'));
}

export function hideVeil() {
  window.dispatchEvent(new CustomEvent('route:veil-done'));
}

export function RouteVeil() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  /*
   * A ref as well as state, so the listeners below can be attached once.
   * They used to be re-attached on every change of `visible`, and that
   * effect's cleanup cleared the timers — including the MAX_MS backstop, the
   * one thing that was never supposed to be cancelled. After a browser Back
   * the route has already changed by the time `popstate` shows the veil, so
   * the arrival effect never fired again and, with the backstop gone, the veil
   * stayed up for good over the held masthead (Chrys, 2026-09-23).
   */
  const visibleRef = useRef(false);
  const shownAt = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };

    const setShown = (on: boolean) => {
      visibleRef.current = on;
      setVisible(on);
    };

    const show = () => {
      if (visibleRef.current) return;
      shownAt.current = performance.now();
      setShown(true);
      // The backstop. Nothing below is allowed to be the only way out.
      timers.current.push(window.setTimeout(() => setShown(false), MAX_MS));
    };

    const hide = () => {
      const shown = performance.now() - shownAt.current;
      clearTimers();
      // Held to a minimum so a fast navigation flashes rather than strobes.
      timers.current.push(
        window.setTimeout(() => setShown(false), Math.max(0, MIN_MS - shown)),
      );
    };

    /*
     * Coming back through history repaints without a click we ever saw, and
     * the route may already have changed by now — so the arrival effect
     * below cannot be relied on to end it. Two frames is a painted page.
     */
    const onPopState = () => {
      show();
      requestAnimationFrame(() => requestAnimationFrame(hide));
    };

    /*
     * Clicks are caught on the document rather than wired into every link.
     * Capture phase, so a component that calls preventDefault on its own click
     * — the Back control does — is still seen here first.
     */
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page: nothing is going to load, so nothing should be veiled.
      if (url.pathname === window.location.pathname) return;

      show();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('route:veil', show);
    window.addEventListener('route:veil-done', hide);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('route:veil', show);
      window.removeEventListener('route:veil-done', hide);
      window.removeEventListener('popstate', onPopState);
      clearTimers();
    };
  }, []);

  // The new route has painted; the veil has done its job.
  useEffect(() => {
    if (!visibleRef.current) return;
    const shown = performance.now() - shownAt.current;
    const t = window.setTimeout(
      () => {
        visibleRef.current = false;
        setVisible(false);
      },
      Math.max(0, MIN_MS - shown),
    );
    return () => window.clearTimeout(t);
    // Keyed on pathname alone: this is what "arrived" means.
  }, [pathname]);

  return (
    <div className="veil" data-on={visible ? 'true' : undefined} aria-hidden="true">
      <div className="veil__mark">
        {'CHRYS'.split('').map((letter, i) => (
          <span key={letter + i} style={{ animationDelay: `${i * 45}ms` }}>
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
