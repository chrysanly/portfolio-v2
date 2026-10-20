/**
 * The hero's read hold, in time.
 *
 * The plateau in MastheadHero's scroll map holds the details still for a
 * stretch of scroll, but a trackpad flick or a few fast wheel notches cross
 * it in a couple of frames, and the intro has left before it could be read.
 * This holds the spring's *target* at the end of the plateau until the
 * details have been on screen for `ms`, then lets it go to the real scroll.
 *
 * It never touches the scroll itself — nothing listens to wheel or touch —
 * so a visitor is never trapped; the page moves, the hero waits a beat.
 * Scroll progress is the hero track's 0–1, the same value `useScroll` gives.
 */

export interface HoldOptions {
  /** Raw progress where the plateau starts (MastheadHero's REVEAL_AT). */
  from: number;
  /** Raw progress where it ends (READ_END); the cap. */
  to: number;
  /** How long the details stay up once shown. */
  ms: number;
  /**
   * Past this the hold lets go at once: at the end of the track the sticky
   * stage starts to scroll away, and it must not leave with the ledger on it.
   */
  bail: number;
}

export interface HoldState {
  /** Only a scroll that came down from above the plateau is held. */
  armed: boolean;
  /** When the spring's own value reached the plateau, i.e. the details showed. */
  since: number | null;
}

export const freshHold = (): HoldState => ({ armed: false, since: null });

/**
 * `raw` is the scroll, `shown` the spring's current value. Returns the spring
 * target and, while holding, how many ms until the hold should be re-checked.
 */
export function holdTarget(
  s: HoldState,
  raw: number,
  shown: number,
  now: number,
  o: HoldOptions,
): { target: number; wakeIn: number | null } {
  const free = { target: raw, wakeIn: null };

  if (raw < o.from) {
    s.armed = true;
    s.since = null;
    return free;
  }
  if (!s.armed) return free;

  if (s.since === null && shown >= o.from) s.since = now;
  if (raw <= o.to) return free;

  if (raw >= o.bail) {
    s.armed = false;
    return free;
  }
  if (s.since === null) return { target: o.to, wakeIn: null };

  const left = o.ms - (now - s.since);
  if (left > 0) return { target: o.to, wakeIn: left };

  s.armed = false;
  return free;
}
