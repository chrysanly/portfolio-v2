'use client';

import type { Profile } from '@/lib/profile';

/**
 * The hero's two ways forward: the work, and the CV.
 *
 * Asked for on 2026-09-22 as "View My Work | Download CV". The first is the
 * site's own centrepiece, the second is the thing a recruiter reaches for in
 * the first ten seconds and which the site had no answer for at all.
 *
 * A client component because of where "View my work" has to land — see
 * `showcaseTarget`. It renders inside the animated hero (a client tree) and
 * inside the resolved static intro (a server tree), and holds no state.
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
  const panel = document.querySelector<HTMLElement>('.panel[data-substep-y]');
  const measured = Number(panel?.dataset.substepY);

  if (Number.isFinite(measured) && measured > 0) return measured;

  const section = document.getElementById('showcase');
  if (!section) return null;

  return section.getBoundingClientRect().top + window.scrollY;
}

/** "September 2026" from whatever shape the backend sent. */
function updatedLabel(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function HeroActions({ cv }: { cv: Profile['cv'] }) {
  const updated = updatedLabel(cv?.updatedAt ?? null);

  return (
    <div className="hero-actions">
      <a
        className="button button--solid"
        href="#showcase"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const top = showcaseTarget();
          if (top === null) return;
          event.preventDefault();
          /*
           * Smooth, and with the hash left alone. Setting `#showcase` would
           * make the browser jump to the element on the next reload — back to
           * the blank offset this function exists to avoid.
           */
          window.scrollTo({ top, behavior: 'smooth' });
        }}
      >
        View my work
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
       * A new tab, and no `download` attribute: the file is served from
       * another origin, where the attribute is ignored anyway, and a PDF the
       * browser can preview first is kinder than one that lands in Downloads
       * unseen. The backend sends it as an attachment when Chrys wants that.
       */}
      {cv ? (
        <a
          className="button"
          href={cv.url}
          target="_blank"
          rel="noopener noreferrer"
          title={updated ? `PDF, updated ${updated}` : 'PDF'}
        >
          {cv.label ?? 'Download CV'}
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13h10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
          {updated ? <em className="hero-actions__stamp">Updated {updated}</em> : null}
        </a>
      ) : null}
    </div>
  );
}
