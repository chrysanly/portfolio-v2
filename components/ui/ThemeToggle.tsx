'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };

/*
 * The ripple: the new theme spreads from the toggle as a disc with a soft,
 * wavy edge that settles into a clean circle past the farthest corner.
 * A fast-start, soft-settle curve, so it moves on the first frame.
 */
const RIPPLE_MS = 560;
const RIPPLE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const POINTS = 72; // the same count in every frame, so the polygons interpolate
const FRAMES = 14;
const LOBES = 6;
const AMP = 0.06;
const R0 = 22; // about half the 44px target: frame one already shows at the button
const OVERSHOOT = 1.08;

/**
 * Where the ripple starts: the pointer, or the button's centre when the press
 * came from the keyboard (Enter/Space report `detail === 0` and no position).
 */
function rippleOrigin(e: MouseEvent<HTMLButtonElement>) {
  if (e.detail !== 0) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Past the viewport corner farthest from the origin, so the wavy edge clears it. */
function rippleRadius(x: number, y: number) {
  return Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) * OVERSHOOT;
}

/**
 * The ripple's clip-path keyframes. The radius is linear in t: the animation's
 * own easing paces it, so it is never eased twice. The amplitude decays to 0,
 * so the last frame is a true circle and nothing snaps at the end.
 */
function rippleFrames(x: number, y: number, R: number) {
  const phase0 = Math.random() * Math.PI * 2;
  const frames: Keyframe[] = [];
  for (let k = 0; k <= FRAMES; k++) {
    const t = k / FRAMES;
    const a = AMP * Math.pow(1 - t, 1.6);
    const phase = phase0 + t * 1.1;
    const base = R0 + (R - R0) * t;
    const pts: string[] = [];
    for (let i = 0; i < POINTS; i++) {
      const th = (i / POINTS) * Math.PI * 2;
      const r = base * (1 + a * Math.sin(LOBES * th + phase));
      pts.push(`${(x + r * Math.cos(th)).toFixed(1)}px ${(y + r * Math.sin(th)).toFixed(1)}px`);
    }
    frames.push({ clipPath: `polygon(${pts.join(',')})` });
  }
  return frames;
}

/**
 * Runs the swap as a view transition: the browser snapshots the old frame,
 * applies the new palette behind it, and the new snapshot is revealed by the
 * ripple. Under reduced motion globals.css fades the new snapshot in instead.
 * The frames are built before the capture, so nothing runs between `ready`
 * and the first frame.
 */
async function runRipple(
  start: (cb: () => void) => ViewTransition,
  apply: () => void,
  origin: { x: number; y: number },
  reduce: boolean,
) {
  const root = document.documentElement;
  const frames = reduce ? null : rippleFrames(origin.x, origin.y, rippleRadius(origin.x, origin.y));
  root.dataset.themeSwap = '';

  try {
    const vt = start.call(document, apply);
    if (frames) {
      vt.ready
        .then(() =>
          root.animate(frames, {
            duration: RIPPLE_MS,
            easing: RIPPLE_EASE,
            fill: 'both',
            pseudoElement: '::view-transition-new(root)',
          }),
        )
        // A skipped transition still applies the theme; only the ripple is lost.
        .catch(() => {});
    }
    await vt.finished.catch(() => {});
  } finally {
    delete root.dataset.themeSwap;
  }
}

/** The fallback where View Transitions are missing: one crest washes down, then the sheet dissolves. */
const WASH_MS = 640;
const DISSOLVE_MS = 280;
const FADE_MS = 180; // each half of the reduced-motion fade, 360ms in all
const SINE_IN_OUT = 'cubic-bezier(0.37, 0, 0.63, 1)';
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** One crest every 600 units, four across a sheet twice the screen wide. */
const CREST_PATH = 'M0 0V24Q150 72 300 24T600 24T900 24T1200 24T1500 24T1800 24T2100 24T2400 24V0Z';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The sheet, built off-React: it lives for under a second, above everything. */
function makeTide(target: Theme) {
  const tide = document.createElement('div');
  tide.className = 'tide';
  tide.dataset.to = target;
  tide.setAttribute('aria-hidden', 'true');

  const sheet = document.createElement('div');
  sheet.className = 'tide__sheet';
  const fill = document.createElement('div');
  fill.className = 'tide__fill';

  const crest = document.createElementNS(SVG_NS, 'svg');
  crest.setAttribute('class', 'tide__crest');
  crest.setAttribute('viewBox', '0 0 2400 72');
  crest.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', CREST_PATH);
  crest.append(path);

  sheet.append(fill, crest);
  tide.append(sheet);
  document.body.append(tide);
  return { tide, sheet, crest };
}

/**
 * Washes the target ground down over the page, swaps the palette under full
 * cover, then dissolves. Reduced motion gets the same sheet as a 360ms fade:
 * a theme change is still a change of scene, never an instant swap.
 *
 * Every animation is cancelled before the sheet is removed: a WAAPI fill stays
 * applied and would override inline styles on the next run.
 */
