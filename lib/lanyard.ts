/**
 * The lanyard's pure maths, kept out of IdCard.tsx so node:test can run it:
 * where the badge may go, how many solver steps a frame gets, and when the
 * rope has settled enough to stop the loop.
 */

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Point {
  x: number;
  y: number;
  px: number;
  py: number;
}

/** Air kept between the card and the edge, so a tilted corner stays in view too. */
export const EDGE_PAD = 12;

/** One solver step: the physics was tuned at 60 frames a second. */
export const STEP_MS = 1000 / 60;

/** A slow frame catches up at most this many steps, never a burst that jumps the card. */
export const MAX_STEPS = 3;

/** Lower and upper limit, or their midpoint when the room is narrower than the thing. */
function range(lo: number, hi: number): [number, number] {
  return lo <= hi ? [lo, hi] : [(lo + hi) / 2, (lo + hi) / 2];
}

/**
 * Where the card's top-centre may sit, in the stage's own coordinates: inside
 * the hero, and inside the viewport's left and right edges, whichever is
 * tighter. `viewportW` is the width without the scrollbar.
 */
export function dragBounds(
  hero: Box,
  stage: Pick<Box, 'left' | 'top'>,
  viewportW: number,
  cardW: number,
  cardH: number,
): Bounds {
  const left = Math.max(hero.left, 0) - stage.left;
  const right = Math.min(hero.right, viewportW) - stage.left;
  const [minX, maxX] = range(left + cardW / 2 + EDGE_PAD, right - cardW / 2 - EDGE_PAD);
  const [minY, maxY] = range(hero.top - stage.top + EDGE_PAD, hero.bottom - stage.top - cardH - EDGE_PAD);
  return { minX, maxX, minY, maxY };
}

/**
 * Hold a Verlet point inside [min, max] on each axis. At a wall the velocity
 * on that axis is dropped (previous = current), so the card stops at the edge
 * instead of tunnelling through it or bouncing off it.
 */
export function clampPoint(p: Point, minX: number, maxX: number, minY = -Infinity, maxY = Infinity): void {
  if (p.x < minX || p.x > maxX) {
    p.x = Math.min(maxX, Math.max(minX, p.x));
    p.px = p.x;
  }
  if (p.y < minY || p.y > maxY) {
    p.y = Math.min(maxY, Math.max(minY, p.y));
    p.py = p.y;
  }
}

/**
 * Fixed-step accumulator. Returns how many solver steps to run this frame and
 * the time left over. The carry is capped, so a long frame (a tab coming
 * back, a GC pause) costs at most MAX_STEPS and the card never leaps.
 */
export function stepsFor(carry: number, elapsedMs: number): { steps: number; carry: number } {
  const total = Math.min(carry + Math.max(0, elapsedMs), STEP_MS * MAX_STEPS);
  const steps = Math.floor(total / STEP_MS);
  return { steps, carry: total - steps * STEP_MS };
}

/** The fastest any point is moving, px per step. */
export function maxSpeed(points: readonly Point[]): number {
  let max = 0;
  for (const p of points) max = Math.max(max, Math.abs(p.x - p.px), Math.abs(p.y - p.py));
  return max;
}

/** Below this the rope reads as still. */
export const REST_SPEED = 0.05;

/** How long nothing has touched it before the loop may sleep. */
export const QUIET_MS = 2500;

/** True once the badge is not held, nothing has jogged it for QUIET_MS, and it has stopped moving. */
export function canSleep(held: boolean, sinceKickMs: number, speed: number, twistSpeed: number): boolean {
  return !held && sinceKickMs >= QUIET_MS && speed < REST_SPEED && Math.abs(twistSpeed) < 0.02;
}
