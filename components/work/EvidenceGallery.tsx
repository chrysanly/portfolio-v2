'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { DEVICE_SIZES, mediaKind, type ProjectFrontmatter } from '@/lib/schema';
import { NdaWatermark } from './NdaWatermark';

type Item = ProjectFrontmatter['images'][number];

/**
 * The picture's aspect ratio, for the box that wraps it in the lightbox.
 *
 * The box has to be exactly the picture — that is what puts the NDA ribbon on
 * the photograph's corner rather than out in the empty space beside a portrait
 * phone screenshot. Sizing it by ratio against the row's height is the only
 * way that holds: a shrink-wrapping box has an auto height, and `max-height:
 * 100%` on the image inside it then resolves against nothing and is dropped,
 * which cropped 124px off the bottom of an 844px-tall shot.
 *
 * Falls back to DEVICE_SIZES exactly as the showcase rig does, so an image
 * that arrives without intrinsic dimensions still gets the right shape.
 */
function shotRatio(item: Item): React.CSSProperties {
  const fallback = DEVICE_SIZES[item.device];
  const width = item.width ?? fallback.width;
  const height = item.height ?? fallback.height;
  return { '--shot-ratio': `${width} / ${height}` } as React.CSSProperties;
}

/** `m:ss`, for the clip's time readout. */
function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * An NDA video in the lightbox: the blurred clip, with its controls in a row
 * underneath.
 *
 * The blur sits on the <video> element, and native controls are drawn
 * *inside* that element, so they would be blurred with it. These controls are
 * ordinary elements below the picture instead: play/pause, a seek range, the
 * time, and a mute toggle — the clip starts muted so it may autoplay, and the
 * toggle is how its sound comes back.
 *
 * Autoplay only when the visitor has not asked for reduced motion.
 */
