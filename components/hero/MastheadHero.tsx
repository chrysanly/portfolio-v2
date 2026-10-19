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
 * The opening is scroll, and nothing else.
 *
 * Four attempts. The first was scroll-driven on a linear map, which meant
 * 400px before the first line was legible. The second played on load and
 * lost the masthead moment. The third was a gate: the page refused to scroll
 * until a Begin button was pressed. Chrys dropped the gate on 2026-10-19 —
 * the masthead holds on arrival, and ordinary scrolling (wheel, touch, keys,
 * the pager) plays the reveal forwards and, scrolling up, backwards. Nothing
 * listens to wheel or touch, so nothing can trap a visitor.
 *
 * Raw scroll is mapped to the timeline in three linear pieces so the reveal
 * is not slow to start the way the first attempt was:
 *  - 0 → LIFT_AT carries the stage A hold (0 → HOLD_END) in a few pixels,
 *    so the very first scroll starts the letters moving and clears the cue;
 *  - LIFT_AT → REVEAL_AT plays the whole reveal, up to SETTLE;
 *  - REVEAL_AT → 1 is the dock, the hand-over and the work arriving.
 *
 * SETTLE is one beat past the CTA's reveal, so everything in the body is
 * fully in and nothing has begun to clear.
 */
const SETTLE = CTA_START + WIPE_SPAN;
const LIFT_AT = 0.03;
const REVEAL_AT = 0.6;

/** Raw scroll progress through the track → timeline position. */
const fromScroll = (raw: number) =>
  raw <= LIFT_AT
    ? HOLD_END * (raw / LIFT_AT)
    : raw <= REVEAL_AT
      ? HOLD_END + (SETTLE - HOLD_END) * ((raw - LIFT_AT) / (REVEAL_AT - LIFT_AT))
      : SETTLE + (1 - SETTLE) * ((raw - REVEAL_AT) / (1 - REVEAL_AT));

/** The inverse, for turning a timeline position into a scroll offset. */
const toScroll = (p: number) =>
  p <= HOLD_END
    ? LIFT_AT * (p / HOLD_END)
    : p <= SETTLE
      ? LIFT_AT + (REVEAL_AT - LIFT_AT) * ((p - HOLD_END) / (SETTLE - HOLD_END))
      : REVEAL_AT + (1 - REVEAL_AT) * ((p - SETTLE) / (1 - SETTLE));

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
 * in the same corners: the old Begin button sat exactly where "View my work"
 * appears, and once faded it still swallowed every click on the CTA —
 * measured with `elementsFromPoint`, which named the faded button first.
 *
 * 0.05 rather than 0: below that nothing is legible, and a control nobody
 * can see should not be clickable either.
 */
const hittable = (el: HTMLElement | null, opacity: number) => {
  if (!el) return;
  el.style.pointerEvents = opacity < 0.05 ? 'none' : '';
};

const ZERO: Geometry = { spread: 0, tx: 0, ty: 0, scale: 0.133, width: 0, mastH: 0 };

/**
 * The second statement line, with its object underlined: "building | ERP and
 * automation systems". Split after the first word rather than on a fixed
 * phrase, so the line stays underlined when it is reworded in the admin.
 */
