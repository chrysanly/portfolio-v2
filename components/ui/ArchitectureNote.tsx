'use client';

/**
 * What this site is built out of, told as what happens when the content
 * changes: "How this works?".
 *
 * Asked for on 2026-09-22, for one reader in particular: an engineering
 * manager who wants to know whether the person who wrote the portfolio
 * understands the infrastructure under it. Everything else on the site is
 * work done for other people behind an NDA — this is the one system a visitor
 * is standing inside while they read about it.
 *
 * It was a three-hop request path (Next.js → Laravel → Neon, Cloudinary on a
 * branch) with Chrys's paragraph as its caption. It is now five plain steps on
 * a numbered rail. The step sentences were given in the brief; each step's
 * detail line is lifted from Chrys's paragraph, so the paragraph's facts are
 * all still published — just distributed along the rail.
 *
 * `<ol>`, deliberately: the five steps are a real sequence, which is the only
 * thing that earns numbered markup.
 *
 * Motion (one orchestrated moment, scroll-linked, not on a timer): the rail is
 * an inline SVG drawn segment by segment as the section scrolls into view,
 * and each step lights up as the line reaches it. Opacity and transform only.
 * Reduced motion: the rail is drawn and every step lit from the start.
 * Before hydration the same is true, so a visitor without JS loses nothing
 * but the detail lines, which need the buttons.
 */

import { useEffect, useId, useRef, useState } from 'react';
import {
  animate,
  type MotionStyle,
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import '@/app/how-it-works.css';

/**
 * `detail` is lifted from the paragraph this section already published (see
 * PROSE in this file's history), trimmed only to stand alone: no new facts.
 * The step sentences themselves came with the brief; "admin", "told to
 * refresh" and "cached pages" are not in that paragraph (they describe the
 * revalidation flow in CLAUDE.md) and were flagged when this was built.
 */
const STEPS = [
  {
    text: 'You edit in the admin.',
    detail: 'This portfolio is engineered as a decoupled, headless production application.',
  },
  {
    text: 'Laravel on Render saves it to Neon PostgreSQL.',
    detail:
      'A custom REST API built with Laravel, hosted on Render, and backed by a serverless Neon PostgreSQL database.',
  },
  {
    text: 'The site is told to refresh.',
    detail: 'The frontend dynamically consumes that custom REST API.',
  },
  {
    text: 'Next.js on Vercel re-reads the content and serves cached pages.',
    detail: 'The fast, SEO-optimized frontend is built with Next.js and deployed on Vercel.',
  },
  {
    text: 'Images come from Cloudinary.',
    detail: 'Static assets and project media are optimized and served through Cloudinary.',
  },
] as const;

const LAST = STEPS.length - 1;

/**
 * Two placements, because the section is doing two different jobs.
 *
 * `page` is the home route: a screen of its own between the work and the
 * contact band, with the rule above it as the boundary between the two.
 *
 * `detail` is /about, where it is one more entry in a column that already
 * reads Experience, Education, Languages, Availability — no rule, no
 * screenful of height, the same 64px above the heading as they have.
 *
 * `dialog` is the header's How? dialog (HowItWorksButton), which supplies its
 * own shell. There is no scroll inside it to draw the rail with, so the line
 * draws on a timer instead: once per open, 120ms after it, over 900ms.
 */
const DRAW_DELAY_S = 0.12;
const DRAW_S = 0.9;
/** Ease-out cubic, as the approved design's 1 - (1 - x)^3. */
const EASE_OUT_CUBIC = [0.33, 1, 0.68, 1] as const;

export function ArchitectureNote({
  variant = 'page',
  headingId,
}: {
  variant?: 'page' | 'detail' | 'dialog';
  /** The dialog labels itself by this heading, so it supplies the id. */
  headingId?: string;
}) {
  const detail = variant === 'detail';
  const dialog = variant === 'dialog';
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLOListElement>(null);
  // Unique per instance: /about's detail note and the header dialog can be
  // on the page together.
  const ownId = useId();
  const titleId = headingId ?? ownId;

  /*
   * Armed only after mount and only when motion is allowed. Until then the
   * server markup is the finished state — drawn and lit — so nothing dims
   * on a page that never hydrates, and reduced motion never sees a change.
   */
  const [armed, setArmed] = useState(false);
  useEffect(() => setArmed(!reduced), [reduced]);

  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ['start 0.85', 'end 0.55'],
  });
  // The site's scroll spring (WorkShowcase, MastheadHero): settles shortly
  // after the wheel stops instead of stepping with it.
  const scrolled = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 42,
    mass: 0.6,
    restDelta: 0.001,
  });

  // The dialog's timed draw-on. It mounts on every open, so it replays each time.
  const timed = useMotionValue(0);
  useEffect(() => {
    if (!dialog || !armed) return;
    timed.set(0);
    const run = animate(timed, 1, { duration: DRAW_S, delay: DRAW_DELAY_S, ease: EASE_OUT_CUBIC });
    return () => run.stop();
  }, [dialog, armed, timed]);

  const progress = dialog ? timed : scrolled;

  /* How many steps the line has reached. Stored as a count so React only
     re-renders when a step actually changes state, not on every frame. */
  const [lit, setLit] = useState(0);
  useMotionValueEvent(progress, 'change', (p) => {
    const next = p <= 0.01 ? 0 : Math.min(STEPS.length, Math.floor(p * LAST + 0.02) + 1);
    setLit((prev) => (prev === next ? prev : next));
  });

  const body = (
    <>
      <p className={variant === 'page' ? 'section-label' : 'hiw__eyebrow'}>
        Engineering stack and architecture
      </p>
      <h2 id={titleId} className="hiw__title">
        How this works?
      </h2>

      <ol ref={railRef} className="hiw__rail" data-armed={armed ? '' : undefined}>
        {STEPS.map((step, i) => (
          <Step
            key={step.text}
            index={i}
            text={step.text}
            detail={step.detail}
            lit={!armed || i < lit}
            progress={armed ? progress : null}
          />
        ))}
      </ol>
    </>
  );

  /*
   * On /about the surrounding page already provides the `.wrap`, so this must
   * not add a second one — nesting them would indent the content past the
   * column every other entry sits in and cap its width twice.
   */
  // The dialog's panel is the `.hiw` container and the landmark itself.
  if (dialog) return body;

  if (detail) {
    return (
      <section className="detail-section arch arch--detail hiw" aria-labelledby={titleId}>
        {body}
      </section>
    );
  }

  return (
    <section className="arch hiw" aria-labelledby={titleId}>
      <div className="wrap arch__inner">{body}</div>
    </section>
  );
}

