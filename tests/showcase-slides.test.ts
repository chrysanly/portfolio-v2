/**
 * Slideshows in the showcase rig and the gallery lightbox (WorkShowcase v3),
 * and the NDA blur's removal, checked at the source. lib/devices.ts's slide
 * helpers are run in tests/devices.test.ts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const showcase = read('components/work/WorkShowcase.tsx');
const gallery = read('components/work/EvidenceGallery.tsx');
const css = read('app/globals.css');
const rules = read('CLAUDE.md');

test('no NDA media is blurred anywhere, and the ribbon still renders', () => {
  for (const [name, src] of [['showcase', showcase], ['gallery', gallery], ['css', css]] as const) {
    assert.doesNotMatch(src, /nda-media|--nda-blur/, name);
  }
  assert.match(showcase, /<NdaWatermark \/>/);
  assert.equal(gallery.match(/<NdaWatermark \/>/g)?.length, 3);
});

test('CLAUDE.md rule 3: the owner blurs before upload; the site draws only the ribbon', () => {
  assert.match(rules, /The owner blurs NDA\s+files before upload/);
  assert.match(rules, /the site draws only the ribbon/);
  assert.doesNotMatch(rules, /plus a blur on the picture/);
});

test('every shot is stacked and only the one at `on` is shown', () => {
  assert.match(showcase, /'data-on': j === on \? '' : undefined,/);
  assert.match(css, /\.shot__media \{[^}]*opacity: 0;\s*transition: opacity 320ms ease;/);
  assert.match(css, /\.shot__media\[data-on\] \{\s*opacity: 1;/);
});

test('autoplay is one timer per shell, held by hover, focus, a hidden tab, off-screen and reduced motion', () => {
  assert.match(showcase, /const playing = shouldAutoplay\(\{ count, held, hidden: !running, inView: running, reduced \}\);/);
  assert.match(showcase, /const timer = window\.setTimeout\(\(\) => go\(1\), SLIDE_MS\);/);
  assert.match(showcase, /onPointerEnter=\{\(\) => setHeld\(true\)\}/);
  assert.match(showcase, /onFocus=\{\(\) => setHeld\(true\)\}/);
  assert.match(showcase, /document\.addEventListener\('visibilitychange', onVisibility\);/);
  assert.match(showcase, /new IntersectionObserver\(\(\[entry\]\) => setInView\(entry\.isIntersecting\), \{\s*threshold: 0\.4,/);
});

test('the slide resets to the first when the project changes', () => {
  assert.match(showcase, /const index = slide\.project === active \? slide\.i : 0;/);
  assert.match(showcase, /rigActive\.current\?\.\(now\);/);
});

test('the gallery lightbox has dots and no autoplay', () => {
  assert.match(gallery, /<div className="lightbox__dots">/);
  assert.match(gallery, /aria-current=\{j === open \? 'true' : undefined\}/);
  assert.doesNotMatch(gallery, /SLIDE_MS|setInterval/);
});
