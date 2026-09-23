'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { animateScrollTo } from '@/lib/scrollJump';

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

/*
 * The native `behavior: 'smooth'` scroll used here originally left the
 * button feeling laggy: its duration scales with distance, so a jump of a
 * few screens took visibly longer to land than a single click on a stepper
 * control should. A fixed, short duration reads as immediate regardless of
 * how far the target is — which is the point of a Next/Previous control in
 * the first place, skipping the scroll rather than a slow version of it.
 */
const JUMP_MS = 420;

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
/*
 * The hero's own hold-then-reveal sequence is two stops, "Hero" and
 * "Details" — but both live inside one pinned box, so neither has a DOM
 * position that means anything as a scroll offset (see the "Details" case in
 * measure() below). Nearest-top can't place either one, and worse, the
 * showcase right after them is pulled up by `margin-top: -88svh`
 * (globals.css) to sit over the hero's emptied stage, which puts *its* DOM
 * top near the hero's midpoint too — nearest-top alone would call "Selected
 * work" current while the ledger and ID card are still fully opaque, for
 * roughly half a viewport of scroll.
 *
 * So while the hero hasn't fully cleared, the current stop is read directly
 * off `data-hero-stage` instead of off any DOM position at all. That flag
 * turns 'done' at CLEAR_TO — when the ledger has actually finished fading
 * out — not at `data-hero-handoff`, which is a different, earlier threshold
 * tuned for the header's own crossfade. Using handoff here used to call
 * "Selected work" current while the ledger was still up to ~65% opaque, for
 * the gap between the two thresholds — worth its own flag rather than
 * borrowing one meant for something else. Once 'done', nearest-top over the
 * real sections works exactly as it always did; Hero and Details are far up
 * the page by then and are never the nearest thing regardless.
 */
function heroSubIndex(): number | null {
  if (!document.querySelector('.hero')) return null;
  const stage = document.documentElement.dataset.heroStage;
  if (stage === 'done' || stage === undefined) return null;
  /*
   * One stop, not two. "Hero" and "Details" were separate because the ledger
   * only existed part-way through a scroll-driven sequence; the gate plays
   * that sequence before any scrolling, so both describe the same position —
   * the top of the page. Keeping them split gave the pager a stop it could
   * never make current and a jump that landed mid-sequence with the masthead
   * clipped against the stage, which is what Chrys photographed.
   */
  return 0;
}

/*
 * Same shape of problem as the hero, one section later: the showcase is a
 * single pinned track with one project per slot, so "Next" from Details used
 * to jump straight past every panel but the first and land on Journey — the
 * opposite of what a showcase is for. `data-showcase-active`/
 * `data-showcase-panel` (WorkShowcase, kept live by a plain scroll listener)
 * say which of the panel stops built into `stops` — see measure() — is
 * current. `stops` may hold zero, one (no projects, or not yet measured) or
 * many entries labelled "Selected work"; the first one found is where the
 * panel index lands.
 */
function showcaseSubIndex(stops: Stop[]): number | null {
  if (document.documentElement.dataset.showcaseActive !== 'on') return null;
  const first = stops.findIndex((s) => s.label.startsWith('Selected work'));
  if (first === -1) return null;
  const panel = Number(document.documentElement.dataset.showcasePanel ?? '0');
  return first + panel;
}

/*
 * Same treatment, one section later: the journey is a single pinned strip
 * with one card per stop, so "Next" from the showcase used to jump straight
 * past every stop but the first and land on Tech stack. `data-journey-active`/
 * `data-journey-stop` (JourneyTimeline, kept live the same way as the
 * showcase's) say which of the card stops is current.
 */
function journeySubIndex(stops: Stop[]): number | null {
  if (document.documentElement.dataset.journeyActive !== 'on') return null;
  const first = stops.findIndex((s) => s.label.startsWith('Journey'));
  if (first === -1) return null;
  const stop = Number(document.documentElement.dataset.journeyStop ?? '0');
  return first + stop;
}