function Step({
  index,
  text,
  detail,
  lit,
  progress,
}: {
  index: number;
  text: string;
  detail: string;
  lit: boolean;
  /** Null when the rail should simply be drawn (reduced motion, pre-hydration). */
  progress: MotionValue<number> | null;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();

  return (
    <li className="hiw__step" data-lit={lit ? '' : undefined}>
      {index < LAST ? <Segment index={index} progress={progress} /> : null}
      <button
        type="button"
        className="hiw__toggle"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hiw__marker" aria-hidden="true">
          {index + 1}
        </span>
        <span className="hiw__text">{text}</span>
        <svg className="hiw__plus" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M6 1v10M1 6h10" />
        </svg>
      </button>
      <p id={detailId} className="hiw__detail" hidden={!open}>
        {detail}
      </p>
    </li>
  );
}

/**
 * The length of rail leaving step `index`, from its marker to the next one.
 * Inline SVG: a static track and an ink stroke over it, scaled along the
 * rail's direction (X on the row, Y on the column — CSS picks the axis from
 * `--draw`). Each segment owns a quarter of the scroll range, so the line
 * reaches each marker in turn.
 */
function Segment({ index, progress }: { index: number; progress: MotionValue<number> | null }) {
  if (!progress) return <SegmentSvg />;
  return <AnimatedSegment index={index} progress={progress} />;
}

function AnimatedSegment({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const draw = useTransform(progress, (p) => Math.min(1, Math.max(0, p * LAST - index)));
  return (
    <motion.span className="hiw__seg" aria-hidden="true" style={{ '--draw': draw } as MotionStyle}>
      <SegmentSvg bare />
    </motion.span>
  );
}

function SegmentSvg({ bare = false }: { bare?: boolean }) {
  const svg = (
    <svg className="hiw__seg-svg" preserveAspectRatio="none" focusable="false">
      <rect className="hiw__seg-track" width="100%" height="100%" />
      <rect className="hiw__seg-ink" width="100%" height="100%" />
    </svg>
  );
  return bare ? (
    svg
  ) : (
    <span className="hiw__seg" aria-hidden="true">
      {svg}
    </span>
  );
}
