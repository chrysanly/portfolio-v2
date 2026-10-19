/**
 * Pure helpers for the CV: its label, file name, the embed URL at a zoom, and
 * Cloudinary page images for phones. No imports, so node:test loads it as is.
 */

export const DEFAULT_CV_NAME = 'CJ_Roma_Resume_ATS.pdf';
export const ZOOM_MIN = 60;
export const ZOOM_MAX = 160;
export const ZOOM_STEP = 10;
/** Pages tried before the phone preview stops asking for more. */
export const MAX_PAGES = 12;

/** "September 2026" from whatever shape the backend sent. */
export function updatedLabel(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** The uploaded file's own name, or the default when the URL has none. */
export function cvFileName(url: string): string {
  let last = '';
  try {
    last = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
  } catch {
    return DEFAULT_CV_NAME;
  }
  return /\.pdf$/i.test(last) ? last : DEFAULT_CV_NAME;
}

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom)));
}

/** Fit to width at 100%, a fixed zoom otherwise; the viewer's toolbar is off. */
export function cvEmbedUrl(url: string, zoom: number): string {
  const base = url.split('#')[0];
  const z = clampZoom(zoom);
  return z === 100 ? `${base}#view=FitH&toolbar=0` : `${base}#zoom=${z}&toolbar=0`;
}

/**
 * Page `page` of a PDF as a 900px WebP, through Cloudinary's `pg_N`
 * (the approved design's `pg_N,f_webp,w_900`, with the format set by extension). Only an
 * `image/upload` PDF can be rendered that way; a `raw` upload, or a file on
 * any other host, returns null and the phone shows the fallback instead.
 */
export function cvPageImage(url: string, page: number): string | null {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return null;
  if (!/\.pdf(\?|#|$)/i.test(url) || page < 1) return null;
  // The extension sets the delivered format, so .pdf becomes .webp.
  return url
    .split(/[?#]/)[0]
    .replace('/image/upload/', `/image/upload/pg_${Math.floor(page)},w_900/`)
    .replace(/\.pdf$/i, '.webp');
}
