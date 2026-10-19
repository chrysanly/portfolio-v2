'use client';

import { useEffect } from 'react';

/**
 * Clears the opening hold once the page is genuinely ready.
 *
 * The hold used to be a fixed one-second timer, which is the worst of both
 * worlds: it delayed fast loads and did not actually wait for slow ones. It
 * cost 11 Lighthouse points and 2s of LCP for no real guarantee.
 *
 * Now it is what it looks like — a loading state. It clears when the fonts have
 * loaded and the document has finished loading, subject to:
 *
 *  - a MINIMUM, so a fast connection sees a deliberate beat rather than a flash;
 *  - a CEILING, so a stalled asset can never strand the visitor behind it.
 *
 * With JavaScript off this component never runs and a CSS animation in
 * globals.css clears the hold on its own — see `.splash`.
 */

const MIN_HOLD = 420;
const MAX_HOLD = 2600;

/** Read by the head script in app/layout.tsx: the hold shows once per session. */
export const SPLASH_KEY = 'splash-seen';

function rememberSplash() {
  try {
    sessionStorage.setItem(SPLASH_KEY, '1');
  } catch {
    // Storage blocked: the hold simply shows again next load.
  }
}

export function SplashDismiss() {
  useEffect(() => {
    const root = document.documentElement;

    // Seen this session: the head script hid the hold before paint. Ready is
    // set again here because a remount's cleanup below removes it.
    if (root.dataset.splash === 'seen') {
      if (!window.location.hash) window.scrollTo(0, 0);
      root.dataset.ready = 'true';
      return () => {
        delete root.dataset.ready;
      };
    }

    const started = performance.now();
    let done = false;

    const clear = () => {
      if (done) return;
      done = true;
      /*
       * The page starts at the beginning, every time. `history.scrollRestoration`
       * is already 'manual' (see the head script in app/layout.tsx), but a
       * reload can still leave an offset behind, and being dropped half way
       * into a pinned scroll sequence reads as a broken page. A deep link to a
       * fragment is the one case where the visitor did ask for a position.
       */
      if (!window.location.hash) window.scrollTo(0, 0);
      root.dataset.ready = 'true';
      rememberSplash();
    };

    const release = () => {
      const waited = performance.now() - started;
      window.setTimeout(clear, Math.max(0, MIN_HOLD - waited));
    };

    const ceiling = window.setTimeout(clear, MAX_HOLD);

    const settled = [
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            window.addEventListener('load', () => resolve(), { once: true });
          }),
    ];

    void Promise.all(settled).then(release);

    return () => {
      window.clearTimeout(ceiling);
      delete root.dataset.ready;
    };
  }, []);

  return null;
}
