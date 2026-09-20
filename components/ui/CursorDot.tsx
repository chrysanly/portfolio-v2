'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A cursor spot that stays visible on both themes, and the grid's own
 * response to it: its sharp edges catching light along the pointer's recent
 * path (`.bg-spot`/`.bg-spot__grid`, globals.css) — not a glow laid over the
 * grid, the grid's own lines lighting up, the way raking a light across an
 * etched line lights the line itself rather than painting a soft circle on
 * top of it. It sits behind every real element rather than floating over the
 * page like the dot does, and fades behind the cursor as it moves rather
 * than appearing and vanishing at a single point.
 *
 * The dot paints with `mix-blend-mode: difference`, so it inverts whatever is
 * under it rather than being a fixed colour — white on the oyster ground, dark
 * on the near-black one, and legible over the masthead either way. No theme
 * branch. The grid-light's blend mode does need one (`--spot-blend`,
 * globals.css): `screen` only ever adds light, right for lighting up a
 * near-black ground, while `soft-light` darkens for a blend colour this dark,
 * so both themes use `screen` there too, just at different strengths.
 *
 * Only mounts for a fine pointer that can hover, so touch devices never get a
 * dot chasing a tap, and it is skipped entirely under reduced motion. Both are
 * purely decorative: `pointer-events: none` and hidden from assistive tech.
 */

/** One trail point per `--trail-x-N`/`--trail-y-N` pair in globals.css. */
const TRAIL_LENGTH = 6;
/** A new point is recorded every this-many frames, not every frame — sampled
 * every frame, the six points would sit almost on top of each other at
 * normal cursor speed and never read as a spread-out trail at all. */
const SAMPLE_EVERY = 3;

export function CursorDot() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calm.matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { ...target };
    const trail = Array.from({ length: TRAIL_LENGTH }, () => ({ ...target }));
    let frame = 0;
    let frameCount = 0;
    let seen = false;

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!seen) {
        seen = true;
        ring.x = target.x;
        ring.y = target.y;
        // Snap the whole trail to the entry point instead of letting it
        // stay wherever it was left after the pointer last exited — without
        // this, re-entering the page anywhere draws one long streak in from
        // the old position before the trail catches up.
        trail.forEach((p) => {
          p.x = target.x;
          p.y = target.y;
        });
        document.documentElement.dataset.cursor = 'on';
      }
    };

    const onLeave = () => {
      delete document.documentElement.dataset.cursor;
      seen = false;
    };

    const tick = () => {
      // The ring trails the dot, which is what makes the movement read as
      // deliberate rather than as a second mouse pointer.
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
      }

      // Shift the history back one slot every SAMPLE_EVERY frames, then
      // always write the live position into slot 0 — the head of the trail
      // tracks the pointer exactly every frame, so the light never lags at
      // the point that matters, while the tail behind it moves in coarser,
      // visibly spaced steps.
      frameCount += 1;
      if (frameCount % SAMPLE_EVERY === 0) {
        for (let i = trail.length - 1; i > 0; i -= 1) {
          trail[i].x = trail[i - 1].x;
          trail[i].y = trail[i - 1].y;
        }
      }
      trail[0].x = target.x;
      trail[0].y = target.y;

      // `.bg-spot` doesn't move — it's a fixed full-viewport layer whose
      // mask is six radial gradients — so what tracks the pointer is each
      // gradient's own centre point instead, written here as custom
      // properties. Set directly rather than through React state, same as
      // the dot and ring above: this runs every frame, and a re-render per
      // frame is exactly the cost this pattern exists to avoid.
      const root = document.documentElement.style;
      trail.forEach((p, i) => {
        root.setProperty(`--trail-x-${i}`, `${p.x}px`);
        root.setProperty(`--trail-y-${i}`, `${p.y}px`);
      });

      frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      delete document.documentElement.dataset.cursor;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div className="bg-spot" aria-hidden="true">
        <div className="bg-spot__grid" />
      </div>
      <div className="cursor" aria-hidden="true">
        <div ref={ringRef} className="cursor__ring" />
        <div ref={dotRef} className="cursor__dot" />
      </div>
    </>
  );
}
