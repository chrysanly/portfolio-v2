'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Step through the page one section at a time.
 *
 * The home page is long by design — a pinned hero, a pinned showcase and a
 * pinned journey each take several screens of scrolling to cross. That is the
 * right experience the first time and a chore every time after, so this is the
 * way past it: one click, one section.
 *
 * It does not maintain its own list of sections. It reads `[data-section]` from
 * the DOM on mount, so a section added to the page appears here without anyone
 * remembering to update a second list.
 *
 * Hidden entirely under reduced motion and with JavaScript off — it is a
 * shortcut, and the page works without it.
 */

interface Stop {
  id: string;
  label: string;
  top: number;
}

function maxScroll(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

/**
 * Which section is being read.
 *
 * "The last one whose top is above the fold" was wrong twice over. At the top
 * of the page several sections already qualify, because the showcase is pinned
 * and the index is pulled up over it — so the first Next skipped two sections.
 * And the last sections sit past the maximum scroll, so they could never
 * become current at all.
 *
 * Nearest-top wins instead, and being at the bottom of the page always means
 * the last section, whatever the arithmetic says.
 */
function currentIndex(stops: Stop[]): number {
  if (stops.length === 0) return 0;

  const max = maxScroll();

  /*
   * At the bottom of the page the last two sections share the final screen, so
   * neither can be reached by its own scroll offset. There, the one nearest the
   * middle of the viewport is the one being looked at.
   */
  const mark =
    max > 0 && window.scrollY >= max - 2
      ? window.scrollY + window.innerHeight * 0.5
      : window.scrollY + window.innerHeight * 0.25;

  let best = 0;
  let distance = Infinity;
  stops.forEach((stop, i) => {
    const d = Math.abs(stop.top - mark);
    if (d < distance) {
      distance = d;
      best = i;
    }
  });

  return best;
}

export function SectionPager() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [index, setIndex] = useState(0);
  const jumping = useRef(false);

  const measure = useCallback(() => {
    const found = [...document.querySelectorAll<HTMLElement>('[data-section]')].map((el) => ({
      id: el.id || el.dataset.section || '',
      label: el.dataset.section ?? '',
      top: el.getBoundingClientRect().top + window.scrollY,
    }));
    setStops(found);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    measure();

    /*
     * The pinned sections change height as fonts load and as the showcase
     * measures itself, so the offsets have to be re-read rather than taken
     * once. ResizeObserver on the body catches all of it.
     */
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    const onScroll = () => {
      if (jumping.current) return;

      setStops((current) => {
        setIndex(currentIndex(current));
        return current;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [measure]);

  const go = (to: number) => {
    const stop = stops[to];
    if (!stop) return;

    // The scroll handler is muted until the smooth scroll lands, or it would
    // fight the jump and flicker the label through every section on the way.
    jumping.current = true;
    setIndex(to);

    window.scrollTo({ top: Math.min(stop.top, maxScroll()), behavior: 'smooth' });
    window.setTimeout(() => {
      jumping.current = false;
    }, 700);
  };

  // Nothing to page through, or reduced motion: render nothing at all.
  if (stops.length < 2) return null;

  const atStart = index <= 0;
  const atEnd = index >= stops.length - 1;

  return (
    <nav className="pager" aria-label="Skip between sections">
      <button
        type="button"
        className="pager__step"
        onClick={() => go(index - 1)}
        disabled={atStart}
        aria-label={
          atStart ? 'Previous section' : `Previous section: ${stops[index - 1]?.label}`
        }
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3 10.5 8 5.5l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {/* The label doubles as the position indicator, so there is no separate
          set of dots to keep in step with it. */}
      <span className="pager__where">
        <b>{String(index + 1).padStart(2, '0')}</b>
        <em>{stops[index]?.label}</em>
      </span>

      <button
        type="button"
        className="pager__step"
        onClick={() => go(index + 1)}
        disabled={atEnd}
        aria-label={atEnd ? 'Next section' : `Next section: ${stops[index + 1]?.label}`}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3 5.5 8 10.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </nav>
  );
}
