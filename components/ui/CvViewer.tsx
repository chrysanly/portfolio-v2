'use client';

import { useEffect, useState } from 'react';
import { clampZoom, cvEmbedUrl, cvPageImage, MAX_PAGES, ZOOM_STEP } from '@/lib/cv';

/** At or under this width the PDF is shown as page images, not embedded. */
const PHONE_QUERY = '(max-width: 760px)';
/** An embed that has not loaded by now is treated as failed. */
const EMBED_TIMEOUT_MS = 12_000;

type Mode = 'pending' | 'embed' | 'pages' | 'fallback';

/**
 * The uploaded CV itself, never a re-typeset copy. Desktop embeds the PDF;
 * a phone gets Cloudinary page images; when neither works, Open and Download.
 */
export function CvViewer({ url, fileName }: { url: string; fileName: string }) {
  const [mode, setMode] = useState<Mode>('pending');
  const [zoom, setZoom] = useState(100);
  const [loaded, setLoaded] = useState(false);
  // Pages requested so far; `settled` once one fails to load past the first.
  const [pages, setPages] = useState(1);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const phone = window.matchMedia(PHONE_QUERY).matches;
    if (!phone) return setMode('embed');
    setMode(cvPageImage(url, 1) ? 'pages' : 'fallback');
  }, [url]);

  useEffect(() => {
    if (mode !== 'embed' || loaded) return;
    const id = window.setTimeout(() => setMode('fallback'), EMBED_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [mode, loaded]);

  const onPageLoad = (page: number) => {
    if (page === 1) setLoaded(true);
    if (page === pages && page < MAX_PAGES) setPages(page + 1);
    if (page === MAX_PAGES) setSettled(true);
  };

  const onPageError = (page: number) => {
    if (page === 1) return setMode('fallback');
    setPages(page - 1);
    setSettled(true);
  };

  const count =
    mode === 'pages' && settled ? `${pages} ${pages === 1 ? 'page' : 'pages'}` : 'PDF';

  if (mode === 'fallback') return <CvFallback url={url} fileName={fileName} />;

  return (
    <div className="cv-viewer">
      <div className="cv-viewer__bar">
        <span className="cv-viewer__name">
          {fileName} · {count}
        </span>
        <div className="cv-viewer__zoom" role="group" aria-label="Zoom">
          <button
            type="button"
            className="cv-icon-btn"
            aria-label="Zoom out"
            disabled={zoom <= 60}
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
          >
            −
          </button>
          <output className="cv-viewer__pct" aria-live="polite">
            {zoom}%
          </output>
          <button
            type="button"
            className="cv-icon-btn"
            aria-label="Zoom in"
            disabled={zoom >= 160}
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
          >
            +
          </button>
        </div>
      </div>

      <div className="cv-viewer__gutter" data-loaded={loaded ? '' : undefined}>
        {!loaded ? <div className="cv-viewer__skeleton" aria-hidden="true" /> : null}

        {mode === 'embed' ? (
          <iframe
            // Remounted per zoom: a PDF viewer reads its fragment only on load.
            key={zoom}
            className="cv-viewer__embed"
            src={cvEmbedUrl(url, zoom)}
            title={`CV: ${fileName}`}
            onLoad={() => setLoaded(true)}
          />
        ) : null}

        {mode === 'pages' ? (
          <div className="cv-viewer__pages" style={{ ['--zoom' as string]: zoom / 100 }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
              // Cloudinary renders each page on request; next/image adds nothing here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={page}
                className="cv-page"
                src={cvPageImage(url, page) ?? undefined}
                alt={`CV page ${page}`}
                width={900}
                height={1273}
                style={{ ['--i' as string]: page - 1 }}
                onLoad={() => onPageLoad(page)}
                onError={() => onPageError(page)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CvFallback({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="cv-state" role="status">
      <p className="cv-state__title">The preview can’t show here.</p>
      <p className="cv-state__body">Open the PDF in a new tab, or download it.</p>
      <div className="cv-state__actions">
        <a className="button" href={url} target="_blank" rel="noopener noreferrer">
          Open PDF
        </a>
        <a className="button button--cv" href={url} download={fileName}>
          Download PDF
        </a>
      </div>
    </div>
  );
}
