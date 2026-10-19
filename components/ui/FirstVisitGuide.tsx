'use client';

import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { isSlow, sampleFrames } from '@/lib/frame-watch';
import { isTextureOn, onTextureChange, setTexture } from '@/lib/texture';
import {
  ACCENT_PICK_EVENT,
  GUIDE_SEEN_KEY,
  type Box,
  placeCard,
  type Side,
  TOUR_MENU_EVENT,
} from '@/lib/tour';

/** The tour waits this long after load, so it never lands on the splash. */
const START_MS = 900;
/** The card's exit in guide.css; the next step is laid out after it. */
const OUT_MS = 140;
/** The lag notice's close in guide.css. */
const LAG_OUT_MS = 200;
/** How long "Texture off." stays before the notice closes itself. */
const LAG_DONE_MS = 2400;
/** Frames per sample, and samples per visit, before the watch gives up. */
const LAG_FRAMES = 60;
const LAG_TRIES = 3;
const LAG_ASKED_KEY = 'lag-asked';

interface Step {
  id: 'scroll' | 'colour' | 'texture' | 'how';
  /** Every element the ring wraps; the step is dropped if the first is missing. */
  targets: string[];
  side: Side;
  pill?: boolean;
  /** The tour holds the Accent menu open for this step. */
  menu?: boolean;
  title: string;
  body: ReactNode;
}

function buildSteps(coarse: boolean): Step[] {
  return [
    {
      id: 'scroll',
      targets: ['.hero__cue'],
      side: 'top',
      title: coarse ? 'Swipe up to begin.' : 'Scroll to begin.',
      body: 'The story plays as you move down the page, one stop at a time.',
    },
    {
      id: 'colour',
      targets: ['.accent-picker__trigger', '.accent-picker__menu'],
      side: 'left',
      menu: true,
      title: 'Pick your colour.',
      body: (
        <>
          Open <b>Accent</b> and choose a colour. The whole site takes it on. Try one now.
        </>
      ),
    },
    {
      id: 'texture',
      targets: ['.accent-picker__trigger', '.accent-picker__toggle'],
      side: 'left',
      menu: true,
      title: 'Slow? Switch off Texture.',
      body: (
        <>
          The faceted background is the heaviest thing here. If scrolling stutters, turn{' '}
          <b>Texture</b> off. Your choice is remembered.
        </>
      ),
    },
    {
      id: 'how',
      targets: ['.how-btn__pill'],
      side: 'bottom',
      pill: true,
      title: 'See how it’s built.',
      body: (
        <>
          <b>How?</b> shows how the admin, the API and this site fit together. Open it now or any
          time from the top.
        </>
      ),
    },
  ];
}