function MarkedLine({
  line,
  markRef,
}: {
  line: string;
  markRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const split = line.indexOf(' ');
  if (split < 1) return <>{line}</>;

  return (
    <>
      {line.slice(0, split + 1)}
      <span className="mark" ref={markRef}>
        {line.slice(split + 1)}
      </span>
    </>
  );
}

/**
 * A note's key terms in <strong>: the list that follows "Strongest in".
 * Any other note renders as written — there is no list to pick out, and
 * guessing at emphasis would be inventing it.
 */
function KeyTerms({ note }: { note: string }) {
  const match = /^(Strongest in )(.+?)(\.?)$/.exec(note);
  if (!match) return <>{note}</>;

  const [, lead, list, stop] = match;
  const parts = list.split(/(, and |, | and )/);

  return (
    <>
      {lead}
      {parts.map((part, i) => (i % 2 === 0 ? <strong key={i}>{part}</strong> : part))}
      {stop}
    </>
  );
}

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
  const markRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const geometry = useRef<Geometry>(ZERO);
  const [ready, setReady] = useState(false);

  /** Last written `data-revealed` / cue state, so paint() only touches the DOM on a change. */
  const flags = useRef({ revealed: false, cueGone: false });

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
  // Stiff enough to settle about 0.25s after the wheel stops; the old 60/28
  // kept the stage drifting for most of a second.
  const progress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 42,
    mass: 0.6,
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
      String(Math.round(trackTop + toScroll(DETAILS_START + 0.02) * scrollable)),
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

    // The underline under the statement's object draws once its line is in.
    markRef.current?.style.setProperty(
      '--mark',
      ease(span(p, LINE_STARTS[1] + 0.06, LINE_STARTS[1] + 0.17)).toFixed(3),
    );

    // Each row's rule draws just ahead of its text, which then wipes in a
    // beat later — the ledger is ruled before it is written.
    factRefs.current.forEach((el, i) => {
      el?.style.setProperty(
        '--draw',
        ease(span(p, FACT_STARTS[i] - 0.04, FACT_STARTS[i] + 0.03)).toFixed(3),
      );
      wipe(el, ease(span(p, FACT_STARTS[i] + 0.01, FACT_STARTS[i] + 0.01 + WIPE_SPAN)), out, 0);
    });

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
     * The scroll cue has done its job the moment scrolling starts: it is gone
     * inside the stage A piece of the map (the first few dozen pixels), well
     * before the first statement line, and back as the page returns to the top.
     */
    if (cueRef.current) {
      const cueOpacity = 1 - span(p, 0, HOLD_END * 0.75);
      cueRef.current.style.opacity = String(cueOpacity);
      const gone = cueOpacity < 0.02;
      if (gone !== flags.current.cueGone) {
        flags.current.cueGone = gone;
        cueRef.current.toggleAttribute('data-gone', gone);
      }
    }

    /*
     * Every row fully in and none clearing yet: only then may the texture's
     * hover cards light in the hero (see globals.css). Mid-wipe, a card's
     * `overflow: visible` would undo the wipe's clip, and at p = 0 it lit a
     * card over the spread masthead.
     */
    const revealed = p >= SETTLE - 0.002 && p < CLEAR_FROM;
    if (revealed !== flags.current.revealed && sectionRef.current) {
      flags.current.revealed = revealed;
      sectionRef.current.toggleAttribute('data-revealed', revealed);
    }
    if (railRef.current)
      railRef.current.style.transform = `scaleY(${1 - ease(span(p, 0.02, 0.22))})`;

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

  /*
   * Scroll drives the whole timeline, through the piecewise map at the top of
   * the file. Painting is a pure function of p, so scrolling back up plays the
   * reveal in reverse with no state to unwind.
   */
  useMotionValueEvent(progress, 'change', (raw) => {
    if (!ready) return;
    paint(fromScroll(raw));
  });

  useEffect(() => {
    if (reduced || !ready) return;

    /*
     * Arrive at the scroll position without playing the way there.
     *
     * The spring was left wherever this page last had it, so painting from it
     * after a restored Back animated the ledger and the masthead out over the
     * showcase for half a second. Read the real progress off the track, which
     * is current even when the spring's source has not caught up yet, and
     * jump the spring to it.
     */
    const track = trackRef.current;
    let raw = progress.get();
    if (track) {
      const top = track.getBoundingClientRect().top + window.scrollY;
      const scrollable = track.offsetHeight - window.innerHeight;
      raw = scrollable > 0 ? clamp((window.scrollY - top) / scrollable) : 0;
    }
    progress.jump(raw);
    paint(fromScroll(raw));
  }, [ready, reduced, paint, progress]);

  if (reduced) return null; // StaticIntro stays; nothing is pinned

  return (
    <section ref={sectionRef} className="hero" id="top" data-section="Hero">
      {/*
        The useful number is the track height minus the viewport, not the
        track height: 220svh gives 120svh of travel — svh, not vh, so a
        phone's collapsing toolbar does not resize it. REVEAL_AT (0.6) spends
        72svh of that on the reveal and 48svh on the dock and hand-over;
        a phone's 190svh gives 54svh and 36svh. Change either height and
        `--hero-pull` in globals.css has to be recomputed with it.
      */}
      <div ref={trackRef} className="h-[220svh] max-md:h-[190svh] relative">
        <div className="sticky top-0 h-svh flex flex-col justify-center overflow-hidden">
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
                the details and the hero are one stop of the scroll-driven
                reveal. */}
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
                    <span>{i === 1 ? <MarkedLine line={line} markRef={markRef} /> : line}</span>
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
                  <span>
                    <KeyTerms note={note} />
                  </span>
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
          </div>

          {/* Says which way, then gets out of the way: paint() fades it over the
              first few dozen pixels of scroll. Decorative to a screen reader —
              the page scrolls the ordinary way and nothing is withheld. A div,
              not a p: the texture hover-card rule sets `position: relative` on
              hero paragraphs, which would drop this into the stage's flow. */}
          <div ref={cueRef} className="hero__cue" aria-hidden="true">
            {/* Shows the gesture rather than naming it: a mouse whose wheel
                rolls for fine pointers, a swipe up for touch. CSS picks one
                by (pointer: fine|coarse). */}
            <span className="cue-mouse">
              <svg viewBox="0 0 18 28" focusable="false">
                <rect x="0.75" y="0.75" width="16.5" height="26.5" rx="8.25" />
                <rect className="cue-wheel" x="8" y="6" width="2" height="5" rx="1" />
              </svg>
              Scroll to begin
            </span>
            <span className="cue-touch">
              <svg viewBox="0 0 18 20" focusable="false">
                <path className="cue-chev" d="M3 9l6-6 6 6" />
                <path className="cue-chev cue-chev--2" d="M3 16l6-6 6 6" />
              </svg>
              Swipe up to begin
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
