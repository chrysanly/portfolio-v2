'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A cursor spot that stays visible on both themes.
 *
 * It paints with `mix-blend-mode: difference`, so it inverts whatever is under
 * it rather than being a fixed colour — white on the oyster ground, dark on the
 * near-black one, and legible over the masthead either way. No theme branch.
 *
 * Only mounts for a fine pointer that can hover, so touch devices never get a
 * dot chasing a tap, and it is skipped entirely under reduced motion. It is
 * purely decorative: `pointer-events: none` and hidden from assistive tech.
 */
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
    let frame = 0;
    let seen = false;

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!seen) {
        seen = true;
        ring.x = target.x;
        ring.y = target.y;
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
    <div className="cursor" aria-hidden="true">
      <div ref={ringRef} className="cursor__ring" />
      <div ref={dotRef} className="cursor__dot" />
    </div>
  );
}
