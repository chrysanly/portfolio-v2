'use client';

import { useCallback, useEffect, useRef } from 'react';
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
 * One screen inside a device shell.
 *
 * `width`/`height` are always emitted — from the image when it declares them,
 * otherwise from DEVICE_SIZES — so the browser reserves the box before the
 * file arrives and a slow image cannot shift the panel.
 */
function Screen({ device, image }: { device: Device; image?: ProjectImage }) {
  if (!image) return null;
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
          <div className="rig__base">
            <span className="rig__notch" />
          </div>
        </div>
      ) : null}

      {tablet ? (
        <div className="rig__tablet" ref={(el) => shellRefs(el, 1)}>
          <div className="rig__screen">
            <Screen device="tablet" image={tablet} />
          </div>
        </div>
      ) : null}

      {mobile ? (
        <div className="rig__phone" ref={(el) => shellRefs(el, 2)}>
          <span className="rig__island" />
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
            const hasShots = project.images.length > 0;

            return (
              <article
                key={project.slug}
                className="panel"
                data-shots={hasShots ? 'true' : 'false'}
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
