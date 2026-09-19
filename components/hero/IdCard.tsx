'use client';

import { useEffect, useRef } from 'react';
import { languages, site } from '@/content/site';

/**
 * The identity badge, hung from a real lanyard.
 *
 * Chrys asked for the behaviour of reactbits.dev/components/lanyard, which is a
 * rope of Rapier rigid bodies rendered through react-three-fiber. That stack —
 * three, @react-three/fiber, @react-three/drei, @react-three/rapier, meshline —
 * is roughly 600kB of JavaScript against a 120kB first-load budget, and
 * `docs/02-TRD.md` §1 does not allow it. So the physics is written here
 * instead, in about 4kB and no dependencies, and it is the same physics:
 *
 *   - A Verlet chain. Fourteen points, gravity, and a distance constraint per
 *     segment relaxed over several iterations per frame. The cord genuinely
 *     bends and goes slack; it is not a strap being rotated.
 *   - The card is two more points in the same chain — the slot it hangs by and
 *     its bottom edge — so it swings on the cord rather than being pinned to
 *     it, and its rotation falls out of the physics instead of being authored.
 *   - Grab it anywhere and it follows the point you grabbed. Let go and the
 *     velocity is already in the integrator, so it flies and settles.
 *
 * This is also how charmling.app does it: an SVG cord and a separate charm
 * element, not a 3D scene.
 *
 * Under reduced motion none of this runs — the cord renders at rest and the
 * card hangs straight. The content is the same plain text either way.
 */

/**
 * Initials stand in for the portrait until one is supplied: first and last
 * name, the way an ID would carry them, not the first two given names.
 */
const nameParts = site.fullName.split(' ').filter(Boolean);
const initials = `${nameParts[0]?.[0] ?? ''}${nameParts[nameParts.length - 1]?.[0] ?? ''}`;

/** Printed down the webbing, the way a real lanyard carries its wordmark. */
const TAPE_TEXT = `${site.name.toUpperCase()} · `.repeat(14);

const POINTS = 17; // cord segments before the clip
const SEG = 14; // rest length of one segment, px
const CLIP = 30; // clip drop: the hook stands clear above the card's slot
const ANCHOR_Y = -46; // above the stage, so the webbing runs off the top
const GRAVITY = 0.62;
const DRAG = 0.976; // air resistance
const ITERATIONS = 12;
/* A real clip has friction, and a card hanging in one has a preferred way up.
   Without this the card is two points falling at the same rate — no torque
   restores it, so it settles at whatever angle it happened to stop at. */
const UPRIGHT = 0.075;
const TAPE_W = 17; // webbing width

interface P {
  x: number;
  y: number;
  px: number;
  py: number;
  w: number; // inverse mass; 0 pins the point
}

