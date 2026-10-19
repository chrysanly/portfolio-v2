/**
 * The header's How? button and its dialog, checked at the source: node:test
 * cannot load JSX, and the rules below are what the approved design fixes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

const button = read('components/ui/HowItWorksButton.tsx');
const note = read('components/ui/ArchitectureNote.tsx');
const header = read('components/ui/SiteHeader.tsx');
const home = read('app/page.tsx');
const about = read('app/about/page.tsx');
const css = read('app/how-it-works.css');
const globals = read('app/globals.css');

test('the header shows How? just before the theme toggle, on every route', () => {
  assert.match(header, /<HowItWorksButton \/>\s*<ThemeToggle \/>/);
  // One header for every route: rendered outside the minimal/nav branch.
  assert.ok(header.indexOf('<HowItWorksButton />') > header.indexOf('</nav>'));
});

test('How? is never hidden by the home hero hand-off', () => {
  const hide = globals.match(
    /((?:\[data-motion='on'\]:has\(\.hero\) [^,{]+,?\s*)+)\{\s*opacity: 0;/,
  );
  assert.ok(hide, 'pre-handoff hide rule exists');
  assert.doesNotMatch(hide[1], /how-btn|site-header__end/);
});

test('the button names the dialog it opens', () => {
  assert.match(button, /aria-haspopup="dialog"/);
  assert.match(button, /aria-expanded=\{mounted\}/);
  assert.match(button, /aria-controls=\{dialogId\}/);
  assert.match(button, /How\?/);
});

test('the dialog is modal, labelled by its heading and portalled to body', () => {
  assert.match(button, /role="dialog"\s*aria-modal="true"\s*aria-labelledby=\{titleId\}/);
  assert.match(button, /<ArchitectureNote headingId=\{titleId\} \/>/);
  assert.match(button, /createPortal\(/);
  assert.match(button, /document\.body,\s*\)/);
});

test('focus starts on Close, is trapped, and returns to How?', () => {
  assert.match(button, /closeRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(button, /if \(e\.key !== 'Tab' \|\| !panelRef\.current\) return;/);
  assert.match(button, /opener\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(button, /opener=\{buttonRef\.current\}/);
});

test('Escape and the scrim close it', () => {
  assert.match(button, /if \(e\.key === 'Escape'\) \{[\s\S]*?close\(\);/);
  assert.match(button, /className="hiw-scrim"[^>]*onClick=\{close\}/);
});

test('the page behind does not scroll while it is open', () => {
  assert.match(button, /html\.style\.overflow = 'hidden'/);
  assert.match(button, /html\.style\.overflow = before\.overflow/);
});

test('the dialog sits above the journey stage and the header', () => {
  assert.match(css, /\.hiw-scrim \{[^}]*z-index: 70;/);
  assert.match(css, /\.hiw-dialog \{[^}]*z-index: 71;/);
});

test('on a phone it is a bottom sheet; reduced motion is opacity only', () => {
  const phone = css.slice(css.indexOf('@media (max-width: 767px)'));
  assert.match(phone, /\.hiw-dialog \{[^}]*bottom: 0;[^}]*max-height: 88dvh;/);
  const reduce = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(
    reduce,
    /\.hiw-dialog\[data-open\] \{\s*transform: none;\s*transition: opacity 200ms linear;/,
  );
  assert.match(reduce, /\.how-btn:active \.how-btn__pill \{\s*transform: none;/);
});

test('the pill has hover, open, press and focus states', () => {
  assert.match(
    css,
    /\.how-btn:hover \.how-btn__pill \{\s*color: var\(--color-ink\);\s*border-color: var\(--color-accent\);/,
  );
  assert.match(
    css,
    /\.how-btn\[aria-expanded='true'\] \.how-btn__pill \{[^}]*border-color: var\(--color-ink\);/,
  );
  assert.match(css, /\.how-btn:active \.how-btn__pill \{\s*transform: scale\(0\.95\);/);
  assert.match(
    css,
    /\.how-btn:focus-visible \.how-btn__pill \{\s*outline: 2px solid var\(--color-accent\);\s*outline-offset: 3px;/,
  );
});

test('in the dialog the rail draws on a timer, once per open', () => {
  assert.match(
    note,
    /animate\(progress, 1, \{\s*duration: DRAW_S,\s*delay: DRAW_DELAY_S,\s*ease: EASE_OUT_CUBIC,?\s*\}\)/,
  );
  assert.match(note, /DRAW_S = 0\.9/);
  assert.match(note, /DRAW_DELAY_S = 0\.12/);
});

test('the note is dialog-only: no scroll-linked section variants left', () => {
  assert.doesNotMatch(note, /variant|useScroll|useSpring|arch--detail/);
});

test('the heading id is unique per instance, not hard-coded', () => {
  assert.doesNotMatch(note, /"arch-heading"/);
  assert.match(note, /const titleId = headingId \?\? ownId;/);
});

test('neither home nor /about renders the How this works section', () => {
  assert.doesNotMatch(home, /ArchitectureNote/);
  assert.doesNotMatch(about, /ArchitectureNote/);
});

test('the header keeps its How? button', () => {
  assert.match(header, /<HowItWorksButton \/>/);
});

test('the /about-only section styles are gone', () => {
  assert.doesNotMatch(css, /\.arch--detail/);
});
