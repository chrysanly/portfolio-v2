/**
 * A scroll the page makes on purpose — "View my work", the section pager.
 *
 * Shared, and flagged while it runs, because the hero reads it. The hero's
 * timeline trails the scroll through a spring, which is right for a wheel and
 * wrong for a jump: a native smooth scroll crossed 829px in ~400ms while the
 * spring was still a third of the way through the hand-over, so the stage
 * scrolled away with the ledger painted on it, the masthead faded out with no
 * header to hand over to, and the showcase snapped in last. Measured over CDP
 * on 2026-09-23, which is what Chrys described as the click "glitching".
 *
 * While `isJumping()` is true the hero follows the scroll exactly instead.
 */

let token = 0;
let running = false;

export const isJumping = () => running;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Fixed duration rather than the browser's distance-scaled one, so a jump of
 * several screens lands as quickly as a jump of one. A second call takes over
 * from the first instead of the two fighting over `scrollTo`.
 *
 * Reduced motion gets the destination at once. And the visitor always wins:
 * a wheel, touch, press or key during the jump stops it where it is, rather
 * than every frame's `scrollTo` dragging them back.
 */
export function animateScrollTo(
  target: number,
  ms = 380,
  easing: (t: number) => number = easeOutCubic,
): Promise<void> {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, target);
    return Promise.resolve();
  }

  const start = window.scrollY;
  const delta = target - start;
  if (Math.abs(delta) < 1) return Promise.resolve();

  const mine = ++token;
  running = true;

  return new Promise((resolve) => {
    const finish = () => {
      INTERRUPTS.forEach((type) => window.removeEventListener(type, interrupt));
      resolve();
    };
    const interrupt = () => {
      if (mine !== token) return;
      token++;
      running = false;
      finish();
    };
    INTERRUPTS.forEach((type) =>
      window.addEventListener(type, interrupt, { passive: true, once: true }),
    );

    const startTime = performance.now();
    const step = (now: number) => {
      if (mine !== token) return finish();
      const t = Math.min(1, (now - startTime) / ms);
      window.scrollTo(0, start + delta * easing(t));
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      running = false;
      finish();
    };
    requestAnimationFrame(step);
  });
}

/** What a visitor does to take the scroll back. */
const INTERRUPTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