export function IdCard() {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tapeRef = useRef<SVGPathElement>(null);
  const spineRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const tape = tapeRef.current;
    const spine = spineRef.current;
    const clip = clipRef.current;
    const card = cardRef.current;
    if (!stage || !svg || !tape || !spine || !clip || !card) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    let W = 0;
    let H = 0;
    let cardH = 0;
    let cardW = 0;
    let anchorX = 0;

    /*
     * The chain: POINTS cord points, then the card's slot and its bottom edge.
     * Keeping the card in the same solver as the cord is what makes it hang
     * rather than hover — the card's weight is what pulls the cord straight.
     */
    const pts: P[] = [];
    const rope = () => pts.slice(0, POINTS);
    const slot = () => pts[POINTS];
    const foot = () => pts[POINTS + 1];

    const build = () => {
      const box = stage.getBoundingClientRect();
      W = Math.round(box.width);
      H = Math.round(box.height);
      /* offsetWidth, not getBoundingClientRect: the card is mid-rotation most
         of the time and the rect is the transformed box, which is much larger
         than the card and would corrupt the constraint length. */
      cardW = card.offsetWidth || 250;
      cardH = card.offsetHeight || 300;
      anchorX = W / 2;

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', String(W));
      svg.setAttribute('height', String(H));

      pts.length = 0;
      for (let i = 0; i < POINTS; i++) {
        const y = ANCHOR_Y + i * SEG;
        pts.push({ x: anchorX, y, px: anchorX, py: y, w: i === 0 ? 0 : 1 });
      }
      const sy = ANCHOR_Y + (POINTS - 1) * SEG + CLIP;
      pts.push({ x: anchorX, y: sy, px: anchorX, py: sy, w: 0.6 });
      pts.push({
        x: anchorX,
        y: sy + cardH,
        px: anchorX,
        py: sy + cardH,
        w: 0.5,
      });
    };

    let held = false;
    let pointerId = 0;
    let grabDX = 0; // pointer offset from the slot point, at grab time
    let grabDY = 0;
    let twist = 0;
    let twistVel = 0;
    let lastScroll = window.scrollY;
    let grabX = 0;
    let grabY = 0;
    let running = false;
    let frame = 0;
    const born = performance.now();

    const link = (a: P, b: P, len: number) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const total = a.w + b.w;
      if (total === 0) return;
      const k = (d - len) / d / total;
      a.x += dx * k * a.w;
      a.y += dy * k * a.w;
      b.x -= dx * k * b.w;
      b.y -= dy * k * b.w;
    };

    const solve = () => {
      const t = (performance.now() - born) / 1000;

      /*
       * The idle sway is applied to the anchor, not to the card. A lanyard is
       * never quite still, and moving the top lets the cord carry the movement
       * down as a real one would, instead of the card oscillating on its own.
       */
      pts[0].x = anchorX + Math.sin(t * 0.34) * 2.4 + Math.sin(t * 0.21) * 1.3;
      pts[0].y = ANCHOR_Y;

      for (const p of pts) {
        if (p.w === 0) continue;
        const vx = (p.x - p.px) * DRAG;
        const vy = (p.y - p.py) * DRAG;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + GRAVITY;
      }

      if (held) {
        // The grabbed point is pinned to the pointer; everything else is left
        // to the solver, so the card dangles from where it is actually held.
        const s = slot();
        s.x = grabX - grabDX;
        s.y = grabY - grabDY;
        s.px = s.x;
        s.py = s.y;
      }

      for (let n = 0; n < ITERATIONS; n++) {
        for (let i = 0; i < POINTS - 1; i++) link(pts[i], pts[i + 1], SEG);
        link(pts[POINTS - 1], slot(), CLIP);
        link(slot(), foot(), cardH);
        if (held) {
          const s = slot();
          s.x = grabX - grabDX;
          s.y = grabY - grabDY;
        }
      }

      const s = slot();
      const f = foot();
      f.x += (s.x - f.x) * UPRIGHT;
      f.y += (s.y + cardH - f.y) * UPRIGHT;
    };

    /** The webbing: a ribbon built by offsetting the cord along its normal. */
    const paint = () => {
      const r = rope();
      const chain = [...r, slot()];

      let d = `M ${chain[0].x.toFixed(1)} ${chain[0].y.toFixed(1)}`;
      for (let i = 1; i < chain.length - 1; i++) {
        const mx = (chain[i].x + chain[i + 1].x) / 2;
        const my = (chain[i].y + chain[i + 1].y) / 2;
        d += ` Q ${chain[i].x.toFixed(1)} ${chain[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      }
      const end = chain[chain.length - 1];
      d += ` L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      spine.setAttribute('d', d);

      const left: string[] = [];
      const right: string[] = [];
      for (let i = 0; i < chain.length; i++) {
        const a = chain[Math.max(0, i - 1)];
        const b = chain[Math.min(chain.length - 1, i + 1)];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        // Narrows towards the clip, the way webbing does where it is folded.
        const half = (TAPE_W / 2) * (1 - (i / chain.length) * 0.22);
        const nx = (-dy / len) * half;
        const ny = (dx / len) * half;
        left.push(`${(chain[i].x + nx).toFixed(1)} ${(chain[i].y + ny).toFixed(1)}`);
        right.push(`${(chain[i].x - nx).toFixed(1)} ${(chain[i].y - ny).toFixed(1)}`);
      }
      tape.setAttribute('d', `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`);

      const last = r[POINTS - 1];
      const s = slot();
      const f = foot();
      const clipAngle = (Math.atan2(s.x - last.x, s.y - last.y) * -180) / Math.PI;
      clip.setAttribute(
        'transform',
        `translate(${last.x.toFixed(1)} ${last.y.toFixed(1)}) rotate(${clipAngle.toFixed(1)})`,
      );

      // The card's rotation is the direction of its own body, not the cord's:
      // that difference is what reads as weight.
      const angle = (Math.atan2(f.x - s.x, f.y - s.y) * -180) / Math.PI;
      const vx = s.x - s.px;
      twistVel += -0.06 * twist + vx * 0.22;
      twistVel *= 0.88;
      twist = Math.max(-34, Math.min(34, twist + twistVel));

      card.style.transform =
        `translate3d(${(s.x - cardW / 2).toFixed(1)}px, ${s.y.toFixed(1)}px, 0)` +
        ` rotate(${angle.toFixed(2)}deg) rotateY(${twist.toFixed(2)}deg)`;
    };

    const tick = () => {
      solve();
      paint();
      frame = requestAnimationFrame(tick);
    };

    /*
     * Not while the page is still loading. The solver is cheap per frame but it
     * is competing with hydration and font loading for the main thread during
     * exactly the window Lighthouse measures, and nobody can see the badge
     * behind the splash anyway. `data-ready` is set by SplashDismiss.
     */
    const ready = () => document.documentElement.dataset.ready === 'true';

    const start = () => {
      if (running || still.matches) return;
      if (!ready()) {
        window.setTimeout(start, 180);
        return;
      }
      // First measurement happens here, not on mount: reading layout during
      // hydration is a forced reflow in the window that decides the score, and
      // the static geometry in the markup already holds the at-rest pose.
      if (pts.length === 0) build();
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onDown = (event: PointerEvent) => {
      if (still.matches || pts.length === 0) return;
      held = true;
      pointerId = event.pointerId;
      card.setPointerCapture(pointerId);
      card.dataset.held = 'true';
      const box = stage.getBoundingClientRect();
      grabX = event.clientX - box.left;
      grabY = event.clientY - box.top;
      grabDX = grabX - slot().x;
      grabDY = grabY - slot().y;
      event.preventDefault();
    };

    const onMove = (event: PointerEvent) => {
      if (!held) return;
      const box = stage.getBoundingClientRect();
      // Kept inside the stage so it cannot be thrown behind the masthead.
      grabX = Math.max(10, Math.min(W - 10, event.clientX - box.left));
      grabY = Math.max(40, Math.min(H - 40, event.clientY - box.top));
    };

    const onUp = () => {
      if (!held) return;
      held = false;
      delete card.dataset.held;
      try {
        card.releasePointerCapture(pointerId);
      } catch {
        // The pointer may already be gone; nothing to release.
      }
    };

    const onScroll = () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (held || pts.length === 0) return;
      // Scrolling jogs the cord, as moving would jog a badge on your chest.
      const kick = Math.max(-2.4, Math.min(2.4, delta * 0.06));
      for (let i = 4; i < pts.length; i++) pts[i].px -= kick * (i / pts.length);
    };

    const onResize = () => {
      if (pts.length > 0) build();
    };

    /* The loop is the hero's alone — there is no reason to integrate a rope
       that is three sections off the top of the screen. */
    const watch = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: '120px' },
    );
    watch.observe(stage);

    card.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      stop();
      watch.disconnect();
      card.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div ref={stageRef} className="lanyard" aria-label="At a glance">
      {/*
        The geometry below is the at-rest pose, written out so the webbing is
        drawn with JavaScript off. The solver overwrites all of it — including
        the viewBox, once the stage can actually be measured — on its first
        frame.
      */}
      <svg
        ref={svgRef}
        className="lanyard__cord"
        viewBox="0 0 380 700"
        width="380"
        height="700"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <path ref={spineRef} id="lanyard-spine" d="M 190 -46 L 190 208" fill="none" />
        </defs>

        <path
          ref={tapeRef}
          className="lanyard__tape"
          d="M 181.5 -46 L 183.4 208 L 196.6 208 L 198.5 -46 Z"
        />

        <text className="lanyard__print">
          <textPath href="#lanyard-spine" startOffset="4">
            {TAPE_TEXT}
          </textPath>
        </text>

        {/* The swivel hook the card actually hangs from. */}
        <g ref={clipRef} className="lanyard__clip" transform="translate(190 178)">
          <rect x="-7" y="-2" width="14" height="9" rx="2" />
          <path d="M 0 6 C -8 10, -8 21, 0 24 C 8 21, 8 10, 0 6 Z" />
          <path d="M -3 22 L -3 28 L 3 28 L 3 22" />
        </g>
      </svg>

      <div ref={cardRef} className="lanyard__card">
        <span className="lanyard__slot" aria-hidden="true" />

        {/* Set down the edge, as on the badges Chrys sent through. */}
        <span className="lanyard__spine-mark" aria-hidden="true">
          {site.name.toUpperCase()}
        </span>

        <div className="lanyard__body">
          <div className="lanyard__id">
            <div className="lanyard__photo">
              {site.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.portrait} alt={site.fullName} />
              ) : (
                <span className="lanyard__monogram" aria-hidden="true">
                  {initials}
                </span>
              )}
            </div>
            <div>
              <p className="lanyard__name">{site.fullName}</p>
              <p className="lanyard__role">{site.role}</p>
            </div>
          </div>

          <dl className="lanyard__list">
            <div>
              <dt>Based</dt>
              <dd>{site.location}</dd>
            </div>
            <div>
              <dt>Experience</dt>
              <dd>{site.yearsExperience} years</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{languages.join(', ')}</dd>
            </div>
          </dl>

          <p className="lanyard__foot">{site.links.github.replace('https://', '')}</p>
        </div>
      </div>
    </div>
  );
}
