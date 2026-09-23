'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';

/**
 * The run from college to the current post, walked sideways.
 *
 * Gate (per the `animate` skill): passed once per visit — the rare tier, where
 * a deliberate treatment is warranted. Purpose is spatial consistency: a career
 * is a path, and moving along an axis says that far better than a stack of
 * rows does.
 *
 * Vertical scroll drives horizontal travel, on the same spring the hero and the
 * showcase use, so the page keeps one sense of weight. Transform only — the
 * strip is translated, never scrolled with `scrollLeft`, so nothing reflows.
 *
 * With JavaScript off or reduced motion set this renders the same cards as a
 * plain vertical list: no pin, no horizontal movement, nothing hidden. That is
 * the `[data-motion]` gate in globals.css, not a second component.
 */

const EASE = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * "What I took from it" is HTML now — written in the admin's TipTap field, where the
 * point was that the Enter key produces a paragraph, and sanitised there
 * against an allowlist (`App\Services\RichText`) before it is ever stored.
 *
 * Older snapshots and `content/site.ts` hold plain text for the same field, so
 * markup is not assumed: anything that does not open with a tag is escaped and
 * wrapped in a paragraph, which is both the safe reading and the one that
 * renders identically to what shipped before.
 */
function asProse(value: string): string {
  if (/^\s*</.test(value)) return value;

  return `<p>${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
}

export interface JourneyStop {
  kind: 'education' | 'role';
  period: string;
  title: string;
  phase?: string;
  place: string;
  learned?: string;
  tech: string[];
  work: {
    slug: string;
    title: string;
    summary: string;
    confidential: boolean;
    contributions: string[];
  }[];
}

export function JourneyTimeline({ stops }: { stops: JourneyStop[] }) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLOListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const tickRefs = useRef<(HTMLLIElement | null)[]>([]);

  /*
   * Which stop is at the centre, for the counter and for disabling the
   * arrows at the ends. Mirrored in a ref so the scroll listener can tell a
   * real change from a repeat without re-subscribing every time it moves —
   * this updates a few times per journey, not once per frame.
   */
  const [stop, setStop] = useState(0);
  const stopRef = useRef(0);

  /** Cleared the first time the reader moves it themselves, by any means. */
  const [nudged, setNudged] = useState(false);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 28,
    restDelta: 0.001,
  });

  /*
   * Same treatment as the showcase's panels: the section pager steps
   * through one stop per card instead of jumping straight from one end of
   * the strip to the other. Cards vary in width — a stop with contributions
   * and a tech list is wider than the plain-text degree stop — so unlike
   * the showcase's equal slots, each card's centred position has to be
   * measured from its actual `offsetLeft`/`offsetWidth` rather than divided
   * evenly. `offsetLeft` is unaffected by the `transform` `paint()` applies
   * below, so it's a stable read regardless of scroll position.
   *
   * `data-journey-active`/`data-journey-stop` are kept by a plain scroll
   * listener against this same geometry, not the spring-smoothed `progress`
   * paint() uses — the pager needs the immediate position, not the same
   * trailing motion the cards animate with.
   */
  const journeyGeometry = useRef({
    trackTop: 0,
    scrollable: 0,
    travel: 0,
    centers: [] as number[],
  });

  const measureJourneyGeometry = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const strip = stripRef.current;
    if (!track || !stage || !strip) return;

    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = track.offsetHeight - stage.offsetHeight;
    const travel = Math.max(0, strip.scrollWidth - stage.clientWidth);
    const centers = cardRefs.current.map((card) =>
      card ? card.offsetLeft + card.offsetWidth / 2 : 0,
    );
    journeyGeometry.current = { trackTop, scrollable, travel, centers };

    const mid = window.innerWidth / 2;
    cardRefs.current.forEach((card, i) => {
      if (!card || travel === 0) return;
      const pAtCentre = clamp((centers[i] - mid) / travel);
      card.dataset.substepY = String(Math.round(trackTop + pAtCentre * scrollable));
    });
  }, []);

  useLayoutEffect(() => {
    if (reduced) return;

    measureJourneyGeometry();
    window.addEventListener('resize', measureJourneyGeometry);

    const onScroll = () => {
      const { trackTop, scrollable, travel, centers } = journeyGeometry.current;
      const y = window.scrollY;
      const active = scrollable > 0 && y >= trackTop - 4 && y <= trackTop + scrollable + 4;
      document.documentElement.dataset.journeyActive = active ? 'on' : 'off';
      if (!active) return;

      const p = clamp((y - trackTop) / scrollable);
      const mid = window.innerWidth / 2;
      let closest = 0;
      let best = Infinity;
      centers.forEach((centre, i) => {
        const distance = Math.abs(centre - travel * p - mid);
        if (distance < best) {
          best = distance;
          closest = i;
        }
      });
      document.documentElement.dataset.journeyStop = String(closest);

      if (closest !== stopRef.current) {
        stopRef.current = closest;
        setStop(closest);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('resize', measureJourneyGeometry);
      window.removeEventListener('scroll', onScroll);
      delete document.documentElement.dataset.journeyActive;
    };
  }, [reduced, measureJourneyGeometry]);

  /**
   * Scrolls the page to wherever `i` sits at the centre of the stage.
   *
   * The arrows move the page, not the strip. The strip's position is a pure
   * function of scroll — moving it directly would put the two out of step
   * until the next scroll event yanked it back.
   */
  const goTo = useCallback(
    (i: number) => {
      const { trackTop, scrollable, travel, centers } = journeyGeometry.current;
      if (scrollable <= 0 || travel <= 0) return;

      const index = Math.max(0, Math.min(centers.length - 1, i));
      const p = clamp((centers[index] - window.innerWidth / 2) / travel);

      setNudged(true);
      window.scrollTo({ top: Math.round(trackTop + p * scrollable), behavior: 'smooth' });
    },
    [],
  );

  /*
   * A trackpad swiped sideways over the strip should move the strip.
   *
   * The stage is `overflow: hidden` and the travel is a transform, so a
   * horizontal gesture had nothing to act on and the browser did nothing at
   * all — on a laptop, the most natural way to push a horizontal run along
   * was the one way that didn't work.
   *
   * Only horizontal intent is taken. A trackpad emits a little deltaX on
   * almost every vertical flick, so claiming anything with any deltaX would
   * make ordinary downward scrolling feel like it was being fought.
   * `passive: false` because this has to be able to preventDefault — some
   * browsers map deltaX to history navigation, which would leave the page
   * mid-swipe.
   */
  useEffect(() => {
    if (reduced) return;

    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      const { scrollable, travel } = journeyGeometry.current;
      if (scrollable <= 0 || travel <= 0) return;
      if (document.documentElement.dataset.journeyActive !== 'on') return;
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

      event.preventDefault();
      setNudged(true);

      // Scaled so a pixel of sideways gesture is a pixel of sideways travel,
      // whatever the ratio of track height to strip width happens to be.
      window.scrollBy({ top: event.deltaX * (scrollable / travel), behavior: 'instant' });
    };

    stage.addEventListener('wheel', onWheel, { passive: false });

    return () => stage.removeEventListener('wheel', onWheel);
  }, [reduced]);

  // Any ordinary vertical scroll through the run counts as having found it.
  useEffect(() => {
    if (stop > 0) setNudged(true);
  }, [stop]);

  const paint = useCallback((p: number) => {
    const strip = stripRef.current;
    const stage = stageRef.current;
    if (!strip || !stage) return;

    /*
     * Measured against the stage, not the strip. The strip is as wide as its
     * own content, so its scrollWidth and clientWidth are identical and the
     * travel came out as zero — the stage is the window that clips it.
     */
    const travel = Math.max(0, strip.scrollWidth - stage.clientWidth);
    strip.style.transform = `translate3d(${(-travel * p).toFixed(1)}px, 0, 0)`;

    if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(3)})`;

    /*
     * Cards lift slightly as they reach the middle of the viewport, so the one
     * being read is the one standing forward. Written per element rather than
     * inherited from a variable on the strip, which would restyle every card
     * on every frame.
     */
    const mid = window.innerWidth / 2;
    let closest = 0;
    let best = Infinity;

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const box = card.getBoundingClientRect();
      const distance = Math.abs(box.left + box.width / 2 - mid);
      if (distance < best) {
        best = distance;
        closest = i;
      }
      const near = EASE(clamp(1 - distance / (window.innerWidth * 0.5)));
      card.style.opacity = (0.28 + near * 0.72).toFixed(3);
      card.style.transform = `translate3d(0, ${((1 - near) * 26).toFixed(1)}px, 0) scale(${(0.97 + near * 0.03).toFixed(4)})`;
    });

    // Only the card at the centre is "current" — it gets the accent edge, and
    // its tick on the rail lights up.
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      if (i === closest) card.dataset.current = 'true';
      else delete card.dataset.current;
    });
    tickRefs.current.forEach((tick, i) => {
      if (!tick) return;
      if (i === closest) tick.dataset.current = 'true';
      else delete tick.dataset.current;
    });
  }, []);

  useMotionValueEvent(progress, 'change', paint);

  useEffect(() => {
    if (reduced) return;
    paint(progress.get());
    const onResize = () => paint(progress.get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [reduced, paint, progress]);

  return (
    <div className="journey" ref={trackRef} style={{ ['--stops' as string]: stops.length }}>
      <div className="journey__stage" ref={stageRef}>
        <ol className="journey__strip" ref={stripRef}>
          {stops.map((stop, i) => (
            <li
              key={`${stop.title}-${stop.period}`}
              className="journey__stop"
              data-kind={stop.kind}
              data-substep-title={stop.title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
            >
              <span className="journey__ghost" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* The body scrolls, the card does not. Keeping the chapter
                  numeral outside it stops a decorative glyph from adding
                  scrollable overflow to stops that already fit. */}
              <div className="journey__body">
                <p className="journey__mark">
                  <b>{String(i + 1).padStart(2, '0')}</b>
                  <span>{stop.period}</span>
                </p>

                {stop.phase ? <p className="journey__phase">{stop.phase}</p> : null}

                <h3 className="journey__title">{stop.title}</h3>
                <p className="journey__place">{stop.place}</p>

                {stop.tech.length > 0 ? (
                  <ul className="journey__tech">
                    {stop.tech.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : null}

                {stop.work.map((item) => (
                  <div key={item.slug} className="journey__work">
                    <p className="journey__work-head">
                      <b>{item.title}</b>
                      <em data-nda={item.confidential ? 'true' : 'false'}>
                        {item.confidential ? 'Detail under NDA' : 'Public'}
                      </em>
                    </p>

                    {item.contributions.length > 0 ? (
                      <ul className="journey__did">
                        {item.contributions.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}

                {stop.learned ? (
                  <div className="journey__learned">
                    <span>What I took from it</span>
                    {/* The admin is the only author, and the markup was
                        allowlisted on the way into the database rather than
                        trusted on the way out — see asProse above. */}
                    <div
                      className="journey__prose"
                      dangerouslySetInnerHTML={{ __html: asProse(stop.learned) }}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {/*
          The way through, stated rather than left to be discovered.

          A pinned horizontal run reads as a stuck page if you do not already
          know that scrolling drives it sideways — so the hint says so until
          the reader moves it once, and the arrows give a way through that
          needs no gesture at all. Both sit inside the sticky stage, so they
          are on screen for exactly as long as the run is.
        */}
        <div className="journey__nav" data-nudged={nudged ? 'true' : 'false'}>
          <p className="journey__hint" aria-hidden="true">
            <span className="journey__hint-glyph" />
            Scroll to walk the run, or step through it
          </p>

          <div className="journey__steps">
            <button
              type="button"
              className="journey__step"
              onClick={() => goTo(stop - 1)}
              disabled={stop === 0}
              aria-label="Previous stop"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* aria-live so a screen reader is told where it landed; the
                arrows move the page, which is otherwise a silent change. */}
            <p className="journey__count" aria-live="polite">
              <b>{String(stop + 1).padStart(2, '0')}</b>
              <span>/ {String(stops.length).padStart(2, '0')}</span>
            </p>

            <button
              type="button"
              className="journey__step"
              onClick={() => goTo(stop + 1)}
              disabled={stop === stops.length - 1}
              aria-label="Next stop"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pinned to the stage, not the track, so it stays put while the strip
            travels underneath it rather than drifting across the cards. */}
        <div className="journey__rail" aria-hidden="true">
          <span className="journey__line">
            <span ref={barRef} className="journey__bar" />
          </span>
          <ol className="journey__ticks">
            {stops.map((stop, i) => (
              <li
                key={`tick-${stop.title}-${stop.period}`}
                ref={(el) => {
                  tickRefs.current[i] = el;
                }}
              >
                <b>{String(i + 1).padStart(2, '0')}</b>
                <em>{stop.phase ?? 'Education'}</em>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
