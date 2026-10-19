/**
 * The remote-work line, checked at the source: node:test cannot load JSX.
 * It appears once, in the contact band's closing strip, in the wording
 * recorded in docs/07-SOURCE-CONTENT.md §5.10.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

const HEAD = 'Working remotely with teams anywhere in the world';
const TERMS = 'Part-time or full-time, as we agree.';

const band = read('components/ui/ContactBand.tsx');
const timeline = read('components/work/ExperienceTimeline.tsx');
const docs = read('docs/07-SOURCE-CONTENT.md');
const css = read('app/contact-band.css');

const count = (text: string, needle: string) => text.split(needle).length - 1;

test('the contact band states the line once, in the new wording', () => {
  assert.equal(count(band, HEAD), 1);
  assert.equal(count(band, TERMS), 1);
});

test('the old wording is gone from the site', () => {
  for (const source of [band, timeline]) {
    assert.ok(!source.includes('Open to remote work worldwide'));
    assert.ok(!source.includes('by agreement'));
  }
});

test('the journey no longer ends with the line', () => {
  assert.ok(!/remote/i.test(timeline));
  assert.ok(!timeline.includes('Next chapter'));
});

test('docs/07 records the wording the band shows', () => {
  assert.ok(docs.includes(`> **${HEAD}**`));
  assert.ok(docs.includes(`> ${TERMS}`));
});

test('one closing strip: where and © sit inside it, no second footer', () => {
  assert.equal(count(band, '<footer className'), 1);
  assert.ok(!band.includes('contact-band__meta'));
  const strip = band.slice(band.indexOf('className="avail"'), band.indexOf('</footer>'));
  assert.ok(strip.includes('avail__where'));
  assert.ok(strip.includes('avail__copy'));
});

test('the strip hover card no longer waits on the hero gate', () => {
  assert.ok(!css.includes("data-gate='shut'"));
});
