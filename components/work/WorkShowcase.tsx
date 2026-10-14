'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import type { Device, Project, ProjectImage } from '@/lib/schema';
import { DEVICE_SIZES, mediaKind, PROJECT_TYPE_LABELS } from '@/lib/schema';
import { animateScrollTo, easeInOutCubic } from '@/lib/scrollJump';
import { NdaWatermark } from './NdaWatermark';

/**
 * The work index as a pinned sequence — one project at a time.
 *
 * Three layers on one sticky stage: a chapter index across the top (one bar
 * per project, the current one underlined, clickable), the project's story on the left,
 * and a single device rig on the right whose screens cross-fade from one
 * project's shots to the next. One rig rather than one per project, so the
 * hardware stays put and only the work on it changes — the eye has one thing
 * to follow.
 *
 * Transform and opacity only. The scroll value is the same spring the hero
 * uses, so the whole page shares one sense of weight. Each story's parts
 * enter in a short stagger and leave together, upward.
 *
 * With JavaScript off or reduced motion set this renders nothing and the plain
 * server-rendered list underneath is what the visitor gets — same content, no
 * pin, no scroll dependency.
 */

const EASE = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const pad = (n: number) => String(n).padStart(2, '0');

/** How many contributions the story lists before pointing at the case study. */
const DID_SHOWN = 3;
/** Stack chips before "+N". */
const CHIPS_SHOWN = 5;

const DEVICES: Device[] = ['laptop', 'tablet', 'mobile'];

export type ShowcaseProject = Pick<
  Project,
  | 'slug'
  | 'title'
  | 'type'
  | 'year'
  | 'role'
  | 'summary'
  | 'problem'
  | 'contributions'
  | 'stack'
  | 'images'
> & { context: string };

/**
 * A stand-in, not a screenshot. placehold.co rectangles with "1440 x 900"
 * printed across them read as flat slabs inside the shells, so they are
 * treated as an absence: the shell still draws and the screen stays empty.
 */
function isStandIn(src: string): boolean {
  return src.trim() === '' || /(^|\/\/|\.)placehold\.co\//.test(src);
}

/**
 * One project's picture on one screen of the rig.
 *
 * The blur is on the media element itself (`.nda-media`), not inferred from
 * a sibling with `:has()` — so it holds in every browser that draws the
 * ribbon. Video is muted, looped and started by the paint loop only while
 * its project is on screen.
 */
