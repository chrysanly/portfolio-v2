'use client';

import {
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import type { Device, Project, ProjectImage } from '@/lib/schema';
import { DEVICE_SIZES, mediaKind, PROJECT_TYPE_LABELS } from '@/lib/schema';
import { tiltFor } from '@/lib/rig';
import {
  devicesAttr,
  devicesFor,
  isSlideshow,
  nextSlide,
  type RigDevice,
  shotsFor,
  shouldAutoplay,
  SLIDE_MS,
  slideAlt,
} from '@/lib/devices';
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

/** The incoming shot settles from this scale to 1 as it fades in. */
const SHOT_IN_SCALE = 0.03;

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
 * One project's pictures on one screen of the rig: every shot that device has,
 * stacked, with only the one at `on` shown (`data-on`, a 320ms opacity
 * crossfade in globals.css). An NDA shot carries the corner ribbon; there is no
 * blur, since the owner blurs NDA files before upload (CLAUDE.md rule 3).
 * Video is muted, looped and started by the paint loop only while its project
 * is on screen.
 */
function Shot({
  shots,
  on,
  device,
  shotRef,
}: {
  shots: ProjectImage[];
  on: number;
  device: Device;
  shotRef: (el: HTMLDivElement | null) => void;
}) {
  const size = DEVICE_SIZES[device];

  return (
    <div className="shot" ref={shotRef}>
      {shots.map((image, j) => {
        const media = {
          className: 'shot__media',
          'data-on': j === on ? '' : undefined,
          src: image.src,
          width: image.width ?? size.width,
          height: image.height ?? size.height,
        };
        return mediaKind(image) === 'video' ? (
          <video key={`${image.src}-${j}`} {...media} muted loop playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${image.src}-${j}`}
            {...media}
            alt={slideAlt(image.alt, j, shots.length)}
            loading="lazy"
            decoding="async"
          />
        );
      })}
      {shots[on]?.nda ? <NdaWatermark /> : null}
    </div>
  );
}

/** The shell each device is drawn in. */
const SHELL: Record<RigDevice, string> = {
  laptop: 'rig__laptop',
  mobile: 'rig__phone',
  tablet: 'rig__tablet',
};

/**
 * Shows the shells the project on screen has images for, and no others
 * (2026-10-20: "don't show the device that has no upload"). `data-devices`
 * picks the arrangement in globals.css; a shell that is off fades and shrinks
 * out and its click target leaves the tab order. Called when the current
 * project changes, never per frame.
 */
function showDevices(rig: HTMLElement | null, devices: readonly RigDevice[]) {
  if (!rig) return;
  rig.dataset.devices = devicesAttr(devices);
  for (const device of Object.keys(SHELL) as RigDevice[]) {
    const shell = rig.querySelector<HTMLElement>(`.${SHELL[device]}`);
    if (!shell) continue;
    const off = !devices.includes(device);
    shell.toggleAttribute('data-off', off);
    shell.setAttribute('aria-hidden', String(off));
    for (const control of shell.querySelectorAll<HTMLElement>('.rig__hit')) {
      control.inert = off;
    }
  }
}

/** A horizontal drag past this on the device is a swipe, not a tap. */
const SWIPE_PX = 40;

/**
 * One device shell. With two or more shots for the project on screen it is a
 * slideshow with no on-screen controls (owner, 2026-10-20): tap, swipe or the
 * arrow keys change the shot, and autoplay holds while the shell is hovered or
 * focused, the tab is hidden, the rig is off screen, or motion is reduced. The
 * slide goes back to the first when the project changes. With one shot the
 * device is still.
 */
function DeviceShell({
  device,
  label,
  projects,
  active,
  running,
  reduced,
  initialOff,
  shotRefs,
  decor,
  base,
}: {
  device: RigDevice;
  label: string;
  projects: Pick<ShowcaseProject, 'slug' | 'images'>[];
  active: number;
  /** Tab visible and rig on screen. */
  running: boolean;
  reduced: boolean;
  initialOff: boolean;
  shotRefs: (el: HTMLDivElement | null, project: number, device: Device) => void;
  decor: ReactNode;
  base?: ReactNode;
}) {
  // Only this device's own shots: stand-ins and blank URLs render nothing.
  const shots = useMemo(
    () => projects.map((p) => shotsFor(p.images.filter((img) => !isStandIn(img.src)), device)),
    [projects, device],
  );
  const count = shots[active]?.length ?? 0;
  const slides = isSlideshow(count);

  // The slide belongs to the project it was chosen on; any other starts at 0.
  const [slide, setSlide] = useState({ project: active, i: 0 });
  const index = slide.project === active ? slide.i : 0;
  const [held, setHeld] = useState(false);
  /** Where a press on the device started, to tell a swipe from a tap. */
  const swipeX = useRef<number | null>(null);
  const playing = shouldAutoplay({ count, held, hidden: !running, inView: running, reduced });

  const go = useCallback(
    (step: number) =>
      setSlide((s) => ({
        project: active,
        i: nextSlide(s.project === active ? s.i : 0, count, step),
      })),
    [active, count],
  );

  // One timer per shell, re-armed on every slide and on every resume.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => go(1), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, go]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!slides) return;
    if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      className={SHELL[device]}
      data-off={initialOff ? '' : undefined}
      aria-hidden={initialOff}
      data-slides={slides ? '' : undefined}
      data-playing={playing ? '' : undefined}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div className="rig__body">
        {decor}
        <div className="rig__screen" role="group" aria-roledescription="carousel" aria-label={`${label} screens`}>
          {projects.map((project, i) => (
            <Shot
              key={project.slug}
              device={device}
              shots={shots[i]}
              on={i === active ? index : 0}
              shotRef={(el) => shotRefs(el, i, device)}
            />
          ))}
        </div>
      </div>
      {base}
      {/*
       * A transparent button over the device. A tap shows the next shot; a
       * horizontal swipe past SWIPE_PX goes that way. `touch-action: pan-y`
       * (globals.css) leaves the page's vertical scroll to the browser.
       */}
      <button
        type="button"
        className="rig__hit"
        aria-label={`Show the next screenshot on the ${label}`}
        inert={initialOff}
        tabIndex={slides ? 0 : -1}
        onPointerDown={(event) => {
          swipeX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (swipeX.current === null) return;
          const dx = event.clientX - swipeX.current;
          swipeX.current = null;
          go(Math.abs(dx) > SWIPE_PX && dx > 0 ? -1 : 1);
        }}
        onPointerCancel={() => {
          swipeX.current = null;
        }}
        // Keyboard (Enter/Space) arrives as a click with no pointer: detail 0.
        onClick={(event) => {
          if (event.detail === 0) go(1);
        }}
      />
    </div>
  );
}

/**
 * The devices as one arrangement: laptop behind, phone overlapping at the
 * left, tablet at the right, re-placed by `data-devices` when one or two are
 * missing, and a quiet plate when the project has no images at all. Drawn in
 * CSS so it recolours with the theme. Every screen holds every project's
 * shots, stacked; the paint loop cross-fades projects, and each shell cycles
 * its own project's shots (`DeviceShell`).
 */
function DeviceRig({
  projects,
  shotRefs,
  initial,
  activeRef,
  className = 'rig',
}: {
  projects: Pick<ShowcaseProject, 'slug' | 'images'>[];
  shotRefs: (el: HTMLDivElement | null, project: number, device: Device) => void;
  /** The first project's devices, so the server markup is already arranged. */
  initial: readonly RigDevice[];
  /** Set here; the paint pass calls it when the current project changes. */
  activeRef: MutableRefObject<((project: number) => void) | null>;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [inView, setInView] = useState(false);
  const rigRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    activeRef.current = setActive;
    return () => {
      activeRef.current = null;
    };
  }, [activeRef]);

  // Autoplay holds while the tab is hidden or the rig is mostly off screen.
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    const watch = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.4,
    });
    watch.observe(rig);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      watch.disconnect();
    };
  }, []);

  /*
   * Lean toward a mouse or pen. Not on touch, where the finger is already on
   * the glass, and written to CSS variables on one frame per move.
   */
  const lean = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const rig = rigRef.current;
    if (!rig || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const t = tiltFor({ x: clientX, y: clientY }, rig.getBoundingClientRect());
      rig.style.setProperty('--rig-rx', `${t.rotateX.toFixed(2)}deg`);
      rig.style.setProperty('--rig-ry', `${t.rotateY.toFixed(2)}deg`);
      rig.style.setProperty('--rig-px', t.x.toFixed(3));
      rig.style.setProperty('--rig-py', t.y.toFixed(3));
    });
  };

  const settle = () => {
    cancelAnimationFrame(frame.current);
    for (const name of ['--rig-rx', '--rig-ry', '--rig-px', '--rig-py'])
      rigRef.current?.style.removeProperty(name);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const shell = {
    projects,
    active,
    running: !hidden && inView,
    reduced,
    shotRefs,
  };

  return (
    <div
      className={className}
      ref={rigRef}
      data-devices={devicesAttr(initial)}
      onPointerMove={lean}
      onPointerLeave={settle}
    >
      <DeviceShell
        {...shell}
        device="laptop"
        label="laptop"
        initialOff={!initial.includes('laptop')}
        decor={<span className="rig__cam" />}
        base={<div className="rig__base" />}
      />

      <DeviceShell
        {...shell}
        device="tablet"
        label="tablet"
        initialOff={!initial.includes('tablet')}
        decor={
          <>
            <span className="rig__cam" />
            <span className="rig__btn rig__btn--top" />
            <span className="rig__btn rig__btn--side" />
          </>
        }
      />

      <DeviceShell
        {...shell}
        device="mobile"
        label="phone"
        initialOff={!initial.includes('mobile')}
        decor={
          <>
            <span className="rig__island" />
            <span className="rig__btn rig__btn--power" />
            <span className="rig__btn rig__btn--up" />
            <span className="rig__btn rig__btn--down" />
          </>
        }
      />

      {/* No images for this project: a quiet plate. The story carries the meaning. */}
      <div className="rig__empty" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" focusable="false">
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </svg>
        <b>Screens coming soon</b>
        <small>No shots uploaded yet</small>
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

/**
 * The story column is capped at the panel's height (globals.css), and its
 * problem / What-I-did columns are the part that gives way. Rather than let
 * them be cut mid-line, whole parts step out until what is left fits: the
 * extra "What I did" lines, then that list, then both columns, and on a phone
 * on its side the year and role last of all. The full text
 * is always on the case study; "View case study" is never what gives way.
 */
const FIT_STEPS = ['did-1', 'no-did', 'no-cols', 'no-foot'] as const;

function fitStory(el: HTMLElement) {
  delete el.dataset.fit;
  const cols = el.querySelector<HTMLElement>('.story__cols');
  const fits = () =>
    (!cols || cols.scrollHeight <= cols.clientHeight + 1) &&
    el.scrollHeight <= el.clientHeight + 1;
  for (const step of FIT_STEPS) {
    if (fits()) return;
    el.dataset.fit = step;
  }
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
  const barRefs = useRef<(HTMLElement | null)[]>([]);
  const figureRef = useRef<HTMLDivElement>(null);
  /** The rig's own setter for the project on screen: its slideshows follow it. */
  const rigActive = useRef<((project: number) => void) | null>(null);
  const nowRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const current = useRef(-1);

  const count = projects.length;
  const hasShots = projects.some((p) => p.images.some((img) => !isStandIn(img.src)));
  /** Per project, the devices it has its own images for (stand-ins count as none). */
  const deviceSets = useMemo(
    () => projects.map((p) => devicesFor({ images: p.images.filter((img) => !isStandIn(img.src)) })),
    [projects],
  );

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
      if (!el) return;
      el.dataset.substepY = String(projectY(i));
      fitStory(el);
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
          // The incoming shot settles from 1.03 to 1 as it fades in.
          shot.style.transform = `scale(${(1 + SHOT_IN_SCALE * (1 - enter)).toFixed(4)})`;
          shot.style.visibility = shown < 0.01 ? 'hidden' : 'visible';

          // The shot showing in a slideshow; the others stay paused.
          const video = shot.querySelector<HTMLVideoElement>('video[data-on]');
          if (!video) continue;
          if (shown > 0.01 && video.paused) video.play().catch(() => {});
          if (shown <= 0.01 && !video.paused) video.pause();
        }
      });
    },
    [count],
  );

  /*
   * The chapter bar fills with the scroll: the current bar's fill is its
   * project's own progress (a floor of 0.04 so it never vanishes), bars
   * passed stay full and dimmed, bars ahead are empty (globals.css, by
   * data-state). Only the current bar is written per frame.
   */
  const paintIndex = useCallback(
    (f: number) => {
      const now = Math.min(count - 1, Math.max(0, Math.floor(f)));
      if (now !== current.current) {
        current.current = now;
        chapterRefs.current.forEach((chapter, i) => {
          if (!chapter) return;
          chapter.dataset.current = String(i === now);
          chapter.dataset.state = i < now ? 'past' : i === now ? 'current' : 'ahead';
          if (i !== now) barRefs.current[i]?.style.removeProperty('transform');
        });
        showDevices(figureRef.current?.querySelector<HTMLElement>('.rig') ?? null, deviceSets[now] ?? []);
        rigActive.current?.(now);
        if (nowRef.current) {
          nowRef.current.dataset.n = `${pad(now + 1)} / ${pad(count)}`;
          nowRef.current.textContent = projects[now]?.title ?? '';
        }
      }

      const bar = barRefs.current[now];
      if (bar) bar.style.transform = `scaleX(${Math.max(0.04, clamp(f - now)).toFixed(4)})`;

      if (hintRef.current) hintRef.current.style.opacity = (1 - span(f, 0.12, 0.32)).toFixed(3);
    },
    [count, projects, deviceSets],
  );

  /*
   * Scroll parallax: the three devices drift apart by depth (globals.css,
   * --sdepth) as the whole showcase scrolls. Driven by the overall progress,
   * not each project's, so the shells never jump at a project boundary.
   */
  const paintRig = useCallback((p: number) => {
    figureRef.current?.style.setProperty('--sy', (0.5 - clamp(p)).toFixed(4));
  }, []);

  const paint = useCallback(
    (p: number) => {
      const f = clamp(p) * count;
      paintStories(f);
      paintShots(f);
      paintIndex(f);
      paintRig(p);
    },
    [count, paintStories, paintShots, paintIndex, paintRig],
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
                      <span className="chapter__title">{project.title}</span>
                    </span>
                    <span className="chapter__bar" aria-hidden="true">
                      <i
                        ref={(el) => {
                          barRefs.current[i] = el;
                        }}
                      />
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
              <div className="showcase__figure" ref={figureRef}>
                <DeviceRig
                  projects={projects}
                  initial={deviceSets[0] ?? []}
                  activeRef={rigActive}
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
