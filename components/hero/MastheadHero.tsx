'use client';

/**
 * MastheadHero — Phase 4 of docs/06-IMPLEMENTATION-PLAN.md
 * Spec: docs/04-UIUX-BRIEF.md §5
 *
 * The resolved (stage C) layout is what the server renders. This component
 * enhances it. With JS off or reduced motion set, `<StaticIntro />` is what
 * the visitor gets and it is already correct.
 *
 * Only `transform` and `opacity` are animated. The mask-wipes are driven
 * through two custom properties per element (--wipe, --fade) so a row needs
 * one ref instead of one per child, and nothing reads layout during paint.
 *
 * Stage B carries a ledger: ruled entries and a total line. The direction is
 * called Ledger and Chrys builds ERP finance modules, so a statement of
 * account is the form his own subject matter suggests — not a stat row.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import type { Profile } from '@/lib/profile';
import { IdCard } from './IdCard';
import { HeroActions } from '@/components/ui/HeroActions';
import { isJumping } from '@/lib/scrollJump';

/*
 * Timeline. Stage A holds the masthead alone, stage B reveals the statement
 * then the ledger one entry at a time, stage C docks the masthead and hands
 * over to the real header so the work index follows immediately. Everything is
 * finished by DOCK_END, which keeps the empty tail at the bottom of the track
 * short — the sequence should end into Selected Work, not into dead scroll.
 */
const HOLD_END = 0.12; // stage A: nothing but the masthead
const STAGE_B_END = 0.58; // masthead has reached its stage B size
const DOCK_END = 0.96; // masthead has reached the header

/** t = 0.428 puts the masthead at ~132px, the stage B size. */
const T_B = 0.428;

/** How far toward the header the masthead has travelled by the end of stage B. */
const T_POS_B = 0.62;

/** Each letter closes a beat after the one before, so the word collects itself. */
const LETTER_STAGGER = 0.035;

const LINE_STARTS = [0.14, 0.21, 0.28];
const NOTE_STARTS = [0.33, 0.38];
const FACT_STARTS = [0.42, 0.46, 0.5, 0.54, 0.58, 0.62];
/*
 * The two buttons arrive one beat after the last ledger row, and before
 * CLEAR_FROM: the pause the comment below describes is exactly where an offer
 * to act belongs, and it is the last thing revealed because it is what the
 * sequence has been building towards.
 *
 * It has to be revealed rather than simply rendered. Everything in
 * `.hero__body` starts invisible and is wiped in by `paint()`; a row without
 * its own beat would sit at full opacity across the masthead from scroll 0.
 */
const CTA_START = 0.66;
const WIPE_SPAN = 0.08;

/*
 * The last FACT_STARTS entry + WIPE_SPAN (0.7) is when everything has
 * finished revealing — the last ledger row and the card are fully in.
 * CLEAR_FROM used to be 0.78, a bare 8% (~51px) after that, which read as
 * "look at everything, it's already leaving" rather than a moment to
 * actually take it in. Pushed out to give that a real pause before the
 * fade-out starts.
 */
const CLEAR_FROM = 0.83;
const CLEAR_TO = 0.9;

/*
 * The opening is a gate, not a scroll.
 *
 * Three attempts, and the third is Chrys's: the original made the whole
 * sequence scroll-driven, which meant 400px of scrolling before the first
 * line was legible and 700px before the ledger — and the body overhung the
 * stage by 284px at 1735x950 and was clipped. The second played the sequence
 * automatically on load, which fixed the reading but threw away the masthead
 * moment he wanted kept.
 *
 * So: the masthead holds on arrival, exactly as it was designed to, and
 * scrolling does nothing while it does. One button plays the sequence through
 * to SETTLE, and from there scrolling behaves normally — the dock, the
 * hand-over, then the work. Nobody can be stranded: a wheel, a swipe, an
 * arrow key or a programmatic jump all open the gate too, they simply do not
 * scroll the page while it is shut.
 *
 * SETTLE is one beat past the CTA's reveal, so everything in the body is
 * fully in and nothing has begun to clear.
 */
const SETTLE = CTA_START + WIPE_SPAN;

/** Long enough to read as one move, short enough to feel like a response. */
const ENTRANCE_MS = 1400;

