/**
 * The theme tide, checked at the source: node:test cannot load JSX, and the
 * rules below are what Chrys asked for (one wave crest washing the screen).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

const toggle = read('components/ui/ThemeToggle.tsx');
const css = read('app/globals.css');

test('the swap runs as a view transition revealing the new snapshot', () => {
  assert.match(toggle, /const vt = start\.call\(document, apply\)/);
  assert.match(toggle, /pseudoElement: '::view-transition-new\(root\)'/);
  assert.match(toggle, /RIPPLE_MS = 560/);
  assert.match(toggle, /RIPPLE_EASE = 'cubic-bezier\(0\.32, 0\.72, 0, 1\)'/);
});

test('the ripple edge is a wavy polygon with the same point count in every frame', () => {
  assert.match(toggle, /POINTS = 72/);
  assert.match(toggle, /for \(let i = 0; i < POINTS; i\+\+\)/);
  assert.match(toggle, /clipPath: `polygon\(\$\{pts\.join\(','\)\}\)`/);
  assert.match(toggle, /LOBES = 6/);
});

test('the wave decays to a clean circle, from the toggle size to past the farthest corner', () => {
  assert.match(toggle, /const a = AMP \* Math\.pow\(1 - t, 1\.6\)/);
  assert.match(toggle, /AMP = 0\.06/);
  assert.match(toggle, /R0 = 22/);
  assert.match(toggle, /const base = R0 \+ \(R - R0\) \* t/);
  assert.match(toggle, /Math\.hypot\(Math\.max\(x, innerWidth - x\), Math\.max\(y, innerHeight - y\)\) \* OVERSHOOT/);
  assert.match(toggle, /OVERSHOOT = 1\.08/);
});

test('the frames are built before the capture, not inside ready', () => {
  const build = toggle.indexOf('rippleFrames(origin.x');
  const capture = toggle.indexOf('start.call(document, apply)');
  assert.ok(build > 0 && capture > build);
});

test('a keyboard press starts the ripple from the button centre', () => {
  assert.match(toggle, /if \(e\.detail !== 0\) return \{ x: e\.clientX, y: e\.clientY \}/);
  assert.match(toggle, /r\.left \+ r\.width \/ 2/);
});

test('reduced motion fades only the new snapshot in, 180ms', () => {
  assert.match(toggle, /const frames = reduce \? null : rippleFrames/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{\s*::view-transition-new\(root\) \{\s*animation: theme-in 180ms cubic-bezier\(0\.32, 0\.72, 0, 1\) both;/,
  );
  assert.doesNotMatch(css, /::view-transition-old\(root\) \{\s*animation: theme-in/);
});

test('the snapshots stack with no default crossfade', () => {
  const rule = css.match(/::view-transition-old\(root\),\s*::view-transition-new\(root\) \{([^}]*)\}/);
  assert.ok(rule);
  assert.match(rule[1], /animation: none/);
  assert.match(rule[1], /mix-blend-mode: normal/);
  assert.match(css, /::view-transition-new\(root\) \{\s*z-index: 2;/);
});

test('without View Transitions the tide runs instead', () => {
  assert.match(toggle, /start \? runRipple\(start, apply, origin, reduce\) : runTide\(target, apply, reduce\)/);
});

test('the fallback crest sheet in the target ground washes down the screen', () => {
  assert.match(toggle, /tide\.dataset\.to = target/);
  assert.match(toggle, /transform: \['translateY\(-100%\)', 'translateY\(0\)'\]/);
  assert.match(toggle, /WASH_MS = 640/);
  assert.match(toggle, /SINE_IN_OUT = 'cubic-bezier\(0\.37, 0, 0\.63, 1\)'/);
  assert.match(css, /\.tide\[data-to='dark'\] \{\s*--tide-ground: #14130f;/);
  assert.match(css, /\.tide\[data-to='light'\] \{\s*--tide-ground: #f7f6f2;/);
});

test('the crest is a wave that rolls while it falls', () => {
  assert.match(toggle, /CREST_PATH = 'M0 0V24Q150 72 300 24T600 24/);
  assert.match(toggle, /transform: \['translateX\(0\)', 'translateX\(-50%\)'\]/);
  assert.match(css, /\.tide__crest \{[^}]*width: 200%;/);
});

test('the theme swaps only under full cover, then the sheet dissolves', () => {
  const wash = toggle.indexOf("'translateY(0)'] },");
  const swap = toggle.indexOf('apply();', wash);
  const dissolve = toggle.indexOf('opacity: [1, 0], transform', wash);
  assert.ok(wash > 0 && swap > wash && dissolve > swap);
});

test('reduced motion fades the same sheet for 360ms, never an instant swap', () => {
  assert.match(toggle, /FADE_MS = 180/);
  assert.match(toggle, /if \(reduce\) \{[\s\S]*?opacity: \[0, 1\][\s\S]*?apply\(\);[\s\S]*?opacity: \[1, 0\]/);
});

test('without WAAPI the swap is instant', () => {
  assert.match(toggle, /if \(typeof document\.body\.animate !== 'function'\) \{\s*apply\(\);\s*return;/);
});

test('a press mid-tide is ignored and marked busy', () => {
  assert.match(toggle, /if \(running\.current\) return;/);
  assert.match(toggle, /aria-busy=\{busy \|\| undefined\}/);
});

test('the sheet is cleaned up: animations cancelled, removed, swap flag cleared', () => {
  assert.match(toggle, /finally \{\s*tide\.getAnimations\(\{ subtree: true \}\)\.forEach\(\(a\) => a\.cancel\(\)\);\s*tide\.remove\(\);\s*delete root\.dataset\.themeSwap;/);
});

test('the sheet sits above the page, takes no clicks and is hidden from readers', () => {
  assert.match(css, /\.tide \{[^}]*position: fixed;[^}]*z-index: 1000;[^}]*pointer-events: none;/);
  assert.match(toggle, /tide\.setAttribute\('aria-hidden', 'true'\)/);
});

test('page colour transitions are off while the tide runs', () => {
  assert.match(css, /:root\[data-theme-swap\] \*,[\s\S]*?\{\s*transition: none !important;/);
});

test('the transition kill is set for the whole view transition', () => {
  assert.match(toggle, /root\.dataset\.themeSwap = '';\s*\n\s*try \{\s*const vt/);
  assert.match(toggle, /await vt\.finished\.catch\(\(\) => \{\}\);\s*\} finally \{\s*delete root\.dataset\.themeSwap;/);
});

test('the toggle has a focus ring and a press state', () => {
  assert.match(css, /\.theme-toggle:focus-visible \{\s*outline: 2px solid var\(--color-accent\);\s*outline-offset: 3px;/);
  assert.match(css, /\.theme-toggle:active \.theme-toggle__glyphs \{\s*transform: scale\(0\.88\);/);
});

test('the toggle is not hidden before the hero hands over', () => {
  const hide = css.match(/((?:\[data-motion='on'\]:has\(\.hero\) [^,{]+,?\s*)+)\{\s*opacity: 0;/);
  assert.ok(hide, 'pre-handoff hide rule exists');
  assert.match(hide[1], /\.logo/);
  assert.doesNotMatch(hide[1], /theme-toggle|site-header__end/);
});
