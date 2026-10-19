/**
 * The header row fits every width, checked at the source: node:test cannot
 * load JSX. The browser check (scrollWidth === innerWidth, 320-1440) is in
 * the handoff, not here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const header = read('components/ui/SiteHeader.tsx');
const how = read('components/ui/HowItWorksButton.tsx');
const css = read('app/how-it-works.css');
const narrow = css.slice(css.indexOf('@media (max-width: 479px)'));

test('"Send a message" keeps its full name and has a short label', () => {
  assert.match(header, /className="header-cta" aria-label="Send a message"/);
  assert.match(header, /<span className="cta__long">Send a message<\/span>/);
  assert.match(header, /<span className="cta__short" aria-hidden="true">\s*Message\s*<\/span>/);
});

test('below 480px only "Message" shows', () => {
  assert.match(css, /\.cta__short \{\s*display: none;\s*\}/);
  assert.match(narrow, /\.cta__long \{\s*display: none;\s*\}/);
  assert.match(narrow, /\.cta__short \{\s*display: inline;\s*\}/);
});

test('How? keeps its full name and shows only the "?" below 480px', () => {
  assert.match(how, /aria-label="How\? How this site works"/);
  assert.match(how, /<span className="how-btn__text">How\?<\/span>/);
  assert.match(narrow, /\.how-btn__text \{[^}]*position: absolute;[^}]*clip-path: inset\(50%\);/);
});

test('the toggle drops its word below 768px; its name is in aria-label', () => {
  assert.match(css, /@media \(max-width: 767px\) \{[\s\S]*?\.theme-toggle__text \{\s*display: none;/);
  assert.match(read('components/ui/ThemeToggle.tsx'), /aria-label=\{`\$\{label\} theme`\}/);
});

test('every header target stays 44px on a phone', () => {
  assert.match(narrow, /\.header-cta \{[^}]*min-height: 44px;/);
  assert.match(narrow, /\.how-btn \{\s*min-width: 44px;/);
  assert.match(css, /\.how-btn \{[^}]*min-height: 44px;/);
});

test('at 360px and below the nav routes fit: tighter inset, smaller logo and nav words', () => {
  const tiny = css.slice(css.indexOf('@media (max-width: 360px)'));
  assert.match(tiny, /\.site-header__inner \{\s*gap: 4px;\s*padding-inline: 10px;/);
  assert.match(tiny, /\.logo \{\s*font-size: 17px;/);
  assert.match(tiny, /\.site-nav \{\s*gap: 0;/);
});

test('the CV button wraps its stamp on a phone instead of being clipped', () => {
  const globals = read('app/globals.css');
  assert.match(globals, /\.hero-actions \.button--cv \{\s*flex-wrap: wrap;\s*max-width: 100%;/);
  assert.match(globals, /\.hero-actions \.button--cv \.hero-actions__stamp \{\s*flex-basis: 100%;/);
});

test('no blanket overflow-x hiding', () => {
  for (const file of ['app/globals.css', 'app/how-it-works.css', 'app/journey.css']) {
    assert.doesNotMatch(read(file), /(html|body)\s*\{[^}]*overflow-x:\s*hidden/);
  }
});
