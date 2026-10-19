'use client';

import { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { JourneyChapter } from './journey-engine.mjs';

const PLACEHOLDER = /^\s*\[.*\]\s*$/;
/** The longest exit in app/journey.css: the sheet's 220ms slide down. */
const EXIT_MS = 220;
const EXIT_REDUCED_MS = 160;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Everything a journey card leaves out: the full summary, every "What I did"
 * line, the tools, all of "What I took from it", and what was built there.
 * Opened by a card's View more (journey-engine.mjs calls `onMore`).
 *
 * Centred on laptop and tablet, a bottom sheet on a phone. Portalled to body
 * so the journey's pinned stage and shadow root cannot clip it. Focus is
 * trapped inside, Escape and the backdrop close it, and focus goes back to
 * the View more that opened it. Every word is the stop's own data.
 */
export function JourneyStopModal({
  chapter,
  opener,
  onClose,
  onNavigate,
}: {
  chapter: JourneyChapter;
  opener: HTMLElement | null;
  /** Called once the exit has played; the parent unmounts the modal. */
  onClose: () => void;
  /** Route a "Built here" link through the app's router. */
  onNavigate: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const closing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Only the page scrolls, and not while this is open. The gutter stays so
  // the page behind does not shift sideways when its scrollbar goes.
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

  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closing.current = true;
    onClose();
    onNavigate(href);
  };

  const c = chapter;
  const did = c.did ?? [];
  const tools = c.tools ?? [];
  const learned = c.learned;

  return createPortal(
    <div className="jsm" data-open={open ? 'true' : undefined} onKeyDown={onKeyDown}>
      <div className="jsm__scrim" aria-hidden="true" onClick={close} />
      <div
        ref={panelRef}
        className="jsm__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <span className="jsm__grip" aria-hidden="true" />
        <div className="jsm__head">
          <p className="jsm__kind">
            {c.kind === 'education' ? (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M1 6l7-3 7 3-7 3-7-3zm3 1.5V11c1 1 2.5 1.5 4 1.5s3-.5 4-1.5V7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 5h12v8H2zM6 5V3h4v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            )}
            {c.kind === 'education' ? 'School' : 'Work'}
          </p>
          <h2 id={titleId} className="jsm__title">
            {c.title}
          </h2>
          <p className="jsm__org">{c.org}</p>
          <button
            ref={closeRef}
            type="button"
            className="jsm__x"
            aria-label="Close details"
            onClick={close}
          >
            <svg viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>

        <div className="jsm__body">
          <div className="jsm__facts">
            <div>
              <p className="jsm__lbl">When</p>
              <p className="jsm__val jsm__val--mono">{c.period}</p>
            </div>
            <div>
              <p className="jsm__lbl">Where</p>
              <p className="jsm__val">{c.loc}</p>
            </div>
            {c.sector ? (
              <div>
                <p className="jsm__lbl">Sector</p>
                <p className="jsm__val">{c.sector}</p>
              </div>
            ) : null}
          </div>

          {c.short ? <p className="jsm__short">{c.short}</p> : null}

          {did.length > 0 ? (
            <div className="jsm__sec">
              <p className="jsm__lbl">What I did</p>
              <ul className="jsm__did">
                {did.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {tools.length > 0 ? (
            <div className="jsm__sec">
              <p className="jsm__lbl">Tools</p>
              <ul className="jsm__tools">
                {tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {learned ? (
            <div className="jsm__sec">
              <p className="jsm__lbl">What I took from it</p>
              {PLACEHOLDER.test(learned) ? (
                <p className="jsm__ph">{learned}</p>
              ) : c.learnedIsHtml ? (
                // Sanitised by the admin against an allowlist (App\Services\RichText).
                <div className="jsm__learned" dangerouslySetInnerHTML={{ __html: learned }} />
              ) : (
                <p className="jsm__learned">{learned}</p>
              )}
            </div>
          ) : null}

          <div className="jsm__sec">
            <p className="jsm__lbl">Built here</p>
            {c.projects.length > 0 ? (
              <div className="jsm__built">
                {c.projects.map((p) => (
                  <a key={p.href} href={p.href} onClick={(e) => go(e, p.href)}>
                    {p.title}
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </a>
                ))}
              </div>
            ) : (
              <p className="jsm__empty">No public project from this stop.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