function currentIndex(stops: Stop[]): number {
  if (stops.length === 0) return 0;

  /*
   * Showcase before hero, deliberately: `data-showcase-active` comes from a
   * plain scroll listener reading real geometry, so it's already correct
   * the instant the raw scroll position enters the showcase's range.
   * `data-hero-stage` comes from MastheadHero's own spring, a completely
   * separate one from the showcase's — after a large jump (this pager's own
   * "go()"), that spring can still be many frames from reaching 'done' even
   * though the raw scroll has already landed deep inside the showcase. In
   * that gap, trusting the hero over the showcase read back as "Details"
   * for the better part of a second after actually arriving at "Selected
   * work" — checking showcase first means an already-correct, geometry-based
   * answer never waits on an unrelated spring that hasn't caught up yet.
   */
  const showcaseIndex = showcaseSubIndex(stops);
  if (showcaseIndex !== null) return showcaseIndex;

  const journeyIndex = journeySubIndex(stops);
  if (journeyIndex !== null) return journeyIndex;

  const heroIndex = heroSubIndex();
  if (heroIndex !== null) return heroIndex;

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
  /*
   * A stop whose own top exceeds `maxScroll()` — a short section squeezed
   * right before the last one, with too little room to ever be centred in
   * its own right — can never be reached exactly; the jump lands at
   * maxScroll instead, a few px short. `currentIndex`'s "at the bottom"
   * case then reads that landing as the *next* stop, correctly for natural
   * scrolling (it really is more of the viewport by then) but wrongly for
   * a deliberate jump to the short one — Tech stack, one click away from
   * Journey, read back as Contact the instant it landed. Sticky here means
   * the clicked-to stop stays current for as long as the page is still
   * pinned at the bottom, and only natural scrolling away from the bottom
   * (or another jump) hands control back to the normal computation.
   */
  const stickyIndex = useRef<number | null>(null);

  const measure = useCallback(() => {
    const found: Stop[] = [];

    document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
      const label = el.dataset.section ?? '';

      /*
       * The showcase (one project per pinned slot) and the journey (one
       * card per pinned slot) both mark their sub-stops with
       * `data-substep-title`/`data-substep-y` — WorkShowcase.tsx and
       * JourneyTimeline.tsx explain why each needs its own pixel target
       * rather than the single generic DOM top this element would otherwise
       * contribute. Expand into one titled stop per substep wherever they're
       * found; a section with none (Selected work with zero projects, or
       * before either component has finished its own measuring pass) falls
       * through to the generic single-stop case below like any other
       * section.
       */
      const substeps = [...el.querySelectorAll<HTMLElement>('[data-substep-title]')];
      if (substeps.length > 0) {
        substeps.forEach((sub, i) => {
          const title = sub.dataset.substepTitle ?? '';
          const y = Number(sub.dataset.substepY);
          const top = Number.isFinite(y) ? y : sub.getBoundingClientRect().top + window.scrollY;
          found.push({
            id: `${label}-${i}`,
            label: title ? `${label} — ${title}` : label,
            top,
          });
        });
        return;
      }

      const top = el.getBoundingClientRect().top + window.scrollY;

      found.push({ id: el.id || label, label, top });
    });

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

    const recompute = () => {
      if (jumping.current) return;

      if (stickyIndex.current !== null) {
        if (window.scrollY < maxScroll() - 4) {
          stickyIndex.current = null;
        } else {
          setIndex(stickyIndex.current);
          return;
        }
      }

      setStops((current) => {
        setIndex(currentIndex(current));
        return current;
      });
    };

    window.addEventListener('scroll', recompute, { passive: true });
    recompute();

    /*
     * `data-hero-stage` and `data-showcase-active`/`-panel` change on every
     * animation frame while the hero's and the showcase's springs settle —
     * which keeps going for a few hundred ms after the scroll itself has
     * stopped. A single abrupt jump (this component's own "go()", a
     * scrollbar drag, a fast flick-and-release) fires exactly one 'scroll'
     * event, at which point those attributes still hold their *pre-jump*
     * value; recompute() run only from that event freezes the label there
     * for good, since nothing scrolls again to trigger a second look. This
     * mirrors that recompute against the attributes themselves, so the
     * label still catches up once the spring settles even though the page
     * has gone still.
     */
    const attrObserver = new MutationObserver(recompute);
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-hero-stage',
        'data-showcase-active',
        'data-showcase-panel',
        'data-journey-active',
        'data-journey-stop',
      ],
    });

    return () => {
      observer.disconnect();
      attrObserver.disconnect();
      window.removeEventListener('scroll', recompute);
    };
  }, [measure]);

  const go = (to: number) => {
    const stop = stops[to];
    if (!stop) return;

    // The scroll handler is muted until the jump lands, or it would fight
    // the jump and flicker the label through every section on the way.
    jumping.current = true;
    setIndex(to);

    const unreachable = stop.top > maxScroll();
    stickyIndex.current = unreachable ? to : null;

    void animateScrollTo(Math.min(stop.top, maxScroll()), JUMP_MS);

    if (unreachable) {
      /*
       * A stop this short of the bottom edge briefly satisfies the normal
       * nearest-top computation *before* the scroll animation finishes its
       * last few pixels toward maxScroll — polling would agree and unmute
       * early, and the tail end of the very same animation then fires more
       * scroll events which read as "moved away from the bottom" and clear
       * `stickyIndex` before it ever had a chance to matter. Waiting out
       * the animation's own fixed duration instead means unmuting only
       * happens once truly settled, with nothing left to misread as a
       * later, genuine scroll away from the bottom.
       */
      window.setTimeout(() => {
        jumping.current = false;
      }, JUMP_MS + 80);
      return;
    }

    /*
     * Unmuting on a fixed delay, or even on the scroll actually stopping,
     * both turned out wrong: raw scrolling finishing is not the same moment
     * as `data-hero-stage`/`data-showcase-panel` catching up to it, because
     * both are driven by a spring trailing the scroll, not the scroll
     * itself. Unmute right when the raw motion ends and the very next
     * recompute reads the spring's *still-in-flight* value — recomputing a
     * stop short of the one just clicked to, before the spring finishes and
     * the mutation observer above corrects it a moment later. Visually,
     * that is the label reverting and then fixing itself.
     *
     * Polling `currentIndex` directly sidesteps the whole timing question:
     * stay muted for exactly as long as the real computation disagrees with
     * where this jump is headed, however long that turns out to be, with a
     * backstop for the case where it never agrees at all.
     */
    const deadline = performance.now() + 1500;
    const poll = () => {
      if (currentIndex(stops) === to || performance.now() >= deadline) {
        jumping.current = false;
        return;
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
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
