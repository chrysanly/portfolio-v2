'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import type { Device, Project, ProjectImage } from '@/lib/schema';
import { DEVICE_SIZES, PROJECT_TYPE_LABELS } from '@/lib/schema';

/**
 * The work index as a pinned sequence — one project at a time.
 *
 * Gate (per the `animate` skill): a visitor passes this once per visit, so it
 * sits in the rare tier where a deliberate animation is warranted. Purpose is
 * explanation plus spatial consistency — the index is an ordered run of work
 * and the motion is what makes the order legible.
 *
 * Transform and opacity only. The scroll value is the same spring the hero
 * uses, so the whole page shares one sense of weight. Panels enter from below
 * and leave upward: the exit is the entrance reversed, which is what stops a
 * scroll-back from feeling like a different animation.
 *
 * With JavaScript off or reduced motion set this renders nothing and the plain
 * server-rendered list underneath is what the visitor gets — same content, no
 * pin, no scroll dependency.
 */

const EASE = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

/** Panel timing inside its own slot, 0–1. */
const IN_END = 0.26;
const OUT_START = 0.8;

export type ShowcaseProject = Pick<
  Project,
  'slug' | 'title' | 'type' | 'year' | 'role' | 'summary' | 'stack' | 'outcome' | 'images'
> & { attribution: string };

/**
 * A stand-in, not a screenshot.
 *
 * The seeded content points every project's images at placehold.co — grey
 * rectangles with "1440 x 900" printed across them. Rendered inside the
 * shells they read as three flat slabs rather than as three devices, and the
 * dimension text is the loudest thing on the panel.
 *
 * So they are treated as what they are: an absence. The shell still draws,
 * the screen is left empty, and the composition reads as a laptop, a tablet
 * and a phone — which is the point of the rig. Real screenshots replace them
 * with no further change here (docs/CONTENT-TODO.md, blocker 5).
 */
function isStandIn(src: string): boolean {
  return src.trim() === '' || /(^|\/\/|\.)placehold\.co\//.test(src);
}

/**
 * One screen inside a device shell.
 *
 * `width`/`height` are always emitted — from the image when it declares them,
 * otherwise from DEVICE_SIZES — so the browser reserves the box before the
 * file arrives and a slow image cannot shift the panel.
 */
