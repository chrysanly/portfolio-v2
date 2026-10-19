'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { animate, useReducedMotion } from 'framer-motion';
import '@/app/photo-lightbox.css';

/**
 * The ID card's photo, held up to the light.
 *
 * A measured FLIP rather than `layoutId`: the badge is moved every frame by
 * the lanyard's own solver (an inline `rotate() rotateY()` transform Framer
 * knows nothing about), so Framer's projection would measure a box that is
 * already somewhere else. Here the photo's on-screen centre, its untransformed
 * width and the card's tilt are read at the moment of opening — and again at
 * closing, because the card keeps swinging while the photo is up — and the
 * large frame animates from that spot to its own with transform alone.
 *
 * Open is a spring with a small overshoot; close is critically damped, so the
 * photo lands back in the badge rather than bouncing past it. Either can be
 * interrupted by the other: a reopen mid-close starts from wherever the frame
 * is, not from the card.
 *
 * Under reduced motion there is no grow at all — the layer fades in and out.
 */

const OPEN = { type: 'spring', duration: 0.36, bounce: 0.2 } as const;
const CLOSE = { type: 'spring', duration: 0.3, bounce: 0 } as const;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  /** The photo button on the card: the shape grows from it and focus returns to it. */
  sourceRef: RefObject<HTMLElement | null>;
  /** The card's current tilt in degrees, so the photo leaves at the angle it hangs. */
  getTilt: () => number;
  fullName: string;
  role: string;
  portrait: string | null;
  initials: string;
}

/** Where the large frame must start for it to sit exactly over the card's photo. */
function flipFrom(source: HTMLElement, stage: HTMLElement, tilt: number) {
  const from = source.getBoundingClientRect();
  const to = stage.getBoundingClientRect();
  return {
    x: from.left + from.width / 2 - (to.left + to.width / 2),
    y: from.top + from.height / 2 - (to.top + to.height / 2),
    // offsetWidth, not the rect: the card is rotated and the rect is its
    // bounding box, which is wider than the photo.
    scale: source.offsetWidth / (stage.offsetWidth || 1),
    rotate: tilt,
  };
}

interface ScrollLock {
  overflow: string;
  gutter: string;
  padding: string;
}

/**
 * Stops the page scrolling without the page moving. Hiding the scrollbar
 * would widen the viewport by its width and shift everything sideways, so
 * its gutter is kept (or, where scrollbar-gutter is unsupported, padded).
 */
function lockScroll(): ScrollLock {
  const html = document.documentElement;
  const body = document.body;
  const saved = {
    overflow: html.style.overflow,
    gutter: html.style.scrollbarGutter,
    padding: body.style.paddingRight,
  };
  const gap = window.innerWidth - html.clientWidth;
  html.style.overflow = 'hidden';
  if (gap > 0) {
    if (CSS.supports('scrollbar-gutter', 'stable')) html.style.scrollbarGutter = 'stable';
    else body.style.paddingRight = `${gap}px`;
  }
  return saved;
}

function unlockScroll(saved: ScrollLock) {
  document.documentElement.style.overflow = saved.overflow;
  document.documentElement.style.scrollbarGutter = saved.gutter;
  document.body.style.paddingRight = saved.padding;
}

