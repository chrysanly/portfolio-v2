'use client';

import Link from 'next/link';
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArchitectureNote } from './ArchitectureNote';

/** The longest exit in how-it-works.css: the panel's 180ms close. */
const EXIT_MS = 180;
const EXIT_REDUCED_MS = 200;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "How?" — the header's way into "How this works?" on every route (Chrys,
 * 2026-10-19: "put this in a button"). The five steps were a screen of their
 * own on the home page; they now open here, in a dialog: a wide centred panel
 * on desktop, a bottom sheet on a phone.
 *
 * The only pill in the header. Like the theme toggle it is never hidden by the
 * home hero's hand-off, so it shows from the first paint.
 */
export function HowItWorksButton() {
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="how-btn"
        aria-haspopup="dialog"
        aria-expanded={mounted}
        aria-controls={dialogId}
        aria-label="How? How this site works"
        onClick={() => setMounted(true)}
      >
        <span className="how-btn__pill">
          <span className="how-btn__mark" aria-hidden="true">
            ?
          </span>
          {/* Visually hidden below 480px, where only the "?" shows. */}
          <span className="how-btn__text">How?</span>
        </span>
      </button>
      {mounted ? (
        <HowItWorksDialog
          id={dialogId}
          opener={buttonRef.current}
          onClose={() => setMounted(false)}
        />
      ) : null}
    </>
  );
}

/**
 * The JourneyStopModal mechanics: portalled to body so the journey's pinned
 * stage cannot cover it, focus trapped inside (first on Close), Escape and the
 * scrim close it, the page does not scroll behind it, and focus goes back to
 * the How? button.
 */
function HowItWorksDialog({
  id,
  opener,
  onClose,
}: {
  id: string;
  opener: HTMLElement | null;
  /** Called once the exit has played; the button unmounts the dialog. */
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const closing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // The gutter stays so the page behind does not shift when its scrollbar goes.
  useEffect(() => {
    const html = document.documentElement;
    const before = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    html.style.scrollbarGutter = 'stable';
    html.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    let inner = 0;
    // Two frames, so the closed pose is painted before the transition to open.
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOpen(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      html.style.overflow = before.overflow;
      html.style.scrollbarGutter = before.gutter;
    };
  }, []);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setOpen(false);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => {
        opener?.focus({ preventScroll: true });
        onClose();
      },
      reduce ? EXIT_REDUCED_MS : EXIT_MS,
    );
  }, [opener, onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="hiw-layer" onKeyDown={onKeyDown}>
      <div
        className="hiw-scrim"
        data-open={open ? '' : undefined}
        aria-hidden="true"
        onClick={close}
      />
      <div
        ref={panelRef}
        id={id}
        className="hiw-dialog hiw"
        data-open={open ? '' : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button ref={closeRef} type="button" className="hiw-close" onClick={close}>
          Close
          <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
        <ArchitectureNote headingId={titleId} />
        <p className="hiw-dialog__foot">
          <span>Tap a step for the detail.</span>
          {/* Leaving for /about: no exit to wait for, and focus belongs to the new page. */}
          <Link href="/about" onClick={onClose}>
            More on the About page
          </Link>
        </p>
      </div>
    </div>,
    document.body,
  );
}
