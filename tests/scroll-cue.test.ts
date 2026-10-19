/**
 * The hero scroll cue, checked at the source: node:test cannot load JSX. It
 * shows the gesture (a mouse, or a swipe on touch), loops in 1.6s on
 * transform and opacity, holds still under reduced motion and stops once gone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const hero = read('components/hero/MastheadHero.tsx');
const css = read('app/globals.css');

/** The body of the first rule whose whole selector is `selector`. */
const rule = (selector: string) => {
  const escaped = selector.replace(/[.[\]-]/g, '\\$&');
  const at = css.search(new RegExp(`(?<!,)\\n  ${escaped} \\{`));
  assert.notEqual(at, -1, `${selector} rule exists`);
  return css.slice(at, css.indexOf('}', at));
};

const keyframes = (name: string) => {
  const at = css.indexOf(`@keyframes ${name}`);
  assert.notEqual(at, -1, `@keyframes ${name} exists`);
  return css.slice(at, css.indexOf('\n  }\n', at));
};

test('the old "Scroll ↓" text is gone', () => {
  assert.doesNotMatch(hero, />\s*Scroll\s*<svg/);
  assert.doesNotMatch(css, /cue-drift/);
});

test('fine pointers get an 18×28 mouse with a wheel dot, labelled "Scroll to begin"', () => {
  assert.match(hero, /className="cue-mouse"/);
  assert.match(hero, /viewBox="0 0 18 28"/);
  assert.match(hero, /className="cue-wheel"/);
  assert.match(hero, /Scroll to begin/);
});

test('coarse pointers get two up-chevrons, labelled "Swipe up to begin"', () => {
  assert.match(hero, /className="cue-touch"/);
  assert.match(hero, /className="cue-chev"/);
  assert.match(hero, /className="cue-chev cue-chev--2"/);
  assert.match(hero, /Swipe up to begin/);
});

test('the cue stays decorative to a screen reader', () => {
  assert.match(hero, /className="hero__cue" aria-hidden="true"/);
});

test('the pointer media query picks one cue per device', () => {
  assert.match(rule('.cue-touch'), /display: none/);
  assert.match(css, /@media \(pointer: coarse\) \{\s*\.cue-mouse \{\s*display: none;/);
});

test('both loops run 1.6s and animate only transform and opacity', () => {
  assert.match(rule('.cue-wheel'), /animation: cue-wheel 1600ms/);
  assert.match(rule('.cue-chev'), /animation: cue-chev 1600ms/);
  assert.match(rule('.cue-chev--2'), /animation-delay: 200ms/);
  for (const name of ['cue-wheel', 'cue-chev']) {
    const props = [...keyframes(name).matchAll(/^\s*([a-z-]+): /gm)].map((m) => m[1]);
    assert.ok(props.length > 0);
    for (const p of props) assert.ok(p === 'transform' || p === 'opacity', `${name} animates ${p}`);
  }
});

test('the wheel dot slides 7px down', () => {
  assert.match(keyframes('cue-wheel'), /translateY\(7px\)/);
});

test('once faded on first scroll, the loop stops', () => {
  assert.match(hero, /toggleAttribute\('data-gone', gone\)/);
  assert.match(css, /\.hero__cue\[data-gone\] \.cue-wheel,\s*\.hero__cue\[data-gone\] \.cue-chev \{\s*animation: none;/);
});

test('reduced motion shows the cue static and visible', () => {
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.cue-wheel,\s*\.cue-chev \{\s*animation: none;\s*opacity: 1;\s*transform: none;/,
  );
});

test('the cue clears the home bar', () => {
  assert.match(rule('.hero__cue'), /bottom: calc\(clamp\(14px, 4svh, 40px\) \+ env\(safe-area-inset-bottom, 0px\)\)/);
});
