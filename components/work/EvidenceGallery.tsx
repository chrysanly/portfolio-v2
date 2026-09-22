'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
 * controls, it is never autoplayed with sound, and moving to the next item
 * stops whatever was playing.
 */
export function EvidenceGallery({ items }: { items: Item[] }) {
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
                    <video src={item.src} muted playsInline preload="metadata" />
                    <span className="evidence__play" aria-hidden="true" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.src} alt="" loading="lazy" decoding="async" />
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
              <span className="lightbox__media">
                {/*
                 * The inner box shrinks to the picture, and the mark goes
                 * inside it. `.lightbox__media` fills the figure's row, so a
                 * corner mark placed on it lands on the corner of the *row* —
                 * measured 451px clear of a portrait phone screenshot,
                 * floating in the empty space beside it. An inline-block
                 * shrink-wraps to the image's used size, after `max-height`
                 * has had its say, which is the one box that is always exactly
                 * the picture.
                 */}
                <span className="lightbox__shot" style={shotRatio(current)}>
                  {mediaKind(current) === 'video' ? (
                    <video
                      // Keyed on src so moving between videos remounts the element
                      // rather than leaving the previous one playing underneath.
                      key={current.src}
                      src={current.src}
                      controls
                      autoPlay
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.src} alt={current.alt} />
                  )}

                  {current.nda ? <NdaWatermark /> : null}
                </span>
              </span>

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
