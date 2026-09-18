/**
 * In-memory fixed-window limiter. Acceptable at this scale — docs/02-TRD.md §6.
 * Nothing is persisted; entries expire with the window.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 5;

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string): { allowed: boolean } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  entry.count += 1;
  return { allowed: entry.count <= MAX_REQUESTS };
}

/** Called opportunistically so the map cannot grow without bound. */
export function pruneRateLimit(): void {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now >= entry.resetAt) hits.delete(key);
  }
}
