/**
 * Where the visitor came from, within this site, this session.
 *
 * Two consumers need the same answer and must agree on one key:
 * `ScrollMemory` writes it on every client-side route change, and `BackLink`
 * reads it to decide whether "Back" has anywhere honest to go.
 *
 * `document.referrer` cannot answer this on its own. App Router navigations
 * are soft — the referrer stays whatever it was when the tab first loaded, so
 * after `/` → `/work/a` → `/work/b` it still names the page before `/`, or
 * nothing at all. It is still consulted as a second source, because it is the
 * only one that survives a hard navigation into the site.
 */
const PREV_PATH_KEY = 'nav:prev';

export function rememberPreviousPath(path: string): void {
  try {
    sessionStorage.setItem(PREV_PATH_KEY, path);
  } catch {
    // Private mode / storage disabled: Back falls back to Home, which is
    // never wrong, only less specific.
  }
}

/** The path navigated away from, or null if this is the first page seen. */
export function previousPath(): string | null {
  try {
    return sessionStorage.getItem(PREV_PATH_KEY);
  } catch {
    return null;
  }
}

/** The referring path, but only when it is this site's. */
export function sameOriginReferrerPath(): string | null {
  try {
    if (!document.referrer) return null;
    const url = new URL(document.referrer);
    return url.origin === window.location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}
