'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { showVeil } from './RouteVeil';

/**
 * Back, meaning back — to wherever you actually came from.
 *
 * A hardcoded link to `/` is wrong for anyone who arrived from `/work`: it
 * throws away their place in a list they were reading. So this uses history
 * when there is history to use.
 *
 * It renders as a real `<a href="/">` first and upgrades after mount. That
 * matters twice over: with JavaScript off it still works, and it is a link
 * rather than a button, so it can be opened in a new tab and read as a link by
 * a screen reader.
 */
export function BackLink() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // `history.length > 1` is true for a tab that has been anywhere at all, so
    // it is not enough on its own — a visitor who landed here directly from a
    // search result would be sent back to the search. A referrer on this origin
    // is the reliable signal that the previous entry is ours.
    const sameOrigin =
      typeof document !== 'undefined' &&
      document.referrer !== '' &&
      new URL(document.referrer).origin === window.location.origin;

    setCanGoBack(sameOrigin && window.history.length > 1);
  }, []);

  return (
    <Link
      className="back"
      href="/"
      onClick={(event) => {
        if (!canGoBack) return;
        // Let a modified click do what the visitor asked — new tab, new window.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

        event.preventDefault();
        // router.back() is not a click the veil can see, so it is told.
        showVeil();
        router.back();
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d="M10 3 5 8l5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
      Back
    </Link>
  );
}
