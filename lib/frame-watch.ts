/**
 * Frame-time sampling for the lag notice. A window of requestAnimationFrame
 * deltas is reduced to its median, so one long frame (a font swap, a GC
 * pause) cannot trip the notice on its own, but a device that paints the
 * texture at under ~35fps the whole time does.
 */

/** Median frame time, in ms, above which the page reads as slow (~35fps). */
export const SLOW_MS = 28;

/** A gap this long is a hidden tab or a breakpoint, not a slow frame. */
const GAP_MS = 250;

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function isSlow(frameTimes: readonly number[]): boolean {
  return median(frameTimes.filter((t) => t > 0 && t < GAP_MS)) > SLOW_MS;
}

/**
 * Collects `count` frame deltas, then calls `done` with them. Returns a
 * cancel function; cancelling never calls `done`.
 */
export function sampleFrames(count: number, done: (frameTimes: number[]) => void): () => void {
  const times: number[] = [];
  let last = 0;
  let id = requestAnimationFrame(function tick(now) {
    if (last) times.push(now - last);
    last = now;
    if (times.length >= count) {
      done(times);
      return;
    }
    id = requestAnimationFrame(tick);
  });
  return () => cancelAnimationFrame(id);
}