/*
 * The logo the masthead docks into lives in the header, above the stage, and
 * the stage clips its overflow — so the masthead crosses that top edge and is
 * cut off before it ever arrives. Crossfading it out as it approaches, while
 * the real header fades in underneath, reads as a handover instead of the name
 * simply vanishing for the last stretch of the scroll.
 */
/** The card arrives once the statement has landed, not with it. */
const CARD_START = 0.24;

const HANDOVER_FROM = CLEAR_FROM;
const HANDOVER_TO = CLEAR_TO;

/*
 * The section pager treats the hold-then-reveal sequence as three stops it
 * can read off `data-hero-stage` — "Hero" and "Details" — but everything in
 * it shares one pinned DOM position, so there is no real scroll offset the
 * pager can read the way it does for a normal section.
 *
 * DETAILS_START: past it, enough of the ledger and the card have revealed
 * that "Details" is an accurate label rather than a still-mostly-masthead
 * view, and it's also where the pager's own "jump to Details" lands.
 * Exposed as `--hero-details-y` (measure) and `data-hero-stage` (paint).
 *
 * The third value, 'done', is written once CLEAR_TO is reached — i.e. once
 * the ledger has actually finished fading out, not merely once the header
 * has started fading in (`data-hero-handoff`, a different, earlier
 * threshold tuned for the header's own crossfade). The pager used to read
 * `data-hero-handoff` for this and called "Selected work" current while the
 * ledger was still up to ~65% opaque, for the stretch between the two
 * thresholds — the ledger and the showcase's label disagreeing with each
 * other again, the same shape of bug as the pulled-up-showcase one, just
 * one signal removed. `data-hero-stage` is scoped to exactly what the pager
 * needs and nothing else depends on it.
 */
const DETAILS_START = 0.3;

/*
 * The work index is pulled up over the emptied stage (see globals.css), so it
 * has to stay invisible until the sequence has resolved or it would sit on top
 * of the ledger the whole way down. This is the one section reveal on the site;
 * docs/04-UIUX-BRIEF.md §6 rules out scroll-triggered fades elsewhere, and that
 * still holds — it exists to hide an overlap, not to decorate an entrance.
 *
 * Starts exactly at HANDOVER_TO/CLEAR_TO rather than earlier: the two used to
 * overlap by 6% of the track, which put the ledger and the showcase panel on
 * screen at once, each at partial opacity — two unrelated layouts ghosting
 * into each other rather than a clean handoff. Sequential, not simultaneous.
 */
const WORK_IN_FROM = HANDOVER_TO;
const WORK_IN_TO = 0.98;

/** Two-segment ease: hold, travel to the stage B value, then on to 1. */
const stage = (p: number, atB: number) =>
  p <= HOLD_END
    ? 0
    : p <= STAGE_B_END
      ? atB * ease(span(p, HOLD_END, STAGE_B_END))
      : atB + (1 - atB) * ease(span(p, STAGE_B_END, DOCK_END));

/**
 * Ledger entries. Every value comes from docs/07-SOURCE-CONTENT.md §1 and §3
 * via content/site.ts — nothing is computed, inferred or embellished here.
 * The availability placeholder is deliberately not among them: it belongs in
 * the resolved metadata row, not as the closing figure of the sequence.
 */
const factsFor = (profile: Profile): ReadonlyArray<readonly [string, string]> => [
  ['Discipline', profile.meta.discipline],
  ['Architecture', profile.meta.architecture],
  ['Principal stack', profile.meta.principalStack],
  ['Databases', profile.meta.databases],
  ['Auth & security', profile.meta.security],
  ['Current role', profile.meta.currentRole],
];

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

interface Geometry {
  spread: number;
  tx: number;
  ty: number;
  scale: number;
  width: number;
  /** Unscaled height of the masthead, used to track its visual bottom edge. */
  mastH: number;
}

/**
 * Drive a mask-wipe from one element via custom properties.
 *
 * `floor` is the opacity before the wipe starts. docs/04-UIUX-BRIEF.md §5
 * wants an unrevealed intro line to sit at --rule colour, which 0.25
 * approximates. The ledger rows must be 0 instead: their hairlines are
 * borders on this element, so any floor above zero leaves a ghost ledger
 * of rules on screen at scroll 0 and again after everything has cleared.
 */