export function PhotoLightbox({
  open,
  onClose,
  sourceRef,
  getTilt,
  fullName,
  role,
  portrait,
  initials,
}: Props) {
  const reduced = useReducedMotion() ?? false;
  const titleId = useId();

  /*
   * `leaving` keeps the dialog mounted through its close animation. It is set
   * during render, not in an effect, so the frame is never unmounted for the
   * one commit between `open` turning false and an effect noticing.
   */
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setLeaving(!open);
  }
  const shown = open || leaving;

  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  /** True from the start of an open until a close has fully finished. */
  const live = useRef(false);
  const run = useRef(0);
  const scroll = useRef<ScrollLock | null>(null);

  const tiltRef = useRef(getTilt);
  tiltRef.current = getTilt;

  useLayoutEffect(() => {
    const source = sourceRef.current;
    const backdrop = backdropRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    const caption = captionRef.current;
    const close = closeRef.current;
    if (!source || !backdrop || !stage || !frame || !caption || !close) return;

    const token = ++run.current;

    if (open) {
      const interrupted = live.current;
      live.current = true;
      if (!scroll.current) scroll.current = lockScroll();
      close.focus({ preventScroll: true });

      if (reduced) {
        const fade = { duration: 0.18, ease: EASE_OUT };
        frame.style.transform = 'none';
        if (!interrupted) frame.style.opacity = '0';
        for (const el of [backdrop, frame, caption, close]) {
          animate(el, { opacity: interrupted ? 1 : [0, 1] }, fade);
        }
        return;
      }

      // The large frame stands in for the card's photo, so the card's goes.
      source.dataset.lifted = 'true';

      if (interrupted) {
        animate(frame, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }, OPEN);
        animate(caption, { opacity: 1, y: 0 }, { duration: 0.24, ease: EASE_OUT });
      } else {
        const f = flipFrom(source, stage, tiltRef.current());
        // Placed before the first paint, so the frame is never seen centred.
        frame.style.transform = `translate(${f.x}px, ${f.y}px) scale(${f.scale}) rotate(${f.rotate}deg)`;
        animate(
          frame,
          { x: [f.x, 0], y: [f.y, 0], scale: [f.scale, 1], rotate: [f.rotate, 0] },
          OPEN,
        );
        animate(
          caption,
          { opacity: [0, 1], y: [8, 0] },
          { duration: 0.26, delay: 0.12, ease: EASE_OUT },
        );
      }
      animate(backdrop, { opacity: 1 }, { duration: 0.28, ease: EASE_OUT });
      animate(close, { opacity: 1 }, { duration: 0.2, delay: 0.1, ease: EASE_OUT });
      return;
    }

    if (!live.current) return;

    // Focus goes home at once, not after the animation: the dialog is inert
    // from here, and a keyboard user should not be left inside it.
    source.focus({ preventScroll: true });

    const finish = () => {
      if (token !== run.current) return; // reopened meanwhile
      live.current = false;
      delete source.dataset.lifted;
      if (scroll.current) unlockScroll(scroll.current);
      scroll.current = null;
      setLeaving(false);
    };

    if (reduced) {
      const fade = { duration: 0.14, ease: EASE_IN };
      for (const el of [backdrop, caption, close]) animate(el, { opacity: 0 }, fade);
      animate(frame, { opacity: 0 }, fade).then(finish);
      return;
    }

    const f = flipFrom(source, stage, tiltRef.current());
    animate(caption, { opacity: 0 }, { duration: 0.12, ease: EASE_IN });
    animate(close, { opacity: 0 }, { duration: 0.12, ease: EASE_IN });
    animate(backdrop, { opacity: 0 }, { duration: 0.24, ease: EASE_IN });
    animate(frame, { x: f.x, y: f.y, scale: f.scale, rotate: f.rotate }, CLOSE).then(finish);
    // `reduced` is read at the moment of a transition on purpose; a change to
    // it mid-transition must not replay one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If the card unmounts with the photo up, the page must not stay locked.
  useEffect(
    () => () => {
      if (scroll.current) unlockScroll(scroll.current);
      delete sourceRef.current?.dataset.lifted;
    },
    [sourceRef],
  );

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      // The trap. The close button is the only stop today, but this cycles
      // whatever is focusable so a link added to the caption later still works.
      const dialog = dialogRef.current;
      if (!dialog) return;
      const stops = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!shown || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-leaving={open ? undefined : 'true'}
      inert={!open}
    >
      <div
        ref={backdropRef}
        className="photo-lightbox__backdrop"
        style={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="photo-lightbox__content">
        <div ref={stageRef} className="photo-lightbox__stage">
          <div ref={frameRef} className="photo-lightbox__frame">
            {portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={portrait} alt={fullName} draggable={false} />
            ) : (
              <span className="photo-lightbox__monogram" aria-hidden="true">
                {initials}
              </span>
            )}
          </div>
        </div>

        <div ref={captionRef} className="photo-lightbox__caption" style={{ opacity: 0 }}>
          <p id={titleId} className="photo-lightbox__name">
            {fullName}
          </p>
          <p className="photo-lightbox__role">{role}</p>
        </div>
      </div>

      <button
        ref={closeRef}
        type="button"
        className="photo-lightbox__close"
        style={{ opacity: 0 }}
        onClick={onClose}
        aria-label="Close photo"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
