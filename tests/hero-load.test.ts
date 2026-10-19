/**
 * The hero's first-load skeleton and the CHRYS pointer lean. lib/lean.ts is
 * run; the JSX and CSS are checked at the source, since node:test cannot
 * render them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) =>
  readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const lean = (await import(
  new URL('../lib/lean.ts', import.meta.url).href
)) as typeof import('../lib/lean');

const hero = read('components/hero/MastheadHero.tsx');
const css = read('app/globals.css');

const box = (left: number) => ({ left, top: 0, width: 100, height: 100 });
const boxes = [box(0), box(200), box(400), box(600), box(800)];

/* ----- timings ------------------------------------------------------------ */

test('grace 120ms, minimum 300ms, entrance 320 + 4 × 60 = 560ms', () => {
  assert.equal(lean.SKEL_GRACE_MS, 120);
  assert.equal(lean.SKEL_MIN_MS, 300);
  assert.equal(lean.ENTRANCE_TOTAL_MS, 560);
});

/* ----- lean maths ---------------------------------------------------------- */

test('no pointer: every letter rests, none is accented', () => {
  const t = lean.leanTargets(null, boxes);
  assert.ok(t.letters.every((l) => l.lift === 0 && l.tilt === 0));
  assert.equal(t.near, -1);
});

test('pointer dead centre on a letter: full lift, no tilt, accented', () => {
  const t = lean.leanTargets({ x: 250, y: 50 }, boxes);
  assert.equal(t.letters[1].lift, -lean.MAX_LIFT);
  assert.equal(t.letters[1].tilt, 0);
  assert.equal(t.near, 1);
});

test('letters out of reach do not move', () => {
  const t = lean.leanTargets({ x: 250, y: 50 }, boxes);
  assert.equal(t.letters[3].lift, 0);
  assert.equal(t.letters[4].tilt, 0);
});

test('tilt leans toward the pointer and never passes MAX_LEAN', () => {
  const right = lean.leanTargets({ x: 290, y: 50 }, boxes).letters[1];
  const left = lean.leanTargets({ x: 210, y: 50 }, boxes).letters[1];
  assert.ok(right.tilt > 0 && left.tilt < 0);
  for (let x = 0; x < 1000; x += 7) {
    for (const l of lean.leanTargets({ x, y: 50 }, boxes).letters) {
      assert.ok(Math.abs(l.tilt) <= lean.MAX_LEAN + 1e-9);
      assert.ok(l.lift <= 0 && l.lift >= -lean.MAX_LIFT);
    }
  }
});

test('a pointer between letters, far from both, accents none', () => {
  const t = lean.leanTargets({ x: 150, y: 260 }, boxes);
  assert.equal(t.near, -1);
});

/* ----- component ----------------------------------------------------------- */

test('the hero renders a skeleton: eyebrow, one block per letter, cue', () => {
  assert.match(hero, /className="hero-skel" aria-hidden="true"/);
  assert.match(hero, /className="sk sk-eyebrow"/);
  assert.match(hero, /<span key=\{i\} className="sk" \/>/);
  assert.match(hero, /className="sk sk-cue"/);
});

test('the section says it is busy while pending, and which phase it is in', () => {
  assert.match(hero, /data-load=\{load\}/);
  assert.match(hero, /aria-busy=\{load === 'pending'\}/);
});

test('under the grace the skeleton is skipped; once shown it holds SKEL_MIN_MS', () => {
  assert.match(hero, /const shown = visibleFor > 0;/);
  assert.match(hero, /Math\.max\(0, SKEL_MIN_MS - visibleFor\)/);
});

test('the lean writes only the inner glyph span, and only for a fine pointer at rest', () => {
  assert.match(hero, /el\.style\.setProperty\('--ly'/);
  assert.match(hero, /el\.style\.setProperty\('--lr'/);
  assert.match(hero, /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/);
  assert.match(hero, /lastP\.current < HOLD_END && window\.scrollY <= 4/);
  assert.match(hero, /if \(event\.pointerType === 'touch'\) return;/);
});

test('the masthead stays an img with its label', () => {
  assert.match(hero, /className="masthead" role="img" aria-label=\{profile\.name\}/);
});

/* ----- CSS ------------------------------------------------------------------ */

test('the skeleton appears after a 120ms grace and fades out over 250ms', () => {
  assert.match(css, /animation: hero-skel-in 1ms linear 120ms forwards;/);
  assert.match(css, /animation: hero-skel-out 250ms ease-out forwards;/);
});

test('letters rise 14px, 320ms each, 60ms apart', () => {
  assert.match(
    css,
    /\.hero\[data-load='pending'\] \.masthead span > span \{\s*opacity: 0;\s*transform: translate3d\(0, 14px, 0\);/,
  );
  assert.match(css, /opacity 320ms cubic-bezier\(0\.2, 0\.7, 0\.2, 1\)/);
  assert.match(css, /transition-delay: calc\(var\(--i, 0\) \* 60ms\);/);
});

test('the glyph moves by --ly / --lr only, from the baseline; accent on the nearest', () => {
  assert.match(
    css,
    /transform: translate3d\(0, var\(--ly, 0px\), 0\) rotate\(var\(--lr, 0deg\)\);/,
  );
  assert.match(css, /transform-origin: 50% 100%;/);
  assert.match(css, /\.masthead span > span\[data-near\] \{\s*color: var\(--color-accent\);/);
});

test('the old CSS hover lift is gone', () => {
  assert.doesNotMatch(css, /\.masthead:hover span > span/);
  assert.doesNotMatch(css, /\.masthead span:hover > span/);
});

test('reduced motion: a still skeleton and an instant reveal', () => {
  assert.match(css, /\.sk::after \{\s*display: none;\s*animation: none;/);
  assert.match(css, /\.hero-skel \{\s*animation: none;\s*opacity: 1;/);
  assert.match(css, /\.hero\[data-load='in'\] \.hero-skel \{\s*display: none;/);
});
