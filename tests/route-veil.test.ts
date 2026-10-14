/**
 * The route veil's hand-over, checked at the source: node:test cannot load
 * JSX, and the rules below are what the approved mockup fixes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

const css = read('app/globals.css');
const loading = read('app/work/[slug]/loading.tsx');
const veil = read('components/ui/RouteVeil.tsx');

/** The declarations of the first rule whose selector list contains `selector`. */
function rule(source: string, selector: string, from = 0): string {
  const at = source.indexOf(selector, from);
  assert.notEqual(at, -1, `no rule for ${selector}`);
  const open = source.indexOf('{', at);
  return source.slice(open + 1, source.indexOf('}', open));
}

const reducedMotion = css.slice(css.indexOf('Under reduced motion the letters'));

test('the loading screen shows the splash mark and line, not a blank ground', () => {
  assert.match(loading, /className="route-hold" data-route-loading/);
  assert.match(loading, /className="veil__inner" aria-hidden="true"/);
  assert.match(loading, /className="veil__mark"/);
  assert.match(loading, /'CHRYS'\.split\(''\)/);
  assert.match(loading, /className="veil__bar"/);
});

test('the loading screen centres the mark', () => {
  const hold = rule(css, '.route-hold {');
  assert.match(hold, /display: grid;/);
  assert.match(hold, /place-items: center;/);
});

test('the loading screen animates its letters and line like the veil', () => {
  assert.match(css, /\.route-hold \.veil__mark span \{\s*animation: veil-letter/);
  assert.match(css, /\.route-hold \.veil__bar i \{\s*animation: veil-bar/);
});

test('under reduced motion the line is full and dimmed, not half', () => {
  const bar = rule(reducedMotion, '.route-hold .veil__bar i');
  assert.match(bar, /transform: scaleX\(1\);/);
  assert.match(bar, /opacity: 0\.5;/);
  assert.doesNotMatch(reducedMotion.slice(0, 600), /scaleX\(0\.5\)/);
});

test('the error block sits up under the dimmed mark', () => {
  const error = rule(css, '.veil__error {');
  assert.match(error, /gap: 14px;/);
  assert.match(error, /margin-top: -6px;/);
});

test('the veil lifts only after the 160ms fill, 0 under reduced motion', () => {
  assert.match(veil, /const FILL_MS = 160;/);
  assert.match(veil, /prefers-reduced-motion: reduce\)'\)\.matches \? 0 : FILL_MS/);
  // The lift is a tracked timer, so clearTimers() still cancels it.
  assert.match(
    veil,
    /timers\.current\.push\(\s*window\.setTimeout\(\(\) => \{\s*visibleRef\.current = false;[\s\S]*?\}, fillMs\(\)\)/,
  );
});