function NdaVideo({ item, autoPlay }: { item: Item; autoPlay: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const video = () => videoRef.current;

  const toggle = () => {
    const el = video();
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const retry = () => {
    setState('loading');
    setAttempt((n) => n + 1);
  };

  const disabled = state !== 'ready';

  return (
    <span className="lightbox__media lightbox__media--video">
      <span className="lightbox__shot" style={shotRatio(item)}>
        <video
          key={attempt}
          ref={videoRef}
          src={item.src}
          autoPlay={autoPlay}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setState('ready');
          }}
          onError={() => setState('error')}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        />
        <NdaWatermark />
      </span>

      {state === 'error' ? (
        <span className="vctl vctl--error" role="alert">
          This clip didn&rsquo;t load.
          <button type="button" className="vctl__retry" onClick={retry}>
            Try again
          </button>
        </span>
      ) : (
        <span className="vctl" data-disabled={disabled || undefined}>
          <button
            type="button"
            className="vctl__btn"
            onClick={toggle}
            disabled={disabled}
            aria-label="Play video"
            aria-pressed={playing}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {playing ? (
                <path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" strokeWidth="2.2" />
              ) : (
                <path d="M8 5l11 7-11 7z" fill="currentColor" />
              )}
            </svg>
          </button>

          <input
            type="range"
            className="vctl__seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            disabled={disabled}
            aria-label="Seek"
            aria-valuetext={`${clock(time)} of ${clock(duration)}`}
            onChange={(e) => {
              const el = video();
              if (el) el.currentTime = Number(e.currentTarget.value);
            }}
          />

          <span className="vctl__time" aria-hidden="true">
            {clock(time)} / {clock(duration)}
          </span>

          <button
            type="button"
            className="vctl__btn"
            onClick={() => {
              const el = video();
              if (el) el.muted = !el.muted;
            }}
            disabled={disabled}
            aria-label="Mute"
            aria-pressed={muted}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
              {muted ? (
                <path
                  d="m16 9 5 6m0-6-5 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              ) : (
                <path
                  d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              )}
            </svg>
          </button>

          {state === 'loading' ? (
            <span className="vctl__status" role="status">
              <span className="vctl__spinner" aria-hidden="true" />
              Loading clip…
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}

/**
 * Evidence, as a contact sheet rather than a column of full-bleed images.
 *
 * Stacked at full width, four screenshots pushed everything below them off
 * the page and gave a reader no way to see the set at a glance. Thumbnails
 * show the whole set at once; the one you want opens over the page at the
 * size it deserves.
 *
 * Built by hand rather than with a lightbox package — docs/02-TRD.md §1
 * allows no new dependencies, and what is actually needed here is one
 * dialog, two arrows and a keyboard handler.
 *
 * Video is a first-class case, not an image with a different tag: it gets
 * controls, it is never autoplayed with sound or under reduced motion, and
 * moving to the next item stops whatever was playing.
 *
 * An `nda` item gets the corner ribbon only: the owner blurs NDA files
 * before upload (CLAUDE.md rule 3).
 */
export function EvidenceGallery({ items }: { items: Item[] }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // Portals need a DOM, so the dialog cannot exist during the server render.
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(null), []);

  const step = useCallback(
    (delta: number) =>
      setOpen((current) => {
        if (current === null) return current;
        // Wraps, because a gallery that dead-ends at the last item makes you
        // walk all the way back to see the first one again.
        return (current + delta + items.length) % items.length;
      }),
    [items.length],
  );

  useEffect(() => {
    if (open === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };

    document.addEventListener('keydown', onKey);

    // The page behind must not scroll while a full-screen dialog is over it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close, step]);

  // Focus moves into the dialog on open and back to the thumbnail on close —
  // without this, closing drops the keyboard at the top of the document.
  useEffect(() => {
    if (open !== null) {
      returnTo.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    } else {
      returnTo.current?.focus?.();
    }
  }, [open]);

  if (items.length === 0) return null;

  const current = open === null ? null : items[open];

  return (
    <>
      <ul className="evidence">
        {items.map((item, i) => {
          const kind = mediaKind(item);

          return (
            <li key={item.src}>
              <button
                type="button"
                className="evidence__thumb"
                onClick={() => setOpen(i)}
                // The restriction is part of what this thumbnail is, so it is
                // in the label rather than only in the watermark — which is
                // decorative repetition and hidden from assistive tech.
                aria-label={item.nda ? `Open (under NDA): ${item.alt}` : `Open: ${item.alt}`}
                aria-haspopup="dialog"
              >
                {kind === 'video' ? (
                  <>
                    {/* A muted first frame is the honest thumbnail for a
                        video: any still we invented would be a guess. */}
                    <video
                      src={item.src}
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="evidence__play" aria-hidden="true" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {item.nda ? <NdaWatermark /> : null}
                <span className="evidence__device">{item.device}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/*
       * Portalled to <body>, and this is not a nicety: rendered where it
       * sits in the page, the dialog is inside the article's stacking
       * context, and the sticky site header — a higher context — lands on
       * top of it. The close button was underneath the header and could not
       * be clicked at all, while the backdrop and Escape still worked, which
       * is exactly the kind of half-broken that is hard to spot.
       */}
      {mounted &&
        current &&
        createPortal(
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={current.alt}
            tabIndex={-1}
            ref={dialogRef}
            // A click on the backdrop closes; a click on the media does not.
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div className="lightbox__bar">
              <p className="lightbox__count">
                {(open ?? 0) + 1} / {items.length}
              </p>
              {/* Where you are among the shots (.rig__dot in globals.css); a click jumps there, never autoplayed. */}
              {items.length > 1 ? (
                <div className="lightbox__dots">
                  {items.map((item, j) => (
                    <button
                      key={`${item.src}-${j}`}
                      type="button"
                      className="rig__dot"
                      aria-label={`Screen ${j + 1} of ${items.length}`}
                      aria-current={j === open ? 'true' : undefined}
                      onClick={() => setOpen(j)}
                    >
                      <b />
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" onClick={close} aria-label="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </button>
            </div>

            <figure className="lightbox__figure">
              {/*
               * The media gets its own box so the watermark can sit over it
               * without covering the caption — the figure is a two-row grid and
               * an overlay on the figure would cross both rows.
               */}
              {current.nda && mediaKind(current) === 'video' ? (
                // Keyed on src so moving between videos remounts the player
                // rather than leaving the previous one playing underneath.
                <NdaVideo key={current.src} item={current} autoPlay={!reduced} />
              ) : (
                <span className="lightbox__media">
                  {/*
                   * The inner box shrinks to the picture, and the mark goes
                   * inside it, so the ribbon sits on the picture's corner
                   * rather than the row's — see shotRatio().
                   */}
                  <span className="lightbox__shot" style={shotRatio(current)}>
                    {mediaKind(current) === 'video' ? (
                      <video
                        key={current.src}
                        src={current.src}
                        controls
                        autoPlay={!reduced}
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={current.src}
                        alt={current.alt}
                      />
                    )}

                    {current.nda ? <NdaWatermark /> : null}
                  </span>
                </span>
              )}

              <figcaption>
                {current.nda ? <b className="lightbox__nda">Under NDA</b> : null}
                {current.caption ?? current.alt}
              </figcaption>
            </figure>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox__step lightbox__step--prev"
                  onClick={() => step(-1)}
                  aria-label="Previous"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M15 4 7 12l8 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="lightbox__step lightbox__step--next"
                  onClick={() => step(1)}
                  aria-label="Next"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="m9 4 8 8-8 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
