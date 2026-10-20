'use client';

import Link from 'next/link';
import { type MouseEvent, useCallback, useState } from 'react';
import { updatedLabel } from '@/lib/cv';
import type { Profile } from '@/lib/profile';
import { animateScrollTo, easeInOutCubic } from '@/lib/scrollJump';
import { CvModal } from './CvModal';

/*
 * Long enough that the hand-over — ledger out, header in, first panel in —
 * reads as one move rather than a cut. The native smooth scroll this replaces
 * took ~400ms for the same distance, and the hero could not keep up with it.
 */
const TO_WORK_MS = 1000;

/**
 * The hero's two ways forward: the work, and the CV.
 *
 * Asked for on 2026-09-22 as "View My Work | Download CV". The first is the
 * site's own centrepiece, the second is the thing a recruiter reaches for in
 * the first ten seconds and which the site had no answer for at all.
 *
 * A client component because of where "View my work" has to land — see
 * `showcaseTarget`. It renders inside the animated hero (a client tree) and
 * inside the resolved static intro (a server tree). Its one piece of state is
 * whether the CV modal is open.
 */

/**
 * Where the work actually becomes visible, which is not the top of its
 * section.
 *
 * `href="#showcase"` landed on the showcase *track*'s first pixel, and at that
 * offset no panel has entered yet — the first one reveals over the opening
 * stretch of its own slot. The result was a click into a blank screen, which
 * is what Chrys photographed.
 *
 * WorkShowcase already measures the right offsets and writes them to each
 * panel as `data-substep-y` (the midpoint of its slot: past its entrance,
 * before its exit) for the section pager to use. The first of those is the
 * answer here too, so the two controls agree about where "the work" is.
 *
 * Falls back to the element's own top when the showcase has not measured (or
 * is not there at all, as with reduced motion, where the plain list is what
 * follows), and the anchor's own href is what happens with no JavaScript.
 */
function showcaseTarget(): number | null {
  const panel = document.querySelector<HTMLElement>('.ptext[data-substep-y]');
  const measured = Number(panel?.dataset.substepY);

  if (Number.isFinite(measured) && measured > 0) return measured;

  const section = document.getElementById('showcase');
  if (!section) return null;

  return section.getBoundingClientRect().top + window.scrollY;
}

function goToWork(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const top = showcaseTarget();
  if (top === null) return;
  event.preventDefault();
  /*
   * Animated here, and with the hash left alone. Setting `#showcase` would
   * make the browser jump to the element on the next reload — back to the
   * blank offset this function exists to avoid. See lib/scrollJump.ts for
   * why this is not `behavior: 'smooth'`.
   */
  void animateScrollTo(top, TO_WORK_MS, easeInOutCubic);
}

export function HeroActions({ cv }: { cv: Profile['cv'] }) {
  const updated = updatedLabel(cv?.updatedAt ?? null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const closeCv = useCallback(() => setOpener(null), []);

  /*
   * A plain left click opens the CV over the hero (2026-10-20). Ctrl/Cmd,
   * Shift, Alt and the middle button fall through to `/cv`, which is also
   * where the link goes with no JavaScript.
   */
  const openCv = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setOpener(event.currentTarget);
  };

  return (
    <div className="hero-actions">
      {/*
       * A pill pair at every width (hero v2, 2026-10-20). The phone's
       * full-width CV bar with a text link under it (option D) was rejected:
       * on a phone the pair is a two-column grid at 48px, "My work" short so
       * both fit, and the CV's date is its own line underneath.
       */}
      <div className="hero-actions__pair">
        {/*
         * The outline one now. The CV is the page's primary action — see
         * `.button--cv` — and two filled controls side by side say neither is.
         */}
        <a className="button hero-actions__work" href="#showcase" onClick={goToWork}>
          <span className="hero-actions__long">View my work</span>
          <span className="hero-actions__short">My work</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M8 3v10M3.5 8.5 8 13l4.5-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        </a>

        {/*
         * Drawn only when a CV has actually been uploaded. A button that leads
         * to a 404 is worse than no button, and the file cannot be committed to
         * this repository: `docs/resume.pdf` carries a date of birth and a civil
         * status, which rule 2 of CLAUDE.md keeps off the site entirely.
         *
         * "View CV" opens CvModal: the file previewed over the hero with
         * Download and Open in new tab, and closed again without leaving the
         * page. `/cv` stays the href for no-JS and modified clicks.
         */}
        {cv ? (
          <Link
            className="button button--cv"
            href="/cv"
            title={updated ? `PDF, updated ${updated}` : 'PDF'}
            aria-haspopup="dialog"
            data-no-veil=""
            onClick={openCv}
          >
            View CV
            <svg
              className="hero-actions__cv-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M4 1.75h5.5L12.25 4.5v9.75H4zM9.5 1.75V4.5h2.75M6 8h4.25M6 10.75h4.25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
              />
            </svg>
          </Link>
        ) : null}
      </div>

      {cv && updated ? <p className="hero-actions__stamp">CV updated {updated}</p> : null}

      {cv && opener ? (
        <CvModal
          url={cv.url}
          title={cv.label ?? 'Curriculum vitae'}
          updated={updated}
          opener={opener}
          onClose={closeCv}
        />
      ) : null}
    </div>
  );
}
