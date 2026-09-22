/**
 * The mark on a screenshot that may be shown but not shown freely.
 *
 * Four of six client projects are under NDA, and the admin can now hold their
 * screenshots — `docs/08-BACKEND.md` §4, as amended. What makes that safe is
 * that the restriction travels with the file: the API sends `nda` per image and
 * this is what the site does about it.
 *
 * It was a tiled "under nda · under nda" watermark laid across the picture at
 * an angle. Chrys asked for a corner ribbon instead, on 2026-09-22, and the
 * ribbon is the better instrument: the tiling had to be dense enough to leave
 * nowhere unmarked, which meant it was also dense enough to be the first thing
 * you saw, and it still did nothing to stop a reader from reading the numbers
 * on the dashboard underneath. The ribbon states the restriction once, in the
 * corner, and the blur on the image — see `.nda` in globals.css — is what
 * actually protects the contents. The band takes the selected accent,
 * deepened for contrast against its white label; `--color-nda` says why.
 *
 * Drawn here rather than burned into the file on upload, for two reasons. A
 * composited file can never be un-marked when a clearance finally arrives, and
 * a mark in CSS stays legible against a dark screenshot and a light one
 * without the backend having to know which it has. Same reason the blur is a
 * filter and not a second, pre-blurred derivative in the media library.
 *
 * `aria-hidden`: three letters in a corner are a visual shorthand, and every
 * caller states the same fact in words where a screen reader will reach it —
 * the thumbnail's own label, the lightbox's `Under NDA`.
 */
export function NdaWatermark() {
  return (
    <span className="nda" aria-hidden="true">
      <span className="nda__ribbon">NDA</span>
    </span>
  );
}
