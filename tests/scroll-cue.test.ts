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
const read = (file: string) =>
  readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

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

test('fine pointers get a 22×34 mouse with a 3×6 wheel dot, labelled "Scroll to begin"', () => {
  assert.match(hero, /className="cue-mouse"/);
  assert.match(hero, /viewBox="0 0 22 34"/);
  assert.match(hero, /className="cue-wheel" x="9\.5" y="7" width="3" height="6"/);
  assert.match(hero, /Scroll to begin/);
  assert.match(
    rule('.cue-mouse svg'),
    /width: 22px;\s*height: 34px;\s*color: var\(--color-ink\)/,
  );
});

test('the wheel dot is the accent colour', () => {
  assert.match(rule('.cue-wheel'), /fill: var\(--color-accent\)/);
});

test('a narrow window with a mouse hides the cue; touch keeps it', () => {
  assert.match(
    css,
    /@media \(max-width: 859px\) and \(pointer: fine\) \{\s*\.hero__cue \{\s*display: none;/,
  );
});

test('the old full-width band is gone', () => {
  assert.doesNotMatch(css, /\.hero__cue[^{]*\{[^}]*border-(top|bottom)/);
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

test('the wheel loops in 1.8s, the chevrons in 1.6s, on transform and opacity only', () => {
  assert.match(rule('.cue-wheel'), /animation: cue-wheel 1800ms/);
  assert.match(rule('.cue-chev'), /animation: cue-chev 1600ms/);
  assert.match(rule('.cue-chev--2'), /animation-delay: 200ms/);
  for (const name of ['cue-wheel', 'cue-chev']) {
    const props = [...keyframes(name).matchAll(/^\s*([a-z-]+): /gm)].map((m) => m[1]);
    assert.ok(props.length > 0);
    for (const p of props)
      assert.ok(p === 'transform' || p === 'opacity', `${name} animates ${p}`);
  }
});

test('the wheel dot slides 10px down', () => {
  assert.match(keyframes('cue-wheel'), /translateY\(10px\)/);
});

test('once faded on first scroll, the loop stops', () => {
  assert.match(hero, /toggleAttribute\('data-gone', gone\)/);
  assert.match(
    css,
    /\.hero__cue\[data-gone\] \.cue-wheel,\s*\.hero__cue\[data-gone\] \.cue-chev \{\s*animation: none;/,
  );
});

test('reduced motion shows the cue static and visible', () => {
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.cue-wheel,\s*\.cue-chev \{\s*animation: none;\s*opacity: 1;\s*transform: none;/,
  );
});

test('the cue clears the home bar', () => {
  assert.match(
    rule('.hero__cue'),
    /bottom: calc\(20px \+ env\(safe-area-inset-bottom, 0px\)\)/,
  );
});

test('the page scrollbar is hidden on html, which is the scroller', () => {
  assert.match(css, /\n  html \{[^}]*scrollbar-width: none;/);
  assert.match(css, /html::-webkit-scrollbar \{\s*display: none;/);
});

test('the photo lightbox reserves no scrollbar gutter', () => {
  const lightbox = read('components/hero/PhotoLightbox.tsx');
  assert.doesNotMatch(lightbox, /scrollbarGutter|paddingRight/);
  assert.match(lightbox, /html\.style\.overflow = 'hidden'/);
});

test('the hero ledger has no inner scroller', () => {
  const facts = [...css.matchAll(/\n\s*\.facts \{([^}]*)\}/g)].map((m) => m[1]).join('');
  assert.doesNotMatch(facts, /overflow-y|max-height/);
});

test('short laptops get the ledger three wide: two rows of three', () => {
  assert.match(
    css,
    /@media \(max-height: 800px\) and \(min-width: 1024px\) \{\s*\.facts \{\s*grid-template-columns: repeat\(3, 1fr\);/,
  );
});

test('the cue is a centred box that shrinks to fit, not a full-width strip', () => {
  const cue = rule('.hero__cue');
  assert.match(cue, /left: 50%;/);
  assert.match(cue, /translate: -50% 0;/);
  assert.match(cue, /width: max-content;/);
  assert.doesNotMatch(cue, /right: 0;/);
});

test('the stage centres safely and clips sideways only, so CHRYS is never cut at the top', () => {
  assert.match(
    hero,
    /className="sticky top-0 h-svh flex flex-col justify-center-safe pt-\[clamp\(8px,3svh,32px\)\] overflow-x-clip"/,
  );
  assert.doesNotMatch(hero, /className="sticky[^"]*overflow-hidden/);
});

test('laptops up to 780px tall drop the hero notes so the buttons fit', () => {
  assert.match(
    css,
    /@media \(min-width: 1024px\) and \(max-height: 780px\) \{\s*\.intro__note \{\s*display: none;/,
  );
});

test('the case device rig is capped to the window, no column scroll', () => {
  assert.match(
    rule('.showcase__figure'),
    /max-height: calc\(100dvh - var\(--header-h\) - 120px\)/,
  );
});
