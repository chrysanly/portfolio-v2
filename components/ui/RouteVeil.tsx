'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * A veil over navigations and over the contact form's submit.
 *
 * Chrys's first complaint was "it looks like nothing happened when I click
 * something", so a click shows the veil at once. The second was the reverse:
 * "it will show the loading state and stop, then there's a delay on showing
 * the case study page". The veil used to give up after a fixed 1.4s whether
 * or not the page had arrived, and on a slower load the visitor saw the
 * loading state, then the old page again, then the new one.
 *
 * Now it waits for the route itself:
 *
 *  - a navigation only draws the veil if it is still loading after
 *    SHOW_DELAY_MS (Chrys, 2026-10-19: a loading screen on every click reads
 *    as a site with no cache). A cached page opens before that and the veil
 *    is never painted; the click itself is the feedback;
 *  - it hides when the path changes, held to MIN_MS so a fast load flashes
 *    rather than strobes, and only once the new page has painted;
 *  - after SLOW_MS it says what it is opening, so a slow load reads as
 *    loading rather than stuck;
 *  - after FAIL_MS it offers "Try again" and "Stay here" rather than holding
 *    the visitor behind it — the one way out that never depends on the page.
 *
 * The form's own show/hide events keep the short behaviour they had.
 */

const SHOW_DELAY_MS = 250;
const MIN_MS = 260;
const SLOW_MS = 1200;
const FAIL_MS = 8000;
const FILL_MS = 160;

// The bar's last fill is skipped under reduced motion: the line is static.
const fillMs = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FILL_MS;

type VeilState = 'loading' | 'error';

export function showVeil() {
  window.dispatchEvent(new CustomEvent('route:veil'));
}

export function hideVeil() {
  window.dispatchEvent(new CustomEvent('route:veil-done'));
}

export function RouteVeil() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<VeilState>('loading');
  const [slow, setSlow] = useState(false);
  const [done, setDone] = useState(false);
  const [caption, setCaption] = useState('');
  const retryRef = useRef<HTMLButtonElement>(null);

  /*
   * Refs alongside the state, so the listeners below are attached once and
   * the timers are never cleared by a re-render — the backstop must outlive
   * every change of `visible`.
   */
  const visibleRef = useRef(false);
  /** Whether the veil has actually been drawn; a fast navigation never is. */
  const paintedRef = useRef(false);
  const shownAt = useRef(0);
  const target = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };

    const paint = () => {
      paintedRef.current = true;
      shownAt.current = performance.now();
      setVisible(true);
    };

    const show = (href: string | null = null, title = '', delay = 0) => {
      if (visibleRef.current) return;
      clearTimers();
      visibleRef.current = true;
      paintedRef.current = false;
      target.current = href;
      setCaption(title ? `Opening ${title}…` : 'Opening…');
      setState('loading');
      setSlow(false);
      setDone(false);
      if (delay > 0) timers.current.push(window.setTimeout(paint, delay));
      else paint();
      timers.current.push(window.setTimeout(() => setSlow(true), SLOW_MS));

      if (href) {
        // A navigation that never arrives ends in a choice, not a stuck screen.
        timers.current.push(window.setTimeout(() => setState('error'), FAIL_MS));
      } else {
        // The form's submit has no page to wait for: the old backstop stays.
        timers.current.push(window.setTimeout(hide, FAIL_MS));
      }
    };

    const hide = () => {
      clearTimers();
      // Arrived before the delay ran out: nothing was drawn, nothing to lift.
      if (!paintedRef.current) {
        visibleRef.current = false;
        target.current = null;
        return;
      }
      const shown = performance.now() - shownAt.current;
      timers.current.push(
        window.setTimeout(
          () => {
            setDone(true);
            // Two frames: the new page has painted under the veil first. Then
            // the bar's 160ms fill to 100% is seen before the veil lifts.
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                timers.current.push(
                  window.setTimeout(() => {
                    visibleRef.current = false;
                    paintedRef.current = false;
                    target.current = null;
                    setVisible(false);
                  }, fillMs()),
                );
              }),
            );
          },
          Math.max(0, MIN_MS - shown),
        ),
      );
    };

    const onPopState = () => {
      show(null, '', SHOW_DELAY_MS);
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
      // A link that opens something in place (View CV's modal) keeps its href
      // only for no-JS and modified clicks: no route loads, so no veil.
      if (anchor.hasAttribute('data-no-veil')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page: nothing is going to load, so nothing should be veiled.
      if (url.pathname === window.location.pathname) return;

      show(url.pathname + url.search, anchor.dataset.veilTitle ?? '', SHOW_DELAY_MS);
    };

    // The form's submit has no route to beat: its veil shows at once.
    const onFormShow = () => show();

    document.addEventListener('click', onClick, true);
    window.addEventListener('route:veil', onFormShow);
    window.addEventListener('route:veil-done', hide);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('route:arrived', hide);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('route:veil', onFormShow);
      window.removeEventListener('route:veil-done', hide);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('route:arrived', hide);
      clearTimers();
    };
  }, []);

  // The choice takes focus when it appears, so the keyboard is never left
  // behind a screen it cannot see.
  useEffect(() => {
    if (state === 'error' && visible) retryRef.current?.focus();
  }, [state, visible]);

  /*
   * The new route has committed. If it is still showing its loading
   * placeholder (`data-route-loading`, see app/work/[slug]/loading.tsx), the
   * page is not here yet: keep the veil up and let the page say when it has
   * arrived (ArrivalFocus dispatches `route:arrived`). Anything else is the
   * page itself, so hand over now.
   */
  useEffect(() => {
    if (!visibleRef.current) return;
    if (document.querySelector('[data-route-loading]')) return;
    window.dispatchEvent(new CustomEvent('route:arrived'));
  }, [pathname]);

  const retry = () => {
    const href = target.current;
    if (!href) return;
    setState('loading');
    setSlow(true);
    router.push(href);
    timers.current.push(window.setTimeout(() => setState('error'), FAIL_MS));
  };

  const stay = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    visibleRef.current = false;
    paintedRef.current = false;
    target.current = null;
    setVisible(false);
  };

  return (
    <div
      className="veil"
      data-on={visible ? 'true' : undefined}
      data-state={state}
      data-slow={slow ? 'true' : undefined}
      data-done={done ? 'true' : undefined}
      aria-hidden={state === 'error' && visible ? undefined : 'true'}
    >
      <div className="veil__inner">
        <div className="veil__mark">
          {'CHRYS'.split('').map((letter, i) => (
            <span key={letter + i} style={{ animationDelay: `${i * 45}ms` }}>
              {letter}
            </span>
          ))}
        </div>
        <span className="veil__bar">
          <i />
        </span>
        <p className="veil__caption">{caption}</p>

        {state === 'error' && visible ? (
          <div className="veil__error" role="alert">
            <p>This is taking longer than usual.</p>
            <div>
              <button type="button" className="button" onClick={retry} ref={retryRef}>
                Try again
              </button>
              <button type="button" className="button veil__stay" onClick={stay}>
                Stay here
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
