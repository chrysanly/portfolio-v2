/**
 * The /cv page. lib/cv.ts is imported and run; the JSX and CSS are checked at
 * the source, since node:test cannot render them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) =>
  readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const { clampZoom, cvEmbedUrl, cvFileName, cvPageImage, updatedLabel, DEFAULT_CV_NAME } =
  (await import(new URL('../lib/cv.ts', import.meta.url).href)) as typeof import('../lib/cv');

const hero = read('components/ui/HeroActions.tsx');
const page = read('app/cv/page.tsx');
const viewer = read('components/ui/CvViewer.tsx');
const css = read('app/cv/cv.css');

const RAW = 'https://res.cloudinary.com/demo/raw/upload/v1/cv/CJ_Roma_Resume_ATS.pdf';
const IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1/cv/CJ_Roma_Resume_ATS.pdf';

/* ----- lib/cv ------------------------------------------------------------- */

test('the file name is the uploaded one, or the default', () => {
  assert.equal(cvFileName(RAW), 'CJ_Roma_Resume_ATS.pdf');
  assert.equal(cvFileName('https://x.test/files/My%20CV.pdf'), 'My CV.pdf');
  assert.equal(cvFileName('https://x.test/cv'), DEFAULT_CV_NAME);
  assert.equal(cvFileName('not a url'), DEFAULT_CV_NAME);
});

test('zoom is clamped to 60–160%', () => {
  assert.equal(clampZoom(40), 60);
  assert.equal(clampZoom(200), 160);
  assert.equal(clampZoom(110), 110);
});

test('the embed fits the width at 100% and hides the PDF toolbar', () => {
  assert.equal(cvEmbedUrl(RAW, 100), `${RAW}#view=FitH&toolbar=0`);
  assert.equal(cvEmbedUrl(`${RAW}#page=2`, 120), `${RAW}#zoom=120&toolbar=0`);
});

test('an image-type Cloudinary PDF gives page N as a 900px WebP', () => {
  assert.equal(
    cvPageImage(IMAGE, 2),
    'https://res.cloudinary.com/demo/image/upload/pg_2,w_900/v1/cv/CJ_Roma_Resume_ATS.webp',
  );
});

test('a raw upload or another host has no page images', () => {
  assert.equal(cvPageImage(RAW, 1), null);
  assert.equal(cvPageImage('https://x.test/cv.pdf', 1), null);
  assert.equal(cvPageImage(IMAGE, 0), null);
});

test('the updated label is month and year, null when missing or bad', () => {
  assert.equal(updatedLabel('2026-10-19T08:00:00Z'), 'October 2026');
  assert.equal(updatedLabel(null), null);
  assert.equal(updatedLabel('nope'), null);
});

/* ----- hero button --------------------------------------------------------- */

test('the hero button reads View CV and goes to /cv', () => {
  assert.match(hero, /href="\/cv"/);
  assert.match(hero, />\s*View CV\s*</);
  assert.doesNotMatch(hero, /'Download CV'|>\s*Download CV\s*</);
});

/* ----- page ---------------------------------------------------------------- */

test('the page embeds the uploaded file and offers a download by its name', () => {
  assert.match(page, /<CvViewer url=\{cv\.url\} fileName=\{fileName\} \/>/);
  assert.match(page, /download=\{fileName\}/);
  assert.match(page, /target="_blank"\s*rel="noopener noreferrer"/);
});

test('with no CV the page shows an empty state, not a broken frame', () => {
  assert.match(page, /No CV here yet\./);
});

test('desktop embeds, a phone gets page images, failure gets the fallback', () => {
  assert.match(viewer, /<iframe/);
  assert.match(viewer, /setMode\(cvPageImage\(url, 1\) \? 'pages' : 'fallback'\)/);
  assert.match(viewer, /if \(page === 1\) return setMode\('fallback'\)/);
  assert.match(viewer, /setMode\('fallback'\), EMBED_TIMEOUT_MS/);
  assert.match(viewer, /Download PDF/);
});

test('pages fade and rise 8px over 350ms, staggered 80ms', () => {
  assert.match(
    css,
    /transform: translateY\(8px\);\s*animation: cv-page-in 350ms ease-out forwards;/,
  );
  assert.match(css, /animation-delay: calc\(var\(--i, 0\) \* 80ms\)/);
});

test('reduced motion: no page entrance and no transitions', () => {
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.cv-page,\s*\.cv-viewer__skeleton \{\s*animation: none;/,
  );
});

test('the gutter is the one scroll area, with a thin scrollbar', () => {
  assert.match(css, /\.cv-viewer__gutter \{[^}]*overflow: auto;[^}]*scrollbar-width: thin;/);
});

test('the page is the window under the header and the frame takes what the bar leaves', () => {
  assert.match(css, /\.cv \{[^}]*height: calc\(100dvh - var\(--header-h\)\);/);
  const frame = css.match(/\n  \.cv__frame \{([^}]*)\}/)?.[1] ?? '';
  assert.match(frame, /flex: 1;/);
  assert.match(frame, /min-height: 0;/);
  assert.doesNotMatch(frame, /\bheight: calc/);
});

test('on a phone the frame keeps a 60svh floor', () => {
  assert.match(
    css,
    /@media \(max-width: 760px\) \{[\s\S]*?\.cv__frame \{\s*min-height: 60svh;/,
  );
});
