/**
 * The showcase rig's interaction: lib/rig.ts is run; the JSX and CSS are
 * checked at the source, since node:test cannot render them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) =>
  readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const { deviceCycle, pickFor, tiltFor, MAX_TILT } = (await import(
  new URL('../lib/rig.ts', import.meta.url).href
)) as typeof import('../lib/rig');

const showcase = read('components/work/WorkShowcase.tsx');
const css = read('app/globals.css');

const shots = [
  { id: 'l1', device: 'laptop' },
  { id: 't1', device: 'tablet' },
  { id: 'l2', device: 'laptop' },
  { id: 'm1', device: 'mobile' },
];

test("a device cycles its own shots first, then the project's others", () => {
  assert.deepEqual(
    deviceCycle(shots, 'laptop').map((s) => s.id),
    ['l1', 'l2', 't1', 'm1'],
  );
  assert.deepEqual(
    deviceCycle(shots, 'mobile').map((s) => s.id),
    ['m1', 'l1', 't1', 'l2'],
  );
});

test('a project with no shots cycles nothing', () => {
  assert.deepEqual(deviceCycle([], 'laptop'), []);
});

test('the pick wraps per project and stays 0 with one shot or none', () => {
  assert.equal(pickFor(0, 4), 0);
  assert.equal(pickFor(5, 4), 1);
  assert.equal(pickFor(3, 1), 0);
  assert.equal(pickFor(3, 0), 0);
});

test('the rig leans toward the pointer, at most MAX_TILT at the edge', () => {
  const box = { left: 0, top: 0, width: 200, height: 100 };
  assert.deepEqual(tiltFor({ x: 100, y: 50 }, box), { x: 0, y: 0, rotateX: -0, rotateY: 0 });
  const corner = tiltFor({ x: 200, y: 0 }, box);
  assert.equal(corner.rotateY, MAX_TILT);
  assert.equal(corner.rotateX, MAX_TILT);
  assert.equal(tiltFor({ x: 900, y: 50 }, box).rotateY, MAX_TILT, 'clamped past the edge');
});

test('an empty box gives no tilt', () => {
  assert.deepEqual(tiltFor({ x: 5, y: 5 }, { left: 0, top: 0, width: 0, height: 0 }), {
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
  });
});

test('each device is a button that cycles its screen', () => {
  assert.match(showcase, /className="rig__hit"/);
  assert.match(showcase, /aria-label=\{`Show the next screenshot on the \$\{label\}`\}/);
  assert.match(
    showcase,
    /setPicks\(\(was\) => \(\{ \.\.\.was, \[device\]: was\[device\] \+ 1 \}\)\)/,
  );
});

test('touch skips the tilt; the tap still cycles', () => {
  assert.match(showcase, /if \(event\.pointerType === 'touch'\) return;/);
  assert.match(showcase, /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/);
});

test('NDA shots keep the blur and the ribbon', () => {
  assert.match(showcase, /const media = usable\?\.nda \? 'nda-media' : undefined;/);
  assert.match(showcase, /\{usable\?\.nda \? <NdaWatermark \/> : null\}/);
});

test('motion is transform/translate only and off under reduced motion', () => {
  assert.match(css, /transition: transform 300ms cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);/);
  assert.match(css, /transition: translate 300ms/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.rig \{\s*transform: none;\s*transition: none;/,
  );
});

test('a focused device shows a visible ring', () => {
  assert.match(css, /\.rig__hit:focus-visible \{\s*outline: 2px solid var\(--color-accent\);/);
});
