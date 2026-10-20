/**
 * The showcase rig draws only the devices a project has uploads for
 * (WorkShowcase v2). lib/devices.ts is run in tests/devices.test.ts; the
 * wiring and the CSS are checked here at the source.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const showcase = read('components/work/WorkShowcase.tsx');
const css = read('app/globals.css');

test("a screen shows only its own device's shots, never a borrowed one", () => {
  assert.match(showcase, /projects\.map\(\(p\) => shotsFor\(p\.images\.filter\(\(img\) => !isStandIn\(img\.src\)\), device\)\)/);
  assert.doesNotMatch(showcase, /deviceCycle|data-foreign/);
  assert.doesNotMatch(css, /data-foreign/);
});

test('the devices are set when the current project changes, not per frame', () => {
  const change = showcase.slice(showcase.indexOf('if (now !== current.current)'), showcase.indexOf('const bar = barRefs'));
  assert.match(change, /showDevices\(/);
  assert.match(showcase, /data-devices=\{devicesAttr\(initial\)\}/);
});

test('a missing device is marked off, hidden from AT, and its button is inert', () => {
  assert.match(showcase, /shell\.toggleAttribute\('data-off', off\);/);
  assert.match(showcase, /shell\.setAttribute\('aria-hidden', String\(off\)\);/);
  // The click target and, on a slideshow, its buttons and dots.
  assert.match(showcase, /shell\.querySelectorAll<HTMLElement>\('\.rig__hit'\)/);
  assert.match(showcase, /control\.inert = off;/);
});

test('an off shell fades and shrinks out with opacity and scale only', () => {
  assert.match(css, /\.rig \[data-off\] \{\s*--off-s: 0\.92;\s*opacity: 0;\s*visibility: hidden;/);
  assert.match(css, /scale: calc\(var\(--s, 1\) \* var\(--off-s, 1\)\);/);
});

test('every set of devices has an arrangement', () => {
  for (const set of ['laptop mobile', 'laptop tablet', 'mobile tablet', 'laptop', 'tablet', 'mobile']) {
    assert.ok(css.includes(`.rig[data-devices='${set}']`), `no arrangement for "${set}"`);
  }
});

test('a lone device gets half the parallax', () => {
  for (const shell of ['laptop', 'tablet', 'phone']) {
    const device = shell === 'phone' ? 'mobile' : shell;
    const rule = css.slice(css.indexOf(`.rig[data-devices='${device}'] .rig__${shell} {`));
    assert.match(rule.slice(0, rule.indexOf('}')), /--sk: 0\.5;/);
  }
});

test('no images: the empty plate shows and the rig does not tilt', () => {
  assert.match(showcase, /<div className="rig__empty" aria-hidden="true">/);
  assert.match(showcase, /<b>Screens coming soon<\/b>/);
  assert.match(showcase, /<small>No shots uploaded yet<\/small>/);
  assert.match(css, /\.rig\[data-devices=''\] \{\s*transform: none;/);
  assert.match(css, /\.rig\[data-devices=''\] \.rig__empty \{\s*opacity: 1;/);
  assert.match(css, /\.rig__empty \{[^}]*border: 1px dashed var\(--color-rule\);/);
});

test('reduced motion keeps the arrangement and swaps instantly', () => {
  assert.match(css, /translate: var\(--x, 0%\) var\(--y, 0%\);\s*transform: none;\s*transition: opacity 1ms;/);
});
