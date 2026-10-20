/**
 * The work showcase's motion (approved WorkShowcase v1), checked at the
 * source: the paint pass is JSX and the states are CSS. The browser check is
 * e2e/showcase.spec.ts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const showcase = read('components/work/WorkShowcase.tsx');
const css = read('app/globals.css');

test('the current chapter bar fills with scaleX, never below 0.04', () => {
  assert.match(showcase, /bar\.style\.transform = `scaleX\(\$\{Math\.max\(0\.04, clamp\(f - now\)\)\.toFixed\(4\)\}\)`/);
  assert.match(css, /\.chapter__bar i \{[^}]*transform: scaleX\(0\);\s*transform-origin: left;/);
});

test('bars passed stay full at 0.45; a bar ahead previews at 0.35 on hover', () => {
  assert.match(css, /\.chapter\[data-state='past'\] \.chapter__bar i \{\s*transform: scaleX\(1\);\s*opacity: 0\.45;/);
  assert.match(css, /\.chapter\[data-state='ahead'\]:hover \.chapter__bar i \{\s*transform: scaleX\(1\);\s*opacity: 0\.35;/);
});

test('one paint pass: bars, parallax and shots are all written from paint()', () => {
  assert.match(showcase, /paintIndex\(f\);\s*paintRig\(p\);/);
  assert.equal(showcase.match(/useMotionValueEvent\(/g)?.length, 1);
  assert.doesNotMatch(showcase.slice(showcase.indexOf('const paintRig'), showcase.indexOf('const jumpTo')), /getBoundingClientRect|offsetHeight/);
});

test('scroll parallax rides on transform with the approved depths', () => {
  // --sk halves the depth for a lone device (lib/devices, WorkShowcase v2).
  assert.match(css, /transform: translate3d\(0, calc\(var\(--sy, 0\) \* var\(--sdepth\) \* var\(--sk, 1\)\), 0\);/);
  assert.match(css, /--depth: 4px;\s*--sdepth: 10px;/);
  assert.match(css, /\.rig__tablet \{\s*--depth: 9px;\s*--sdepth: -18px;/);
  assert.match(css, /\.rig__phone \{\s*--depth: 14px;\s*--sdepth: 26px;/);
});

test('the incoming shot scales from 1.03 to 1', () => {
  assert.match(showcase, /const SHOT_IN_SCALE = 0\.03;/);
  assert.match(showcase, /shot\.style\.transform = `scale\(\$\{\(1 \+ SHOT_IN_SCALE \* \(1 - enter\)\)\.toFixed\(4\)\}\)`/);
});

test('chips and the CTA lift on hover, the CTA presses in and has a focus ring', () => {
  assert.match(css, /\.ptext \.chips li:hover \{\s*transform: translateY\(-2px\);\s*border-color: var\(--color-accent\);\s*color: var\(--color-ink\);/);
  assert.match(css, /\.panel__button:hover \{\s*transform: translateY\(-2px\);/);
  assert.match(css, /\.panel__button:hover svg \{\s*transform: translateX\(4px\);/);
  assert.match(css, /\.panel__button:active \{\s*transform: scale\(0\.97\);/);
  assert.match(css, /\.panel__button:focus-visible \{\s*outline: 2px solid var\(--color-accent\);\s*outline-offset: 3px;/);
});

test('the hint nudges three times, not forever', () => {
  assert.match(css, /animation: cue-bounce 1600ms cubic-bezier\(0\.45, 0, 0\.55, 1\) 3;/);
  assert.doesNotMatch(css, /cue-bounce[^;]*infinite/);
});

test('on a phone the numbers stay, the titles go, and the CTA is full width', () => {
  assert.match(showcase, /<span className="chapter__title">\{project\.title\}<\/span>/);
  assert.match(css, /\.chapter__title \{\s*display: none;/);
  assert.match(css, /\.story__cta \.panel__button \{\s*width: 100%;\s*min-height: 44px;/);
});

test('reduced motion drops the parallax, scale and lift but keeps colour', () => {
  assert.match(css, /\.shot \{\s*transform: none !important;/);
  assert.match(css, /transition-property: color, border-color, opacity;/);
});

test('the NDA ribbon stays and the blur is gone (CLAUDE.md rule 3)', () => {
  assert.doesNotMatch(showcase, /nda-media/);
  assert.doesNotMatch(css, /filter: blur\(var\(--nda-blur/);
  assert.match(showcase, /\{shots\[on\]\?\.nda \? <NdaWatermark \/> : null\}/);
});

/* ----- the slideshow: no on-screen controls (owner, 2026-10-20) ---------- */

const slideshow = css.slice(css.indexOf('   * Slideshow (WorkShowcase v3)'), css.indexOf('  .rig__body:has(~ .rig__hit:active) {'));

test('no slideshow strip: no prev/next, segments or count in the shell or the CSS', () => {
  assert.doesNotMatch(showcase, /rig__ctl|rig__nav|rig__count|rig__dots|Chevron|data-pill/);
  assert.doesNotMatch(css, /rig__ctl|rig__nav|rig__count|rig-fill|data-pill/);
});

test('the lightbox keeps its dots: 36×44 targets around 28×4 bars, the current one in accent', () => {
  assert.match(slideshow, /\.rig__dot \{[^}]*width: 36px;\s*height: 44px;/);
  assert.match(slideshow, /\.rig__dot b \{[^}]*width: 28px;\s*height: 4px;[^}]*background: var\(--color-muted\);\s*opacity: 0\.55;/);
  assert.match(slideshow, /\.rig__dot\[aria-current\] b \{\s*opacity: 1;\s*background: var\(--color-accent\);/);
  assert.match(slideshow, /\.rig__dot:focus-visible b \{\s*outline: 2px solid var\(--color-accent\);/);
});

test('swipe on the device keeps vertical scroll; tap and arrow keys step the slides', () => {
  assert.match(slideshow, /\.rig__hit \{\s*touch-action: pan-y;/);
  assert.match(showcase, /const SWIPE_PX = 40;/);
  assert.match(showcase, /if \(event\.key === 'ArrowRight'\) go\(1\);\s*else if \(event\.key === 'ArrowLeft'\) go\(-1\);/);
  assert.match(showcase, /if \(event\.detail === 0\) go\(1\);/);
});

test('autoplay still holds on hover, focus, a hidden tab, off screen and reduced motion', () => {
  assert.match(showcase, /shouldAutoplay\(\{ count, held, hidden: !running, inView: running, reduced \}\)/);
  assert.match(showcase, /onPointerEnter=\{\(\) => setHeld\(true\)\}/);
  assert.match(showcase, /onFocus=\{\(\) => setHeld\(true\)\}/);
});

test('reduced motion: the crossfade swaps instantly', () => {
  const reduce = slideshow.slice(slideshow.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reduce, /\.shot__media,\s*\.rig__dot b \{\s*transition: none;/);
});