const wipe = (el: HTMLElement | null, reveal: number, out: number, floor: number) => {
  if (!el) return;
  const fade = (floor + (1 - floor) * reveal) * out;
  el.style.setProperty('--wipe', `${(1 - reveal) * 100}%`);
  el.style.setProperty('--fade', String(fade));
  hittable(el, fade);
};

/**
 * Faded out means out of the way, not merely invisible.
 *
 * `opacity: 0` still takes clicks, and everything in this stage is stacked
 * in the same corners: the gate's `Begin` button sits exactly where "View my
 * work" appears, so once the gate had faded it was still the topmost element
 * under the pointer and swallowed every click on the CTA. The button looked
 * ignored — measured with `elementsFromPoint`, which named the faded gate
 * first and the CTA fourth.
 *
 * 0.05 rather than 0: below that nothing is legible, and a control nobody
 * can see should not be clickable either.
 */
const hittable = (el: HTMLElement | null, opacity: number) => {
  if (!el) return;
  el.style.pointerEvents = opacity < 0.05 ? 'none' : '';
};

/**
 * The held masthead stands on plain ground; the facet mesh arrives with the
 * reveal. `data-gate` is first set by the head script in app/layout.tsx so
 * the mesh is never painted on arrival, and from hydration on it follows the
 * gate exactly — including shutting again back at the top.
 */
const shutGate = (shut: boolean) => {
  const data = document.documentElement.dataset;
  if (shut) data.gate = 'shut';
  else delete data.gate;
};

const ZERO: Geometry = { spread: 0, tx: 0, ty: 0, scale: 0.133, width: 0, mastH: 0 };

