'use client';

import { useEffect, useRef } from 'react';
import { techIcons } from '@/content/tech-icons';

/**
 * The stack, as a row that drifts on its own and can also be dragged, wheeled
 * or arrowed through.
 *
 * The list is rendered twice and the scroll position wraps at the halfway mark,
 * which is what makes the drift seamless without cloning nodes at runtime. The
 * duplicate is hidden from assistive technology so the names are announced once.
 *
 * Auto-scroll stops while the visitor is pointing at it, focused inside it, or
 * scrolling it themselves, and never starts under reduced motion — the row is
 * still fully readable by scrolling it by hand.
 */
export function TechMarquee() {
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
     * frame, so the row never actually advances — it just rewrites 0.
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
        // Pick up wherever the visitor left it, or the row would jump back.
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
    <section className="stack-band" aria-labelledby="stack-heading">
      <div className="wrap">
        <h2 id="stack-heading" className="section-label">
          Stack
        </h2>
      </div>

      <div
        ref={trackRef}
        className="marquee"
        tabIndex={0}
        role="group"
        aria-label="Technologies, scrollable"
      >
        <ul className="marquee__row">
          {techIcons.map((icon) => (
            <li key={icon.label} className="marquee__item">
              <svg viewBox="0 0 24 24" role="img" aria-label={icon.label} focusable="false">
                <path d={icon.path} />
              </svg>
            </li>
          ))}
        </ul>
        <ul className="marquee__row" aria-hidden="true">
          {techIcons.map((icon) => (
            <li key={`${icon.label}-echo`} className="marquee__item">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d={icon.path} />
              </svg>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