function Screen({ device, image }: { device: Device; image?: ProjectImage }) {
  if (!image || isStandIn(image.src)) return null;
  const size = DEVICE_SIZES[device];
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={image.src}
      alt={image.alt}
      width={image.width ?? size.width}
      height={image.height ?? size.height}
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * The three devices as one arrangement: laptop behind, phone overlapping at
 * the left, tablet at the right. Drawn in CSS — docs/02-TRD.md §1 allows no
 * image assets for chrome, and a mockup PNG would not recolour for dark mode.
 *
 * Each shell moves at its own rate as the panel arrives, so the group assembles
 * rather than sliding in as one block.
 */
function DeviceRig({
  images,
  shellRefs,
}: {
  images: ProjectImage[];
  shellRefs: (el: HTMLElement | null, slot: number) => void;
}) {
  const byDevice = (d: Device) => images.find((img) => img.device === d);
  const laptop = byDevice('laptop');
  const tablet = byDevice('tablet');
  const mobile = byDevice('mobile');

  return (
    <div className="rig" aria-hidden={images.length === 0 || undefined}>
      {laptop ? (
        <div className="rig__laptop" ref={(el) => shellRefs(el, 0)}>
          <div className="rig__lid">
            <span className="rig__cam" />
            <div className="rig__screen">
              <Screen device="laptop" image={laptop} />
            </div>
          </div>
          {/* The deck, seen foreshortened: keyboard well, trackpad, front lip. */}
          <div className="rig__base">
            <span className="rig__keys" />
            <span className="rig__trackpad" />
            <span className="rig__notch" />
          </div>
        </div>
      ) : null}

      {tablet ? (
        <div className="rig__tablet" ref={(el) => shellRefs(el, 1)}>
          <span className="rig__cam rig__cam--edge" />
          <span className="rig__btn rig__btn--power" />
          <span className="rig__btn rig__btn--vol" />
          <div className="rig__screen">
            <Screen device="tablet" image={tablet} />
          </div>
        </div>
      ) : null}

      {mobile ? (
        <div className="rig__phone" ref={(el) => shellRefs(el, 2)}>
          <span className="rig__island" />
          <span className="rig__btn rig__btn--power" />
          <span className="rig__btn rig__btn--vol-up" />
          <span className="rig__btn rig__btn--vol-down" />
          <div className="rig__screen">
            <Screen device="mobile" image={mobile} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WorkShowcase({ projects }: { projects: ShowcaseProject[] }) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const figureRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** [panelIndex][slot] — laptop, tablet, phone. */
  const shellRefs = useRef<(HTMLElement | null)[][]>([]);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 28,
    restDelta: 0.001,
  });

  const count = projects.length;

  /*
   * The section pager treats each project as its own stop rather than
   * jumping straight from one end of the showcase to the other — "Next"
   * from Details used to skip every panel but the first, which is the
   * opposite of what a showcase is for. Same problem as the hero's Details
   * stop: a panel's slot lives inside one pinned track, so nothing about it
   * has a DOM position that means anything as a scroll offset. Each panel
   * carries `data-substep-title` (its project's title, set once in the JSX
   * below) and `data-substep-y` (its slot's midpoint in pixels — past its
   * entrance, before its exit — written here once geometry is known); the
   * pager reads both to build one titled stop per project instead of a
   * single generic one. `data-showcase-active`/`data-showcase-panel`, kept
   * live by a plain scroll listener rather than the spring-smoothed
   * `progress` below, say which one is current: the pager needs the raw,
   * immediate position, not the same trailing motion the panels animate
   * with.
   */
  const showcaseGeometry = useRef({ trackTop: 0, scrollable: 0 });

  const measureShowcaseGeometry = useCallback(() => {
    const track = trackRef.current;
    const stage = track?.querySelector<HTMLElement>('.showcase__stage');
    if (!track || !stage || count === 0) return;

    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = track.offsetHeight - stage.offsetHeight;
    showcaseGeometry.current = { trackTop, scrollable };

    for (let i = 0; i < count; i += 1) {
      const panel = panelRefs.current[i];
      if (!panel) continue;
      panel.dataset.substepY = String(
        Math.round(trackTop + ((i + 0.5) / count) * scrollable),
      );
    }
  }, [count]);

  useLayoutEffect(() => {
    if (reduced || count === 0) return;

    measureShowcaseGeometry();
    window.addEventListener('resize', measureShowcaseGeometry);

    const onScroll = () => {
      const { trackTop, scrollable } = showcaseGeometry.current;
      const y = window.scrollY;
      const active = scrollable > 0 && y >= trackTop - 4 && y <= trackTop + scrollable + 4;
      document.documentElement.dataset.showcaseActive = active ? 'on' : 'off';
      if (active) {
        const p = clamp((y - trackTop) / scrollable);
        document.documentElement.dataset.showcasePanel = String(
          Math.min(count - 1, Math.floor(p * count)),
        );
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('resize', measureShowcaseGeometry);
      window.removeEventListener('scroll', onScroll);
      delete document.documentElement.dataset.showcaseActive;
    };
  }, [reduced, count, measureShowcaseGeometry]);

  const paint = useCallback(
    (p: number) => {
      for (let i = 0; i < count; i += 1) {
        const panel = panelRefs.current[i];
        if (!panel) continue;

        // Where this panel sits in its own slot: <0 not yet, >1 already gone.
        const a = p * count - i;

        let show = 0;
        let shift = 34;
        let scale = 0.985;

        if (a >= 0 && a <= 1.08) {
          const enter = EASE(span(a, 0, IN_END));
          const leave = EASE(span(a, OUT_START, 1.08));
          show = enter * (1 - leave);
          shift = (1 - enter) * 34 - leave * 26;
          scale = 0.985 + enter * 0.015 - leave * 0.012;
        }

        panel.style.opacity = show.toFixed(3);
        panel.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
        panel.style.visibility = show < 0.01 ? 'hidden' : 'visible';

        // The figure travels further than the text, which gives the panel
        // depth without a parallax library.
        const figure = figureRefs.current[i];
        if (figure) {
          const f = a >= 0 && a <= 1.08 ? EASE(span(a, 0, IN_END + 0.12)) : 0;
          figure.style.transform = `translate3d(0, ${((1 - f) * 62).toFixed(1)}px, 0)`;
        }

        /*
         * Each shell settles on its own delay so the arrangement assembles —
         * laptop first, then tablet, then phone. Transforms are written to the
         * elements directly rather than inherited from a variable on the
         * parent, which would restyle every child each frame.
         */
        const shells = shellRefs.current[i];
        if (shells) {
          for (let sIdx = 0; sIdx < shells.length; sIdx += 1) {
            const shell = shells[sIdx];
            if (!shell) continue;
            const delay = sIdx * 0.07;
            const k =
              a >= 0 && a <= 1.08 ? EASE(span(a, delay, delay + IN_END + 0.16)) : 0;
            const rise = (1 - k) * (26 + sIdx * 16);
            const dim = 0.35 + k * 0.65;
            shell.style.transform = `translate3d(0, ${rise.toFixed(1)}px, 0) scale(${(0.955 + k * 0.045).toFixed(4)})`;
            shell.style.opacity = dim.toFixed(3);
          }
        }
      }
    },
    [count],
  );

  useMotionValueEvent(progress, 'change', paint);

  useEffect(() => {
    if (!reduced) paint(progress.get());
  }, [reduced, paint, progress]);

  if (reduced) return null;

  return (
    <section className="showcase" aria-hidden="true">
      <div
        ref={trackRef}
        className="showcase__track"
        style={{ height: `${count * 88}vh` }}
      >
        <div className="showcase__stage">
          {projects.map((project, i) => {
            /*
             * Counts stand-ins too, deliberately. `data-shots="false"` hides
             * the figure altogether and gives the text the full measure —
             * right for a project with no imagery at all, wrong here, where
             * the shells are the imagery: empty device chrome is the frame,
             * not a placeholder graphic sitting in it.
             */
            const hasShots = project.images.length > 0;

            return (
              <article
                key={project.slug}
                className="panel"
                data-shots={hasShots ? 'true' : 'false'}
                data-substep-title={project.title}
                ref={(el) => {
                  panelRefs.current[i] = el;
                }}
              >
                <div className="wrap panel__inner">
                  <p className="panel__count">
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <em>/ {String(count).padStart(2, '0')}</em>
                    <b>{PROJECT_TYPE_LABELS[project.type]}</b>
                  </p>

                  <div className="panel__body">
                    <div className="panel__text">
                      <h3 className="panel__title">{project.title}</h3>
                      <p className="panel__attr">{project.attribution}</p>
                      <p className="panel__summary">{project.summary}</p>

                      <dl className="panel__meta">
                        <div>
                          <dt>Year</dt>
                          <dd>{project.year}</dd>
                        </div>
                        <div>
                          <dt>Role</dt>
                          <dd>{project.role}</dd>
                        </div>
                        <div>
                          <dt>Stack</dt>
                          <dd>{project.stack.join(', ')}</dd>
                        </div>
                      </dl>

                      <p className="panel__out">
                        <b>{project.outcome.value}</b>
                        <em>{project.outcome.label}</em>
                      </p>
                    </div>

                    <div
                      className="panel__figure"
                      ref={(el) => {
                        figureRefs.current[i] = el;
                      }}
                    >
                      {hasShots ? (
                        <DeviceRig
                          images={project.images}
                          shellRefs={(el, slot) => {
                            if (!shellRefs.current[i]) shellRefs.current[i] = [];
                            shellRefs.current[i][slot] = el;
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
