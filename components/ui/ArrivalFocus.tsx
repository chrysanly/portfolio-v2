'use client';

import { useEffect } from 'react';
import { previousPath } from '@/lib/nav';

/**
 * Tells the route veil this page has arrived, and moves focus to its heading
 * when it was reached from inside the site.
 *
 * The signal is what ends the loading state: the veil does not lift on the
 * path changing, because with a loading placeholder the path changes before
 * the page is there. It lifts when the page says so.
 *
 * A client-side navigation swaps the content but leaves focus on the link that
 * was clicked — which no longer exists — so a keyboard or screen-reader user
 * lands nowhere. Focusing the new page's title announces it and starts the
 * tab order at the top of what changed. A direct load is left alone: the
 * browser already starts there.
 */
export function ArrivalFocus({ targetId }: { targetId: string }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('route:arrived'));
    if (previousPath() === null) return;
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }, [targetId]);

  return null;
}