async function runTide(target: Theme, apply: () => void, reduce: boolean) {
  const root = document.documentElement;
  const { tide, sheet, crest } = makeTide(target);
  root.dataset.themeSwap = '';

  try {
    if (reduce) {
      sheet.style.transform = 'none';
      await sheet.animate({ opacity: [0, 1] }, { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' })
        .finished;
      apply();
      await sheet.animate({ opacity: [1, 0] }, { duration: FADE_MS, easing: 'ease-in', fill: 'forwards' })
        .finished;
      return;
    }

    // The crest rolls sideways while it falls, so it reads as water, not a blind.
    crest.animate(
      { transform: ['translateX(0)', 'translateX(-50%)'] },
      { duration: WASH_MS + DISSOLVE_MS, easing: 'linear' },
    );
    await sheet.animate(
      { transform: ['translateY(-100%)', 'translateY(0)'] },
      { duration: WASH_MS, easing: SINE_IN_OUT, fill: 'forwards' },
    ).finished;
    apply();
    await sheet.animate(
      { opacity: [1, 0], transform: ['translateY(0)', 'translateY(10px)'] },
      { duration: DISSOLVE_MS, easing: EASE_OUT, fill: 'forwards' },
    ).finished;
  } finally {
    tide.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    tide.remove();
    delete root.dataset.themeSwap;
  }
}

/**
 * Theme toggle — docs/02-TRD.md §2 names this as one of the few client
 * components the site is allowed.
 *
 * The applied theme is set by a blocking script in the document head, so the
 * first paint is already correct and there is no flash. This component only
 * reflects that state and lets the visitor change it. With JavaScript off the
 * button never renders and the site stays in its light default, which is the
 * palette docs/04-UIUX-BRIEF.md §2 specifies.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    const applied = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(applied);
  }, []);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    // A second press mid-swap would start a second transition over the first
    // and flash; it is ignored until the swap has finished.
    if (running.current) return;

    const target: Theme = theme === 'dark' ? 'light' : 'dark';
    const origin = rippleOrigin(e);

    // flushSync: the button's own glyph and word must be in the new snapshot.
    const apply = () => {
      flushSync(() => setTheme(target));
      document.documentElement.dataset.theme = target;
    };

    try {
      localStorage.setItem('theme', target);
    } catch {
      // Private mode or blocked storage: the choice simply will not persist.
    }

    /*
     * Swapping the palette changes eight custom properties on :root, which
     * invalidates style for the whole document — every rule, the two grain
     * layers, the atmosphere and the masthead all repaint in one frame, and on
     * this page that is long enough to see.
     *
     * A view transition hides that behind snapshots, and the new one arrives
     * as a liquid ripple from the toggle (Chrys asked for something smooth,
     * like a wave, 2026-10-19). Without the API the tide sheet hides the
     * repaint instead; without WAAPI either, the swap is simply instant.
     */
    if (typeof document.body.animate !== 'function') {
      apply();
      return;
    }

    const start = (
      document as Document & { startViewTransition?: (cb: () => void) => ViewTransition }
    ).startViewTransition;

    running.current = true;
    setBusy(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const swap = start ? runRipple(start, apply, origin, reduce) : runTide(target, apply, reduce);
    swap
      // An interrupted animation still leaves the theme applied.
      .then(() => {
        if (document.documentElement.dataset.theme !== target) apply();
      })
      // An interrupted animation still leaves the theme applied.
      .catch(() => {
        if (document.documentElement.dataset.theme !== target) apply();
      })
      .finally(() => {
        running.current = false;
        setBusy(false);
      });
  }

  // Nothing is rendered until the applied theme is known, so the button never
  // claims the wrong state during hydration.
  if (theme === null) return null;

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Dark' : 'Light';

  /*
   * Sun and moon, drawn inline — docs/02-TRD.md §1 allows no icon package. Both
   * glyphs stay in the DOM and crossfade, so the header never reflows on a
   * swap. The visible word stays too: an icon-only control gives voice control
   * nothing to say, and the accessible name has to contain the visible text or
   * "click Light" fails.
   */
  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-next={next}
      onClick={toggle}
      aria-label={`${label} theme`}
      aria-busy={busy || undefined}
    >
      <span className="theme-toggle__glyphs" aria-hidden="true">
        <svg className="theme-toggle__sun" viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="4.4" />
          <g strokeLinecap="round">
            <path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
          </g>
        </svg>
        <svg className="theme-toggle__moon" viewBox="0 0 24 24" focusable="false">
          <path d="M20.7 14.6A9 9 0 1 1 9.4 3.3a7.2 7.2 0 0 0 11.3 11.3Z" />
        </svg>
      </span>
      <span className="theme-toggle__text">{label}</span>
    </button>
  );
}
