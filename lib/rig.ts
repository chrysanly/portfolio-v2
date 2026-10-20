/**
 * The showcase rig's interaction, kept pure so node:test runs it: which
 * screenshot a device's screen shows, and the pointer tilt. Which shots a
 * device has at all is lib/devices.ts.
 */

/** Tilt at the rig's edge, in degrees. Small: it should read as weight, not a spin. */
export const MAX_TILT = 5;

/** The shot shown for a running pick count: wraps per project, so projects of any size share one counter. */
export function pickFor(picks: number, length: number): number {
  return length <= 1 ? 0 : ((picks % length) + length) % length;
}

export interface Tilt {
  /** Pointer position across the rig, -1 at the left/top edge to 1 at the right/bottom. */
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
}

const clampUnit = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/** The rig leans toward the pointer: right of centre turns it right, above tips it back. */
export function tiltFor(
  pointer: { x: number; y: number },
  box: { left: number; top: number; width: number; height: number },
  max = MAX_TILT,
): Tilt {
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0, rotateX: 0, rotateY: 0 };
  const x = clampUnit(((pointer.x - box.left) / box.width) * 2 - 1);
  const y = clampUnit(((pointer.y - box.top) / box.height) * 2 - 1);
  return { x, y, rotateX: -y * max, rotateY: x * max };
}
