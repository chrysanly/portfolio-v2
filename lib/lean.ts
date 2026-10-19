/**
 * The hero's first-load timings and the CHRYS pointer lean, kept pure so
 * node:test runs them. MastheadHero writes the results; nothing here touches
 * the DOM.
 */

/** The skeleton stays hidden this long, so a fast load never sees it. */
export const SKEL_GRACE_MS = 120;
/** Once shown, the skeleton stays at least this long: never a flash. */
export const SKEL_MIN_MS = 300;
/** Each letter's rise, and the beat between letters. */
export const LETTER_IN_MS = 320;
export const LETTER_STAGGER_MS = 60;
/** The whole entrance for five letters: 320 + 4 × 60. */
export const ENTRANCE_TOTAL_MS = LETTER_IN_MS + 4 * LETTER_STAGGER_MS;

/** Peak lift (px) and tilt (deg) for the letter under the pointer. */
export const MAX_LIFT = 10;
export const MAX_LEAN = 3;
/** Reach, in letter widths, past which a letter does not respond. */
export const REACH = 1.6;
/** Share of the gap closed per frame: a soft settle of roughly 300ms. */
export const LEAN_LERP = 0.16;
/** How close the nearest letter must be to take the accent. */
export const NEAR_AT = 0.35;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LeanTargets {
  letters: { lift: number; tilt: number }[];
  /** Index of the accented letter, or -1. */
  near: number;
}

/**
 * Where each letter wants to be for a pointer: lift `-MAX_LIFT × f²` and a
 * tilt toward the pointer of up to MAX_LEAN × f, where
 * `f = max(0, 1 − distance / (REACH × letter width))`. No pointer: all zero.
 */
export function leanTargets(
  pointer: { x: number; y: number } | null,
  boxes: readonly Box[],
): LeanTargets {
  if (!pointer) return { letters: boxes.map(() => ({ lift: 0, tilt: 0 })), near: -1 };

  let near = -1;
  let nearest = Infinity;
  const letters = boxes.map((b, i) => {
    if (b.width <= 0) return { lift: 0, tilt: 0 };
    const dx = pointer.x - (b.left + b.width / 2);
    const dy = pointer.y - (b.top + b.height / 2);
    const distance = Math.hypot(dx, dy);
    const f = Math.max(0, 1 - distance / (REACH * b.width));
    if (distance < nearest) {
      nearest = distance;
      near = f > NEAR_AT ? i : -1;
    }
    const lean = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, (dx / b.width) * MAX_LEAN));
    return { lift: f > 0 ? -MAX_LIFT * f * f : 0, tilt: f > 0 ? lean * f : 0 };
  });
  return { letters, near };
}