/** The ring's box: the step's last target, or for Colour, menu and trigger together. */
function targetBox(step: Step): Box | null {
  const selectors = step.id === 'texture' ? step.targets.slice(1) : step.targets;
  const rects = selectors
    .map((s) => document.querySelector(s)?.getBoundingClientRect())
    .filter((r): r is DOMRect => Boolean(r && r.width && r.height));
  if (rects.length === 0) return null;
  return {
    left: Math.min(...rects.map((r) => r.left)),
    top: Math.min(...rects.map((r) => r.top)),
    right: Math.max(...rects.map((r) => r.right)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
}

function storage(kind: 'local' | 'session') {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

const tellMenu = (take: boolean) =>
  window.dispatchEvent(new CustomEvent<boolean>(TOUR_MENU_EVENT, { detail: take }));

/**
 * The first-visit tour (four coach marks on the real controls), then the lag
 * notice. Never both at once: frames are only sampled once the tour is over.
 */
export function FirstVisitGuide() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(-1);
  const [show, setShow] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [lag, setLag] = useState<'ask' | 'done' | null>(null);
  const [lagOpen, setLagOpen] = useState(false);

  const ringRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const lagPrimaryRef = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);
  const menuHeld = useRef(false);
  const ending = useRef(false);
  const titleId = useId();
  const bodyId = useId();
  const lagTitleId = useId();
  const lagBodyId = useId();

  const step = index >= 0 ? steps[index] : null;
  const active = step !== null;

  const holdMenu = useCallback((take: boolean) => {
    if (menuHeld.current === take) return;
    menuHeld.current = take;
    tellMenu(take);
  }, []);

  /* ----- the lag watch ---------------------------------------------------- */

  const closeLag = useCallback(() => {
    setLagOpen(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLag(null), LAG_OUT_MS);
  }, []);

  const watchLag = useCallback(() => {
    const motionOn = () => document.documentElement.dataset.motion === 'on';
    if (!motionOn() || !isTextureOn() || storage('session')?.getItem(LAG_ASKED_KEY)) return;

    let tries = 0;
    let cancel = () => {};
    // Sampled while the page scrolls: that is when the texture is repainted.
    const onScroll = () => {
      window.removeEventListener('scroll', onScroll);
      cancel = sampleFrames(LAG_FRAMES, (times) => {
        if (!isTextureOn() || !motionOn()) return;
        if (isSlow(times)) {
          storage('session')?.setItem(LAG_ASKED_KEY, '1');
          setLag('ask');
          return;
        }
        if (++tries < LAG_TRIES) window.addEventListener('scroll', onScroll, { passive: true });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancel();
    };
  }, []);

  const [lagWatching, setLagWatching] = useState(false);
  useEffect(() => (lagWatching ? watchLag() : undefined), [lagWatching, watchLag]);

  // Opened on the next frame, so the closed pose paints before the transition.
  useEffect(() => {
    if (lag !== 'ask') return;
    const id = requestAnimationFrame(() => {
      setLagOpen(true);
      lagPrimaryRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [lag]);

  /* ----- the tour --------------------------------------------------------- */

  const place = useCallback(() => {
    const ring = ringRef.current;
    const card = cardRef.current;
    if (!step || !ring || !card) return;
    const box = targetBox(step);
    if (!box) return;

    const pad = step.pill ? 4 : 6;
    const padded = {
      left: box.left - pad,
      top: box.top - pad,
      right: box.right + pad,
      bottom: box.bottom + pad,
    };
    Object.assign(ring.style, {
      left: `${padded.left}px`,
      top: `${padded.top}px`,
      width: `${padded.right - padded.left}px`,
      height: `${padded.bottom - padded.top}px`,
    });

    const at = placeCard(
      padded,
      step.side,
      { width: card.offsetWidth, height: card.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    card.style.left = `${at.x}px`;
    card.style.top = `${at.y}px`;
    card.style.setProperty('--from-x', `${at.fromX}px`);
    card.style.setProperty('--from-y', `${at.fromY}px`);
  }, [step]);

  const go = useCallback(
    (next: number) => {
      setShow(false);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => {
          setIndex(next);
          setNote(null);
          holdMenu(Boolean(steps[next].menu));
        },
        active ? OUT_MS : 0,
      );
    },
    [active, steps, holdMenu],
  );

  const end = useCallback(() => {
    if (ending.current) return;
    ending.current = true;
    setShow(false);
    holdMenu(false);
    storage('local')?.setItem(GUIDE_SEEN_KEY, '1');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setIndex(-1);
      setLagWatching(true);
    }, OUT_MS);
  }, [holdMenu]);

  // First visit: the tour, after a beat. A returning visitor goes straight to the watch.
  useEffect(() => {
    if (storage('local')?.getItem(GUIDE_SEEN_KEY)) {
      setLagWatching(true);
      return;
    }
    const id = window.setTimeout(() => {
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const found = buildSteps(coarse).filter((s) => document.querySelector(s.targets[0]));
      if (found.length === 0) {
        setLagWatching(true);
        return;
      }
      setSteps(found);
      setIndex(0);
      holdMenu(Boolean(found[0].menu));
    }, START_MS);
    return () => window.clearTimeout(id);
  }, [holdMenu]);

  // Each step: wait two frames for the menu to render, lay out, then fade in.
  useEffect(() => {
    if (!active) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        place();
        setShow(true);
        primaryRef.current?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [active, index, place]);

  // A confirmation line changes the card's height.
  useLayoutEffect(() => {
    if (show) place();
  }, [note, show, place]);

  // Follow the target through resizes and scrolls.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove);
    };
  }, [active, place]);

  // Live feedback from the real controls on the Colour and Texture steps.
  useEffect(() => {
    if (step?.id === 'colour') {
      const onPick = (event: Event) =>
        setNote(`${(event as CustomEvent<string>).detail} it is. Next: the texture.`);
      window.addEventListener(ACCENT_PICK_EVENT, onPick);
      return () => window.removeEventListener(ACCENT_PICK_EVENT, onPick);
    }
    if (step?.id === 'texture') {
      return onTextureChange((on) => setNote(on ? 'Texture on.' : 'Texture off. Flip it back any time.'));
    }
  }, [step]);

  // Escape ends the tour; clicking the real How? pill ends it and opens the dialog.
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') end();
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('.how-btn')) end();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, end]);

  // The lag notice closes on Escape too.
  useEffect(() => {
    if (!lag) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLag();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lag, closeLag]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function openHow() {
    end();
    document.querySelector<HTMLButtonElement>('.how-btn')?.click();
  }

  function switchOff() {
    setTexture(false);
    setLag('done');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(closeLag, LAG_DONE_MS);
  }

  const last = index === steps.length - 1;

  return (
    <>
      {step ? (
        <>
          <div
            ref={ringRef}
            className="tour-ring"
            data-pill={step.pill ? '' : undefined}
            data-show={show ? '' : undefined}
            aria-hidden="true"
          />
          <section
            ref={cardRef}
            className="tour-card"
            data-show={show ? '' : undefined}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
          >
            <div className="tour-card__top">
              <p className="tour-card__eyebrow">Quick tour</p>
              <span className="tour-card__count">
                {index + 1} / {steps.length}
              </span>
            </div>
            <h2 className="tour-card__title" id={titleId}>
              {step.title}
            </h2>
            <p className="tour-card__body" id={bodyId} aria-live="polite">
              {step.body}
            </p>
            {note ? (
              <p className="tour-card__done" role="status">
                <i aria-hidden="true" />
                {note}
              </p>
            ) : null}
            <ul className="tour-card__dots" aria-hidden="true">
              {steps.map((s, k) => (
                <li key={s.id} data-on={k <= index ? '' : undefined} />
              ))}
            </ul>
            <div className="tour-card__actions">
              <button type="button" className="tour-skip" onClick={end}>
                Skip tour
              </button>
              {index > 0 ? (
                <button type="button" className="tour-btn tour-btn--ghost" onClick={() => go(index - 1)}>
                  Back
                </button>
              ) : null}
              {last && step.id === 'how' ? (
                <button type="button" className="tour-btn tour-btn--ghost" onClick={openHow}>
                  Open How?
                </button>
              ) : null}
              <button
                ref={primaryRef}
                type="button"
                className="tour-btn tour-btn--primary"
                onClick={() => (last ? end() : go(index + 1))}
              >
                {last ? 'Done' : 'Next'}
              </button>
            </div>
          </section>
        </>
      ) : null}

      {lag ? (
        <section
          className="lag-notice"
          data-open={lagOpen ? '' : undefined}
          role="dialog"
          aria-modal="false"
          aria-labelledby={lagTitleId}
          aria-describedby={lagBodyId}
        >
          {lag === 'ask' ? (
            <>
              <h2 className="lag-notice__title" id={lagTitleId}>
                Feeling slow? Switch off the texture.
              </h2>
              <p className="lag-notice__body" id={lagBodyId}>
                The faceted background is the heaviest thing on the page. You can turn it back on
                any time under Accent.
              </p>
              <div className="lag-notice__actions">
                <button type="button" className="tour-btn tour-btn--ghost" onClick={closeLag}>
                  Keep it
                </button>
                <button
                  ref={lagPrimaryRef}
                  type="button"
                  className="tour-btn tour-btn--primary"
                  onClick={switchOff}
                >
                  Switch off texture
                </button>
              </div>
            </>
          ) : (
            <p className="lag-notice__done" role="status" id={lagBodyId}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
              <span id={lagTitleId}>Texture off. It’s under Accent if you want it back.</span>
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}
