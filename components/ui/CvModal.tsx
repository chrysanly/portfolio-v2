'use client';

import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cvEmbedUrl, cvFileName } from '@/lib/cv';

/** The panel's 280ms exit in app/cv-modal.css; 150ms under reduced motion. */
const EXIT_MS = 280;
const EXIT_REDUCED_MS = 150;
/** A preview that has not loaded by now is shown as failed. */
const LOAD_TIMEOUT_MS = 8000;
const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * The CV, previewed over the hero instead of on its own page (approved
 * HeroActions v1). Opened by the hero's View CV; `/cv` is still where that
 * link goes with no JavaScript or a modified click.
 *
 * Portalled to body. Focus goes to Close, Tab stays inside, Escape, the scrim
 * and Close all close it, and focus returns to the trigger once the exit has
 * played. The page behind does not scroll while it is open.
 */
export function CvModal({
  url,
  title,
  updated,
  opener,
  onClose,
}: {
  url: string;
  title: string;
  /** "October 2026", or null when the backend sent no date. */
  updated: string | null;
  /** Gets focus back after the exit. */
  opener: HTMLElement | null;
  /** Called once the exit has played; the parent unmounts the modal. */
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>('loading');
  const closing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

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

  useEffect(() => {
    if (state !== 'loading') return;
    const id = window.setTimeout(() => setState('error'), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [state]);

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
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
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

  const openInTab = (
    <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path
        d="M8 2h4v4M12 2 6 8M10.5 8.5V12H2V3.5h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );

  return createPortal(
    <div className="cvm" data-open={open ? 'true' : undefined} onKeyDown={onKeyDown}>
      <div className="cvm__scrim" aria-hidden="true" onClick={close} />
      <div
        ref={panelRef}
        className="cvm__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="cvm__head">
          <div className="cvm__titles">
            <h2 id={titleId} className="cvm__t">
              {title}
            </h2>
            <p className="cvm__s">PDF{updated ? ` · Updated ${updated}` : ''}</p>
          </div>
          <div className="cvm__act">
            <a className="cvm__btn" href={url} download={cvFileName(url)} aria-label="Download CV">
              <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <path
                  d="M7 1v8m-3.5-3L7 9.5 10.5 6M2 12.5h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="cvm__lbl">Download</span>
            </a>
            <a
              className="cvm__btn"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open CV in a new tab"
            >
              {openInTab}
              <span className="cvm__lbl">Open in new tab</span>
            </a>
            <button
              ref={closeRef}
              type="button"
              className="cvm__btn cvm__close"
              aria-label="Close CV"
              onClick={close}
            >
              <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        </header>

        <div className="cvm__body" data-state={state}>
          {state !== 'error' ? (
            <iframe
              title={`${title} preview`}
              src={cvEmbedUrl(url, 100)}
              onLoad={() => setState('ready')}
              onError={() => setState('error')}
            />
          ) : null}
          {state === 'loading' ? (
            <div className="cvm__load" role="status">
              <div className="cvm__sheet" aria-hidden="true" />
              <p>Loading the CV…</p>
            </div>
          ) : null}
          {state === 'error' ? (
            <div className="cvm__err" role="alert">
              <p className="cvm__err-t">The preview didn’t load.</p>
              <p>Your browser may block PDFs inside a page. Open or download it instead.</p>
              <a className="button button--cv" href={url} target="_blank" rel="noopener noreferrer">
                Open in new tab
                {openInTab}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
