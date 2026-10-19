/**
 * The opening hold once per session, and the route veil only when a page is
 * slow — checked at the source: node:test cannot load JSX.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const layout = read('app/layout.tsx');
const dismiss = read('components/ui/SplashDismiss.tsx');
const veil = read('components/ui/RouteVeil.tsx');
const css = read('app/globals.css');

test('the head script skips the hold when this session has seen it', () => {
  assert.match(
    layout,
    /try\{if\(sessionStorage\.getItem\('splash-seen'\)\)\{d\.splash='seen';d\.ready='true'\}\}catch\(e\)\{\}/,
  );
});

test('the head script reads the same key SplashDismiss writes', () => {
  assert.match(dismiss, /export const SPLASH_KEY = 'splash-seen';/);
  assert.match(dismiss, /sessionStorage\.setItem\(SPLASH_KEY, '1'\)/);
});

test('the key is written only once the first hold has cleared', () => {
  assert.match(dismiss, /root\.dataset\.ready = 'true';\s*rememberSplash\(\);/);
});

test('a seen session is ready at once, so nothing waits on a hold', () => {
  assert.match(dismiss, /if \(root\.dataset\.splash === 'seen'\) \{[\s\S]*?root\.dataset\.ready = 'true';/);
});

test('the seen hold is never drawn', () => {
  assert.match(css, /:root\[data-splash='seen'\] \.splash \{\s*display: none;\s*\}/);
});

test('blocked storage never breaks the page', () => {
  assert.match(dismiss, /try \{\s*sessionStorage\.setItem/);
  assert.match(layout, /try\{if\(sessionStorage/);
});

test('a navigation only draws the veil after 250ms', () => {
  assert.match(veil, /const SHOW_DELAY_MS = 250;/);
  assert.match(veil, /show\(url\.pathname \+ url\.search, anchor\.dataset\.veilTitle \?\? '', SHOW_DELAY_MS\)/);
  assert.match(veil, /show\(null, '', SHOW_DELAY_MS\)/);
  assert.match(veil, /if \(delay > 0\) timers\.current\.push\(window\.setTimeout\(paint, delay\)\);/);
});

test('a page that arrives within the delay never shows the veil', () => {
  assert.match(veil, /if \(!paintedRef\.current\) \{\s*visibleRef\.current = false;\s*target\.current = null;\s*return;/);
});

test("the form's submit still veils at once", () => {
  assert.match(veil, /const onFormShow = \(\) => show\(\);/);
});
