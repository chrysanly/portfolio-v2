'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { previousPath, sameOriginReferrerPath } from '@/lib/nav';

/**
 * Home by default; Back only where the caller allows it and only when there is
 * somewhere real to go back to.
 *
 * This control used to follow history wherever history existed, which made its
 * destination unpredictable — the same word landed you somewhere different
 * depending on how you arrived — so it was cut back to one fixed destination.
 * The predictability problem was never the going back, it was the *label*
 * staying the same while the destination changed. So it is honest about both
 * now: it reads "Back" when it will return you to the page you came from, and
 * "Home" when it will not. Chrys asked for this on the project pages, where a
 * visitor arrives mid-scroll from the showcase and losing that place is the
 * whole cost.
 *
 * `allowHistory` is opt-in per page rather than global. On `/about`,
 * `/contact` and `/work` the control is the site's escape hatch and stays
 * Home; a project page is the one place reached *from* somewhere.
 *
 * It renders Home on the server and upgrades in an effect. It has to: the page
 * is static HTML served from a CDN to everyone, so the markup cannot know one
 * visitor's history, and Home is the safe half of the choice to be wrong about
 * for a frame.
 *
 * `RouteVeil`'s document-level click listener runs in the capture phase, so it
 * still shows the veil over the `router.back()` path below even though this
 * calls `preventDefault`.
 */
export function BackLink({ allowHistory = false }: { allowHistory?: boolean } = {}) {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    if (!allowHistory) return;

    const from = previousPath() ?? sameOriginReferrerPath();

    // A same-path referrer is a reload, not a journey, and with a single
    // history entry `back()` would leave the site altogether.
    if (!from || from === window.location.pathname) return;
    if (window.history.length <= 1) return;

    setReturnTo(from);
  }, [allowHistory]);

  const chevron = (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M10 3 5 8l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );

  if (!returnTo) {
    return (
      <Link className="back" href="/">
        {chevron}
        Home
      </Link>
    );
  }

  /*
   * A real href, not a button: middle-click, right-click and the status bar
   * all work, and it still functions if the click handler never runs. The
   * handler exists so the normal case goes through history instead — that is
   * what gives `ScrollMemory` its `popstate` and puts the visitor back at the
   * panel they left, rather than at the top of the page.
   */
  return (
    <Link
      className="back"
      href={returnTo}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;
        event.preventDefault();
        router.back();
      }}
    >
      {chevron}
      Back
    </Link>
  );
}