export function MastheadHero({
  logoRef,
  profile,
}: {
  logoRef: React.RefObject<HTMLElement | null>;
  profile: Profile;
}) {
  const reduced = useReducedMotion();
  const LETTERS = profile.name.toUpperCase().split('');
  const FACTS = factsFor(profile);

  const trackRef = useRef<HTMLDivElement>(null);
  const mastheadRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const geometry = useRef<Geometry>(ZERO);
  const [ready, setReady] = useState(false);

  /** The gate: whether it is opening, whether it has been opened. */
  const entranceRef = useRef({ running: false, done: false, frame: 0 });

  /**
   * Only for the button's own label and disabled state — the animation is
   * driven imperatively, so this is deliberately the one piece of it that
   * React knows about.
   */
  const [opened, setOpened] = useState(false);

  /**
   * measure() resets every transform so it can read natural positions, so any
   * call after the first must repaint or the hero is left flat. `ready` only
   * flips once, so the re-measure on resize and on document.fonts.ready used to
   * clear the transforms and never restore them.
   */
  const paintRef = useRef<(p: number) => void>(() => {});
  const lastP = useRef(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  /** Motion trails the scroll rather than tracking it frame-for-frame. */
  const progress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 28,
    restDelta: 0.001,
  });

  /*
   * Except when the page is jumping on purpose. The spring trails a wheel
   * nicely and a jump badly — the page crossed the whole hand-over before the
   * spring was a third of the way through it, and the stage scrolled away
   * with the ledger still painted on it. See lib/scrollJump.ts.
   */
  useMotionValueEvent(scrollYProgress, 'change', (raw) => {
    if (isJumping()) progress.jump(raw);
  });

  /** Measure natural vs. destination positions. Re-run on resize and font load. */
  const measure = useCallback(() => {
    const masthead = mastheadRef.current;
    /*
     * Re-read if the one we hold has left the page. After Back from a
     * project, HeroMount resolved `#logo` while the project page was still
     * mounted and got its logo, detached by now. A detached element's
     * computed font-size is '', the dock scale came out NaN, the browser
     * rejected every masthead and body transform, and Begin then played the
     * reveal on an unmeasured layout (Chrys, 2026-09-23).
     */
    if (!logoRef.current?.isConnected) logoRef.current = document.getElementById('logo');
    const logo = logoRef.current;
    const track = trackRef.current;
    if (!masthead || !logo || !track) return;

    /*
     * The pixel scrollY at which the sequence reaches DETAILS_START — the
     * only way the pager can jump straight to "Details" without duplicating
     * the scroll-progress maths `useScroll` does internally.
     *
     * Landing a little past the threshold rather than exactly on it: pixel
     * rounding here and the spring's own rounding on the way back to a `p`
     * can land a hair under DETAILS_START even when the intent was exactly
     * on it, which read back as "Hero" the instant the next real scroll
     * event recomputed the stage — a jump to "Details" that silently
     * reverted itself.
     */
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = track.offsetHeight - window.innerHeight;
    document.documentElement.style.setProperty(
      '--hero-details-y',
      String(Math.round(trackTop + (DETAILS_START + 0.06) * scrollable)),
    );

    /*
     * Every transform that displaces the masthead has to be cleared, not just
     * its own: ty is the distance from its natural centre to the logo, and
     * measuring it while the wrap still carried the stage A offset made the
     * masthead overshoot the header by that offset and vanish above the stage.
     */
    masthead.style.transform = '';
    letterRefs.current.forEach((l) => l && (l.style.transform = ''));
    if (bodyRef.current) bodyRef.current.style.transform = '';

    const letters = letterRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (letters.length < 2) return;

    const total = letters.reduce((sum, l) => sum + l.offsetWidth, 0);
    const spread = (masthead.clientWidth - total) / (letters.length - 1);

    const big = parseFloat(getComputedStyle(masthead).fontSize);
    const small = parseFloat(getComputedStyle(logo).fontSize);

    const m = masthead.getBoundingClientRect();
    const l = logo.getBoundingClientRect();

    geometry.current = {
      spread,
      scale: small / big,
      tx: l.left - m.left,
      ty: l.top + l.height / 2 - (m.top + m.height / 2),
      width: masthead.clientWidth,
      mastH: masthead.offsetHeight,
    };
    setReady(true);
    paintRef.current(lastP.current); // restore what the reset above cleared
  }, [logoRef]);

  useLayoutEffect(() => {
    if (reduced) return;
    measure();
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, reduced]);

  const paint = useCallback((p: number) => {
    lastP.current = p;
    const g = geometry.current;

    const t = stage(p, T_B);

    /*
     * Position is eased separately from scale. Sharing one curve sent the
     * masthead 43% of the way into the header by the end of stage B, which
     * clipped it against the top of the stage. docs/04-UIUX-BRIEF.md §5 wants
     * it at the stage's upper-left in B and docking into the header only in C.
     */
    const tPos = stage(p, T_POS_B);

    const scale = 1 + (g.scale - 1) * t;

    /*
     * transform-origin is the left edge, which the dock maths needs, but that
     * also means scaling alone would pin the masthead to the left margin and
     * shrink it into the corner. Holding half the width it loses keeps its
     * visual centre fixed, so the name stays centred while the sequence plays
     * and only travels to the header logo as it docks.
     */
    const centred = 1 - ease(span(p, STAGE_B_END, DOCK_END));
    const centreShift = ((g.width * (1 - scale)) / 2) * centred;

    const handover = span(p, HANDOVER_FROM, HANDOVER_TO);
    if (mastheadRef.current) {
      mastheadRef.current.style.transform = `translate3d(${g.tx * tPos + centreShift}px, ${g.ty * tPos}px, 0) scale(${scale})`;
      mastheadRef.current.style.opacity = String(1 - handover);
    }

    // Letters close from edge-to-edge to natural spacing, each a beat apart.
    letterRefs.current.forEach((el, i) => {
      if (!el) return;
      const c = 1 - ease(span(p, HOLD_END + i * LETTER_STAGGER, STAGE_B_END));
      el.style.transform = `translate3d(${g.spread * i * c}px, 0, 0)`;
    });

    /*
     * The body is absolutely positioned under the masthead's unscaled box, so
     * the wrap is masthead-only and the flex stage centres the name on its own
     * — no JS offset, and therefore nothing that can shift after hydration.
     *
     * The first two terms track the masthead's visual bottom edge as it scales
     * and rises. BODY_RISE is the extra lift that brings the ledger up into the
     * stage as it reveals, instead of leaving it hanging off the bottom.
     */
    if (bodyRef.current) {
      // Tracks the masthead's visual bottom edge exactly, so the gap between
      // the name and the statement stays constant no matter how far the
      // masthead has scaled or travelled. .intro's margin supplies the gap.
      const follow = (g.mastH / 2) * (scale - 1) + g.ty * tPos;
      bodyRef.current.style.transform = `translate3d(0, ${follow}px, 0)`;
    }

    const out = 1 - span(p, CLEAR_FROM, CLEAR_TO);

    lineRefs.current.forEach((el, i) =>
      wipe(el, ease(span(p, LINE_STARTS[i], LINE_STARTS[i] + WIPE_SPAN)), out, 0.25),
    );
    noteRefs.current.forEach((el, i) =>
      wipe(el, ease(span(p, NOTE_STARTS[i], NOTE_STARTS[i] + WIPE_SPAN)), out, 0),
    );
    wipe(ctaRef.current, ease(span(p, CTA_START, CTA_START + WIPE_SPAN)), out, 0);

    factRefs.current.forEach((el, i) =>
      wipe(el, ease(span(p, FACT_STARTS[i], FACT_STARTS[i] + WIPE_SPAN)), out, 0),
    );

    /*
     * The card drifts up a little slower than the ledger, which is what makes
     * it read as floating beside the sequence rather than pinned into it.
     */
    if (cardRef.current) {
      const inCard = ease(span(p, CARD_START, CARD_START + 0.14));
      hittable(cardRef.current, inCard * out);
      cardRef.current.style.opacity = String(inCard * out);
      cardRef.current.style.transform = `translate3d(0, ${24 - inCard * 24 + g.ty * tPos * 0.22}px, 0)`;
    }

    if (eyebrowRef.current) eyebrowRef.current.style.opacity = String(1 - span(p, 0.06, 0.2));
    // The cue and the progress rule are stage A affordances, and the work index
    // is pulled up to arrive around p = 0.63. Clearing them well before that
    // keeps "Scroll to begin" from colliding with "Selected work".
    if (footRef.current) {
      const footOpacity = 1 - span(p, 0.26, 0.44);
      footRef.current.style.opacity = String(footOpacity);
      hittable(footRef.current, footOpacity);
    }
    /*
     * The gate's button sits under the name, which is exactly where the first
     * statement line wipes in at LINE_STARTS[0] — so it is gone before then,
     * within the stage A hold, rather than on the foot's slower schedule.
     */
    if (gateRef.current) {
      const gateOpacity = 1 - span(p, 0.01, HOLD_END);
      gateRef.current.style.opacity = String(gateOpacity);
      hittable(gateRef.current, gateOpacity);
    }
    if (railRef.current)
      railRef.current.style.transform = `scaleY(${1 - ease(span(p, 0.02, 0.22))})`;
    if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

    // Hand the masthead over to the real sticky header at the very end.
    const root = document.documentElement;
    root.dataset.heroHandoff = handover > 0.35 ? 'on' : 'off';
    // The section pager's "Hero" / "Details" / "done" stop — see
    // DETAILS_START. Strictly less-than at the low end: the pager's
    // jump-to-Details lands exactly at DETAILS_START, and it has to read as
    // "details" immediately on arrival, or the next scroll tick flips the
    // label straight back. 'done' at CLEAR_TO, not at the handover
    // threshold above — see the comment on DETAILS_START for why the two
    // can't share a signal.
    root.dataset.heroStage = p < DETAILS_START ? 'hero' : p < CLEAR_TO ? 'details' : 'done';

    const workIn = ease(span(p, WORK_IN_FROM, WORK_IN_TO));
    root.style.setProperty('--work-in', workIn.toFixed(3));
    const main = document.getElementById('content');
    if (main) {
      if (workIn < 0.02) main.dataset.veiled = 'true';
      else delete main.dataset.veiled;
    }
  }, []);

  paintRef.current = paint;

  /**
   * Scroll drives the part of the timeline the gate has already played: raw
   * progress 0 lands at SETTLE, raw progress 1 at the end.
   *
   * Without the remap the first 74% of the track would be dead scroll, and
   * the dock would not begin until two thirds of the way down the section.
   * The track's height came down to match (see the element below).
   */
  const fromScroll = useCallback((raw: number) => SETTLE + (1 - SETTLE) * raw, []);

  useMotionValueEvent(progress, 'change', (raw) => {
    const state = entranceRef.current;
    // While the gate is shut the masthead holds at p = 0, and while it is
    // opening the animation owns the frame. Letting scroll write in either
    // case would fight over the same transforms.
    if (!state.done || state.running) return;
    paint(fromScroll(raw));
  });

  /**
   * Open the gate: play 0 → SETTLE, then hand the timeline to scroll.
   *
   * Idempotent, because every input that can reach it — the button, a wheel, a
   * swipe, a key, the section pager's own jump — calls the same function.
   */
  const open = useCallback(() => {
    const state = entranceRef.current;
    if (state.running || state.done) return;

    state.running = true;
    setOpened(true);
    shutGate(false);
    const started = performance.now();

    /** Cubic ease-out: fast at the start, so the content arrives early. */
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = () => {
      if (!state.running) return;

      const t = Math.min(1, (performance.now() - started) / ENTRANCE_MS);
      paint(SETTLE * easeOut(t));

      if (t < 1) {
        state.frame = requestAnimationFrame(step);
        return;
      }

      state.running = false;
      state.done = true;
      // Hand over at exactly the value scroll reports, which at the top of the
      // page is SETTLE — so the first wheel tick continues the move rather
      // than jumping.
      paint(fromScroll(progress.get()));
    };

    state.frame = requestAnimationFrame(step);
  }, [paint, progress, fromScroll]);

  useEffect(() => {
    if (reduced || !ready) return;

    const state = entranceRef.current;

    /*
     * Arrive at the scroll position without playing the way there.
     *
     * The spring was left wherever this page last had it — SETTLE, for a
     * fresh mount — so painting from it after a restored Back animated the
     * ledger and the masthead out over the showcase for half a second. Read
     * the real progress off the track, which is current even when the
     * spring's source has not caught up yet, and jump the spring to it.
     */
    const settleNow = () => {
      const track = trackRef.current;
      let raw = progress.get();
      if (track) {
        const top = track.getBoundingClientRect().top + window.scrollY;
        const scrollable = track.offsetHeight - window.innerHeight;
        raw = scrollable > 0 ? clamp((window.scrollY - top) / scrollable) : 0;
      }
      progress.jump(raw);
      paint(fromScroll(raw));
    };

    /*
     * A refresh half way down the page, or a Back that restored a position:
     * there is no gate to shut, and shutting it would trap a visitor who is
     * already reading. ScrollMemory's restore lands here.
     */
    if (state.done || window.scrollY > 4) {
      state.done = true;
      state.running = false;
      shutGate(false);
      settleNow();
      return;
    }

    // The held state. Painted explicitly rather than left to the CSS
    // defaults, so the letters are spread and the body is out of the way.
    paint(0);
    shutGate(true);

    /*
     * Scroll input is refused while the gate is shut, and refusing is all it
     * does: the button is what opens the gate. Chrys was explicit about this
     * on 2026-09-22 — a wheel that both refuses to scroll *and* triggers the
     * reveal made the button decorative.
     *
     * `passive: false`, or preventDefault is ignored and the page scrolls
     * behind the held masthead.
     *
     * The `done` guard matters more than it looks: the listener is attached
     * once and does not re-run when the gate opens, so without it every wheel
     * event is swallowed forever. Measured — two 500px wheels after opening
     * left scrollY at 0, and the page could never be scrolled again.
     */
    const swallow = (event: Event) => {
      if (state.done) return;
      event.preventDefault();
    };

    /*
     * The keyboard is the exception, and has to be: a visitor who cannot use
     * a pointer needs a way past the gate, and Tab-to-the-button then Enter
     * is already that. Space and the arrows are accepted as well because they
     * are what a keyboard user presses to scroll, and silently eating them
     * would be the trap this whole change is avoiding.
     */
    const onKey = (event: KeyboardEvent) => {
      if (state.done) return;
      const keys = ['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Spacebar', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      open();
    };

    /*
     * The gate shuts again at the top of the page.
     *
     * Asked for on 2026-09-22: scrolling back up is allowed all the way to
     * the held masthead, and once there it is refused again until Begin is
     * pressed. So the opening is not a one-time toll — it is the state of
     * being at the top of this page, and returning restores it.
     *
     * Two pixels of tolerance, not zero: a trackpad settling at the top can
     * report 1px, and re-arming has to be reliable enough that the masthead
     * does not sometimes stay docked over an empty stage.
     */
    const onScroll = () => {
      const y = window.scrollY;

      if (state.done) {
        if (y > 2 || state.running) return;

        state.done = false;
        setOpened(false);
        shutGate(true);
        paint(0);
        return;
      }

      /*
       * Moved without the wheel — the section pager, an in-page anchor, a
       * restored position. The gesture blockers cannot see those, and leaving
       * the gate shut would hold the masthead spread while the page scrolled
       * out from under it. Snapped open rather than played: the visitor is
       * already somewhere else, and an entrance animation behind them is
       * motion nobody asked for.
       */
      if (y > 4) {
        cancelAnimationFrame(state.frame);
        state.running = false;
        state.done = true;
        setOpened(true);
        shutGate(false);
        settleNow();
      }
    };

    window.addEventListener('wheel', swallow, { passive: false });
    window.addEventListener('touchmove', swallow, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(state.frame);
      state.running = false;
      shutGate(false);
      window.removeEventListener('wheel', swallow);
      window.removeEventListener('touchmove', swallow);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ready, reduced, paint, progress, fromScroll, open]);

  if (reduced) return null; // StaticIntro stays; nothing is pinned

  return (
    <section className="hero" id="top" data-section="Hero">
      {/*
        180vh bought the full timeline at a scroll. The entrance plays
        everything up to SETTLE on load now, so the track only has to carry
        the dock and the hand-over.

        The useful number is the track height minus the sticky child, not the
        track height: the stage is 100vh, so 150vh gives 50vh of travel. The
        first attempt at 110vh gave 10vh, and the whole hero cleared inside
        200px of scrolling — measured, which is the only reason it was caught.
        50vh puts the fade between roughly 170px and 290px, and the showcase
        immediately after.
      */}
      <div ref={trackRef} className="h-[150vh] md:h-[150vh] max-md:h-[130vh] relative">
        <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
          <p ref={eyebrowRef} className="hero__eyebrow">
            {profile.location}
          </p>

          <div className="wrap">
            <div ref={mastheadRef} className="masthead" role="img" aria-label={profile.name}>
              {LETTERS.map((ch, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  ref={(el) => {
                    letterRefs.current[i] = el;
                  }}
                >
                  <span>{ch}</span>
                </span>
              ))}
            </div>

            {/* No `data-section` any more: see heroSubIndex() in SectionPager —
                the details and the hero are one stop now that the gate plays
                the reveal before any scrolling. */}
            <div className="hero__body" ref={bodyRef}>
              <div className="intro">
                {profile.intro.map((line, i) => (
                  <div
                    key={i}
                    className="intro__line"
                    ref={(el) => {
                      lineRefs.current[i] = el;
                    }}
                  >
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              {profile.notes.map((note, i) => (
                <p
                  key={i}
                  className="intro__note"
                  ref={(el) => {
                    noteRefs.current[i] = el;
                  }}
                >
                  <span>{note}</span>
                </p>
              ))}

              <dl className="facts">
                {FACTS.map(([label, value], i) => (
                  <div
                    key={label}
                    className="facts__row"
                    ref={(el) => {
                      factRefs.current[i] = el;
                    }}
                  >
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <div ref={ctaRef} className="hero__cta">
                <HeroActions cv={profile.cv} />
              </div>
            </div>

            {/*
              A button, because scrolling is refused until it is pressed.
              "Scroll to begin" was an instruction the page then ignored.

              Under the name, centred, and larger than the page's other
              buttons: it was a small pill in the bottom-left corner, and
              with the scroll locked a visitor who missed it had nowhere to
              go. The eye lands on the name first, so the way forward sits
              directly beneath it. Asked for on 2026-09-23.

              Inside the wrap because the wrap is the masthead's unscaled
              box, so `top: 100%` is the bottom of the letters at every
              viewport without restating the masthead's font size.
            */}
            <div ref={gateRef} className="hero__gate">
              <button
                type="button"
                className="button button--solid cue--gate"
                onClick={open}
                aria-label="Begin — reveal the introduction"
              >
                {opened ? 'Beginning' : 'Begin'}
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path
                    d="M8 3v10M3.5 8.5 8 13l4.5-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Hanging identity badge. Nothing beyond docs/07-SOURCE-CONTENT.md §1,
              and deliberately no phone number: that belongs on /contact only. */}
          <div ref={cardRef} className="badge-mount">
            <IdCard profile={profile} />
          </div>

          <div ref={footRef} className="hero__foot">
            <div className="cue-group">
              <span ref={railRef} className="hero__rail" aria-hidden="true" />
            </div>
            <div className="progress">
              <div ref={barRef} className="progress__bar" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
