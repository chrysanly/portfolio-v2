'use client';

import { useEffect, useRef } from 'react';

/**
 * The scrolling behaviour only. The marks themselves are passed in as children
 * from a server component, so their path data never reaches the client bundle —
 * inlining 33 brand paths into a client component put the home route 36 kB over
 * the budget in docs/02-TRD.md §4.
 *
 * The row drifts on its own and can also be dragged, wheeled or arrowed
 * through. Auto-scroll stops while the visitor is pointing at it, focused
 * inside it, or scrolling it themselves, and never starts under reduced motion —
 * the row is still fully readable by hand.
 */
export function MarqueeTrack({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let paused = false;
    let idle = 0;
    /*
     * The position is accumulated here rather than read back from scrollLeft.
     * A sub-pixel step written straight to scrollLeft is rounded away on every
     * frame, so the row never actually advances — it just rewrites the same value.
     */
    let pos = track.scrollLeft;
    const STEP = 0.45;

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      pos = track.scrollLeft;
      paused = false;
    };
    // Hand control back a moment after the visitor stops scrolling it.
    const nudge = () => {
      paused = true;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        pos = track.scrollLeft;
        paused = false;
      }, 1800);
    };

    const tick = () => {
      if (!paused) {
        const half = track.scrollWidth / 2;
        pos += STEP;
        if (half > 0 && pos >= half) pos -= half;
        track.scrollLeft = pos;
      }
      frame = requestAnimationFrame(tick);
    };

    track.addEventListener('pointerenter', pause);
    track.addEventListener('pointerleave', resume);
    track.addEventListener('focusin', pause);
    track.addEventListener('focusout', resume);
    track.addEventListener('wheel', nudge, { passive: true });
    track.addEventListener('touchstart', nudge, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      track.removeEventListener('pointerenter', pause);
      track.removeEventListener('pointerleave', resume);
      track.removeEventListener('focusin', pause);
      track.removeEventListener('focusout', resume);
      track.removeEventListener('wheel', nudge);
      track.removeEventListener('touchstart', nudge);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className="marquee"
      tabIndex={0}
      role="group"
      aria-label="Technologies, scrollable"
    >
      {children}
    </div>
  );
}
