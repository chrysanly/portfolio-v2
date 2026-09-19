'use client';

import { useEffect, useRef } from 'react';
import { languages, site } from '@/content/site';

/**
 * The identity badge, hung from a lanyard.
 *
 * It behaves like the real thing: a pendulum swinging from the clip, with a
 * separate twist about its vertical axis so it turns as it settles rather than
 * just rocking flat. Scrolling nudges it, and it can be grabbed and thrown.
 *
 * Two independent springs drive it — `swing` (z) and `twist` (y) — because a
 * badge on a lanyard does not rotate about a single axis, and coupling them to
 * one value makes the motion read as a flag rather than a card.
 *
 * Under reduced motion nothing animates and the badge simply hangs straight;
 * it is still readable, and the content is plain text either way.
 */
/**
 * Initials stand in for the portrait until one is supplied: first and last
 * name, the way an ID would carry them, not the first two given names.
 */
const nameParts = site.fullName.split(' ').filter(Boolean);
const initials = `${nameParts[0]?.[0] ?? ''}${nameParts[nameParts.length - 1]?.[0] ?? ''}`;

export function IdCard() {
  const pivotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const strapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const pivot = pivotRef.current;
    const strap = strapRef.current;
    if (!card || !pivot) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let swing = 0; // degrees about z
    let swingVel = 0;
    let twist = 0; // degrees about y
    let twistVel = 0;
    let dragging = false;
    let pointer = 0;
    let lastAngle = 0;
    let lastScroll = window.scrollY;
    let frame = 0;

    const SPRING = 0.014;
    const DAMP = 0.955;
    const TWIST_SPRING = 0.02;
    const TWIST_DAMP = 0.94;

    /*
     * A lanyard never hangs perfectly still. Two slow sines at unrelated
     * periods keep it drifting without ever repeating visibly, so the badge
     * stays alive after the physics has settled instead of freezing straight.
     * It is additive, so a drag still reads as a drag.
     */
    const started = performance.now();
    const idleSwing = (t: number) => Math.sin(t * 0.55) * 0.75 + Math.sin(t * 0.31) * 0.42;
    const idleTwist = (t: number) => Math.sin(t * 0.42 + 1.1) * 2.6 + Math.sin(t * 0.23) * 1.4;

    const pivotPoint = () => {
      const r = pivot.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top };
    };

    const angleTo = (x: number, y: number) => {
      const p = pivotPoint();
      return (Math.atan2(x - p.x, Math.max(y - p.y, 1)) * 180) / Math.PI;
    };

    const onDown = (event: PointerEvent) => {
      dragging = true;
      pointer = event.pointerId;
      card.setPointerCapture(pointer);
      card.dataset.held = 'true';
      lastAngle = angleTo(event.clientX, event.clientY);
      swingVel = 0;
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const next = angleTo(event.clientX, event.clientY);
      // Clamped so a fast drag cannot wind it round on itself.
      swing = Math.max(-64, Math.min(64, next));
      swingVel = swing - lastAngle;
      twistVel += (swing - lastAngle) * 0.22;
      lastAngle = swing;
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      delete card.dataset.held;
      try {
        card.releasePointerCapture(pointer);
      } catch {
        // The pointer may already be gone; nothing to release.
      }
    };

    const onScroll = () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      swingVel += Math.max(-1.1, Math.min(1.1, delta * 0.035));
      twistVel += Math.max(-0.9, Math.min(0.9, delta * 0.02));
    };

    const tick = () => {
      if (!dragging) {
        swingVel += -SPRING * swing;
        swingVel *= DAMP;
        swing += swingVel;
      }
      twistVel += -TWIST_SPRING * twist;
      twistVel *= TWIST_DAMP;
      twist += twistVel;
      twist = Math.max(-38, Math.min(38, twist));

      const t = (performance.now() - started) / 1000;
      const drift = dragging ? 0 : 1;
      const z = swing + idleSwing(t) * drift;
      const y = twist + idleTwist(t) * drift;

      card.style.transform = `rotate(${z.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`;
      if (strap) strap.style.transform = `rotate(${(z * 0.42).toFixed(2)}deg)`;
      frame = requestAnimationFrame(tick);
    };

    card.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      card.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="badge" aria-label="At a glance">
      <div ref={strapRef} className="badge__strap" aria-hidden="true">
        <span className="badge__tape badge__tape--l" />
        <span className="badge__tape badge__tape--r" />
        <span className="badge__ring" />
      </div>

      <div ref={pivotRef} className="badge__pivot" aria-hidden="true" />

      <div ref={cardRef} className="badge__card">
        <span className="badge__punch" aria-hidden="true" />

        <div className="badge__head">
          <span className="badge__wordmark">{site.name.toUpperCase()}</span>
          <span className="badge__issue">Dubai</span>
        </div>

        <div className="badge__id">
          <div className="badge__photo">
            {site.portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.portrait} alt={site.fullName} />
            ) : (
              <span className="badge__monogram" aria-hidden="true">
                {initials}
              </span>
            )}
          </div>
          <div className="badge__who">
            <p className="badge__name">{site.fullName}</p>
            <p className="badge__role">{site.role}</p>
          </div>
        </div>

        <dl className="badge__list">
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

        <p className="badge__foot">{site.links.github.replace('https://', '')}</p>
      </div>
    </div>
  );
}