function Shot({
  image,
  device,
  shotRef,
}: {
  image?: ProjectImage;
  device: Device;
  shotRef: (el: HTMLDivElement | null) => void;
}) {
  const usable = image && !isStandIn(image.src) ? image : null;
  const size = DEVICE_SIZES[device];
  const media = usable?.nda ? 'nda-media' : undefined;

  return (
    <div className="shot" ref={shotRef}>
      {usable && mediaKind(usable) === 'video' ? (
        <video
          className={media}
          src={usable.src}
          width={usable.width ?? size.width}
          height={usable.height ?? size.height}
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : usable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={media}
          src={usable.src}
          alt=""
          width={usable.width ?? size.width}
          height={usable.height ?? size.height}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      {usable?.nda ? <NdaWatermark /> : null}
    </div>
  );
}

/**
 * The three devices as one arrangement: laptop behind, phone overlapping at
 * the left, tablet at the right. Drawn in CSS so it recolours with the theme.
 * Every screen holds one shot per project, stacked; the paint loop decides
 * which is visible.
 */
function DeviceRig({
  projects,
  shotRefs,
  className = 'rig',
}: {
  projects: Pick<ShowcaseProject, 'slug' | 'images'>[];
  shotRefs: (el: HTMLDivElement | null, project: number, device: Device) => void;
  className?: string;
}) {
  const screen = (device: Device) => (
    <div className="rig__screen">
      {projects.map((project, i) => (
        <Shot
          key={project.slug}
          device={device}
          image={project.images.find((img) => img.device === device)}
          shotRef={(el) => shotRefs(el, i, device)}
        />
      ))}
    </div>
  );

  return (
    <div className={className}>
      <div className="rig__laptop">
        <div className="rig__body">
          <span className="rig__cam" />
          {screen('laptop')}
        </div>
        <div className="rig__base" />
      </div>

      <div className="rig__tablet">
        <div className="rig__body">
          <span className="rig__cam" />
          <span className="rig__btn rig__btn--top" />
          <span className="rig__btn rig__btn--side" />
          {screen('tablet')}
        </div>
      </div>

      <div className="rig__phone">
        <div className="rig__body">
          <span className="rig__island" />
          <span className="rig__btn rig__btn--power" />
          <span className="rig__btn rig__btn--up" />
          <span className="rig__btn rig__btn--down" />
          {screen('mobile')}
        </div>
      </div>
    </div>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path
      d="M6 3l5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
    />
  </svg>
);

/**
 * One project's story. Every animated part carries `data-k`, its place in the
 * entrance stagger.
 *
 * "More in the case study" rather than "+N more": the short-laptop tier hides
 * the third item in CSS, and a count would then be wrong.
 */
function Story({
  project,
  index,
  count,
}: {
  project: ShowcaseProject;
  index: number;
  count: number;
}) {
  const did = project.contributions.slice(0, DID_SHOWN);
  const more = project.contributions.length > DID_SHOWN - 1;
  const extraStack = project.stack.length - CHIPS_SHOWN;
  const cols = (project.problem ? 1 : 0) + (did.length > 0 ? 1 : 0);

  return (
    <>
      <div className="story__head" data-k="0">
        <span className="story__n">
          {pad(index + 1)} / {pad(count)}
        </span>
        <h3 className="story__title">{project.title}</h3>
      </div>

      <div className="system" data-k="1">
        <p className="system__kind">
          <span>{PROJECT_TYPE_LABELS[project.type]} system</span>
          {project.context ? <span>{project.context}</span> : null}
        </p>
        <p className="system__desc">{project.summary}</p>
      </div>

      {cols > 0 ? (
        <div className="story__cols" data-cols={cols}>
          {project.problem ? (
            <div className="problem" data-k="2">
              <p className="story__label">The problem</p>
              <p>{project.problem}</p>
            </div>
          ) : null}

          {did.length > 0 ? (
            <div className="did">
              <p className="story__label" data-k="3">
                What I did
              </p>
              <ul>
                {did.map((item, j) => (
                  <li key={item} data-k={3 + j}>
                    {item}
                  </li>
                ))}
                {more ? (
                  <li data-more="" data-k={3 + did.length}>
                    More in the case study
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="story__foot" data-k="7">
        <div className="facts-inline">
          <span>
            <b>Year</b>
            {project.year}
          </span>
          <span>
            <b>Role</b>
            {project.role}
          </span>
        </div>
        {project.stack.length > 0 ? (
          <ul className="chips">
            {project.stack.slice(0, CHIPS_SHOWN).map((item) => (
              <li key={item}>{item}</li>
            ))}
            {extraStack > 0 ? <li>+{extraStack}</li> : null}
          </ul>
        ) : null}
      </div>

      {/*
       * `tabIndex={-1}` because the whole section is `aria-hidden`: a focusable
       * control inside an aria-hidden subtree lands focus somewhere a screen
       * reader will not announce. Keyboard and AT users reach the same pages
       * through the header's Work link.
       */}
      <p className="story__cta" data-k="8">
        <Link
          className="button panel__button"
          href={`/work/${project.slug}`}
          tabIndex={-1}
          data-veil-title={project.title}
          prefetch
        >
          View case study
          <Arrow />
        </Link>
      </p>
    </>
  );
}

interface StoryParts {
  el: HTMLElement;
  parts: { el: HTMLElement; k: number }[];
  system: HTMLElement | null;
}

export function WorkShowcase({ projects }: { projects: ShowcaseProject[] }) {
  const reduced = useReducedMotion();
  const router = useRouter();

  /*
   * Every case study is fetched ahead, as soon as the showcase is up — the
   * links sit in hidden panels until their project's turn, so waiting for
   * them to scroll into view left the click to do the fetching. With the
   * page already in the router cache, the veil hands straight over to it.
   */
  useEffect(() => {
    for (const project of projects) router.prefetch(`/work/${project.slug}`);
  }, [projects, router]);
  const trackRef = useRef<HTMLDivElement>(null);
  const storyRefs = useRef<(HTMLElement | null)[]>([]);
  const stories = useRef<StoryParts[]>([]);
  /** [project][device] — every project's shot on every screen. */
  const shotRefs = useRef<Partial<Record<Device, HTMLDivElement | null>>[]>([]);
  const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const nowRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const current = useRef(-1);

  const count = projects.length;
  const hasShots = projects.some((p) => p.images.some((img) => !isStandIn(img.src)));

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  // The same spring as the hero: settles about 0.25s after the wheel stops.
  const progress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 42,
    mass: 0.6,
    restDelta: 0.001,
  });

  /*
   * The section pager treats each project as its own stop. A story's slot
   * lives inside one pinned track, so it has no DOM position that means
   * anything as a scroll offset: each story carries `data-substep-title` and
   * `data-substep-y` (its slot's midpoint, written here once geometry is
   * known), and `data-showcase-active`/`data-showcase-panel` — kept live by a
   * plain scroll listener rather than the spring — say which one is current.
   */
  const geometry = useRef({ trackTop: 0, scrollable: 0 });

  const projectY = useCallback(
    (i: number) => {
      const { trackTop, scrollable } = geometry.current;
      return Math.round(trackTop + ((i + 0.5) / count) * scrollable);
    },
    [count],
  );

  const measure = useCallback(() => {
    const track = trackRef.current;
    const stage = track?.querySelector<HTMLElement>('.showcase__stage');
    if (!track || !stage || count === 0) return;

    geometry.current = {
      trackTop: track.getBoundingClientRect().top + window.scrollY,
      scrollable: track.offsetHeight - stage.offsetHeight,
    };

    storyRefs.current.forEach((el, i) => {
      if (el) el.dataset.substepY = String(projectY(i));
    });
  }, [count, projectY]);

  useLayoutEffect(() => {
    if (reduced || count === 0) return;

    stories.current = storyRefs.current.map((el) => ({
      el: el as HTMLElement,
      parts: [...(el?.querySelectorAll<HTMLElement>('[data-k]') ?? [])].map((part) => ({
        el: part,
        k: Number(part.dataset.k),
      })),
      system: el?.querySelector<HTMLElement>('.system') ?? null,
    }));

    measure();
    window.addEventListener('resize', measure);

    const onScroll = () => {
      const { trackTop, scrollable } = geometry.current;
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
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll);
      delete document.documentElement.dataset.showcaseActive;
    };
  }, [reduced, count, measure]);

  const paintStories = useCallback(
    (f: number) => {
      stories.current.forEach(({ el, parts, system }, i) => {
        const a = f - i;
        const live = !((a < 0 && i > 0) || (a > 1 && i < count - 1));
        // The last story never leaves: there is nothing after it to make room for.
        const exit = i === count - 1 ? 0 : EASE(span(a, 0.84, 1));

        el.style.visibility = live && exit < 0.99 ? 'visible' : 'hidden';
        if (!live) return;

        for (const part of parts) {
          // The first story is already in place when the stage pins.
          const enter = i === 0 ? 1 : EASE(span(a, part.k * 0.025, 0.12 + part.k * 0.025));
          part.el.style.opacity = (enter * (1 - exit)).toFixed(3);
          part.el.style.transform = `translate3d(0, ${((1 - enter) * 14 - exit * 10).toFixed(1)}px, 0)`;
        }

        system?.style.setProperty(
          '--grow',
          (i === 0 ? 1 : EASE(span(a, 0.03, 0.16))).toFixed(3),
        );
      });
    },
    [count],
  );

  const paintShots = useCallback(
    (f: number) => {
      shotRefs.current.forEach((byDevice, i) => {
        const a = f - i;
        const enter = i === 0 ? 1 : EASE(span(a, -0.06, 0.1));
        const leave = i === count - 1 ? 0 : EASE(span(a, 0.9, 1.06));
        const gone = (a < -0.06 && i > 0) || (a > 1.06 && i < count - 1);
        const shown = gone ? 0 : enter * (1 - leave);

        for (const device of DEVICES) {
          const shot = byDevice?.[device];
          if (!shot) continue;
          shot.style.opacity = shown.toFixed(3);
          shot.style.visibility = shown < 0.01 ? 'hidden' : 'visible';

          const video = shot.querySelector('video');
          if (!video) continue;
          if (shown > 0.01 && video.paused) video.play().catch(() => {});
          if (shown <= 0.01 && !video.paused) video.pause();
        }
      });
    },
    [count],
  );

  const paintIndex = useCallback(
    (f: number) => {
      const now = Math.min(count - 1, Math.max(0, Math.floor(f)));
      if (now !== current.current) {
        current.current = now;
        chapterRefs.current.forEach((chapter, i) => {
          if (chapter) chapter.dataset.current = String(i === now);
        });
        if (nowRef.current) {
          nowRef.current.dataset.n = `${pad(now + 1)} / ${pad(count)}`;
          nowRef.current.textContent = projects[now]?.title ?? '';
        }
      }

      if (hintRef.current) hintRef.current.style.opacity = (1 - span(f, 0.12, 0.32)).toFixed(3);
    },
    [count, projects],
  );

  const paint = useCallback(
    (p: number) => {
      const f = clamp(p) * count;
      paintStories(f);
      paintShots(f);
      paintIndex(f);
    },
    [count, paintStories, paintShots, paintIndex],
  );

  useMotionValueEvent(progress, 'change', paint);

  useEffect(() => {
    if (!reduced) paint(progress.get());
  }, [reduced, paint, progress]);

  const jumpTo = (i: number) => {
    measure();
    const distance = Math.abs(i - Math.max(0, current.current));
    void animateScrollTo(projectY(i), Math.min(900, 350 + distance * 110), easeInOutCubic);
  };

  if (reduced || count === 0) return null;

  return (
    <section className="showcase" aria-hidden="true">
      <div ref={trackRef} className="showcase__track" style={{ height: `${count * 75}vh` }}>
        <div className="showcase__stage">
          <nav className="chapters wrap">
            <ol style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
              {projects.map((project, i) => (
                <li key={project.slug}>
                  <button
                    type="button"
                    className="chapter"
                    tabIndex={-1}
                    onClick={() => jumpTo(i)}
                    ref={(el) => {
                      chapterRefs.current[i] = el;
                    }}
                  >
                    <span className="chapter__label">
                      <b>{pad(i + 1)}</b>
                      {project.title}
                    </span>
                    <span className="chapter__bar" aria-hidden="true">
                      <i />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="chapters__now" ref={nowRef} />
          </nav>

          <div className="showcase__body wrap" data-shots={hasShots ? 'true' : 'false'}>
            <div className="texts">
              {projects.map((project, i) => (
                <article
                  key={project.slug}
                  className="ptext"
                  data-substep-title={project.title}
                  ref={(el) => {
                    storyRefs.current[i] = el;
                  }}
                >
                  <Story project={project} index={i} count={count} />
                </article>
              ))}
            </div>

            {hasShots ? (
              <div className="showcase__figure">
                <DeviceRig
                  projects={projects}
                  shotRefs={(el, i, device) => {
                    if (!shotRefs.current[i]) shotRefs.current[i] = {};
                    shotRefs.current[i][device] = el;
                  }}
                />
              </div>
            ) : null}
          </div>

          <p className="hint" ref={hintRef}>
            Scroll for the next project
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M8 3v10M3.5 8.5 8 13l4.5-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}
