/**
 * The CV modal (approved HeroActions v1): the trigger, the dialog and its CSS
 * are checked at the source, since node:test cannot render them. The browser
 * check is e2e/cv-modal.spec.ts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const actions = read('components/ui/HeroActions.tsx');
const modal = read('components/ui/CvModal.tsx');
const css = read('app/cv-modal.css');
const layout = read('app/layout.tsx');

test('the trigger keeps href="/cv" for no-JS and opens the modal on a plain left click', () => {
  assert.match(actions, /className="button button--cv"\s+href="\/cv"/);
  assert.match(actions, /aria-haspopup="dialog"/);
  assert.match(actions, /if \(event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey \|\| event\.button !== 0\) return;\s*event\.preventDefault\(\);/);
  assert.match(actions, /<CvModal/);
});

test('opening the modal does not raise the route veil', () => {
  assert.match(actions, /data-no-veil=""/);
  assert.match(read('components/ui/RouteVeil.tsx'), /if \(anchor\.hasAttribute\('data-no-veil'\)\) return;/);
});

test('the dialog is labelled, modal, and shows the PDF in an iframe', () => {
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-labelledby=\{titleId\}/);
  assert.match(modal, /<iframe[\s\S]*?src=\{cvEmbedUrl\(url, 100\)\}/);
});

test('it has Download, Open in new tab and Close', () => {
  assert.match(modal, /download=\{cvFileName\(url\)\}/);
  assert.match(modal, /target="_blank"\s+rel="noopener noreferrer"/);
  assert.match(modal, /aria-label="Close CV"/);
});

test('Esc, the scrim and Close all close it', () => {
  assert.match(modal, /if \(e\.key === 'Escape'\)/);
  assert.match(modal, /className="cvm__scrim"[^>]*onClick=\{close\}/);
  assert.match(modal, /className="cvm__btn cvm__close"[\s\S]*?onClick=\{close\}/);
});

test('focus goes to Close, is trapped, and returns to the trigger', () => {
  assert.match(modal, /closeRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(modal, /if \(e\.key !== 'Tab'/);
  assert.match(modal, /opener\?\.focus\(\{ preventScroll: true \}\)/);
});

test('the page behind is locked while it is open', () => {
  assert.match(modal, /html\.style\.overflow = 'hidden'/);
  assert.match(modal, /html\.style\.overflow = before\.overflow/);
});

test('loading, then ready on load, or an error after 8s', () => {
  assert.match(modal, /const LOAD_TIMEOUT_MS = 8000;/);
  assert.match(modal, /Loading the CV…/);
  assert.match(modal, /The preview didn’t load\./);
  assert.match(modal, /onLoad=\{\(\) => setState\('ready'\)\}/);
});

test('motion: 280ms panel, 220ms scrim, opacity-only 150ms under reduced motion', () => {
  assert.match(css, /\.cvm__panel \{[^}]*transform: translateY\(16px\) scale\(0\.985\);/);
  assert.match(css, /transform 280ms cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.match(css, /\.cvm__scrim \{[^}]*transition: opacity 220ms ease;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.cvm__panel \{\s*transform: none !important;\s*transition: opacity 150ms linear;/);
  assert.match(css, /\.cvm__sheet::after \{\s*animation: none;/);
});

test('a full-screen sheet on phones with 44px icon buttons', () => {
  assert.match(css, /@media \(max-width: 599px\) \{[\s\S]*?height: 100dvh;[\s\S]*?border-radius: 0;/);
  assert.match(css, /env\(safe-area-inset-top\)/);
});

test('colours come from the site tokens, so the light theme follows', () => {
  const rules = css.replace(/--cvm-[\w-]+:[^;]+;/g, '');
  assert.doesNotMatch(rules, /#[0-9a-f]{3,6}\b|rgba?\(/i);
});

test('the stylesheet is loaded by the layout', () => {
  assert.match(layout, /import '\.\/cv-modal\.css';/);
});

test('header buttons: hover turns the label to the strong ink as the border goes accent', () => {
  assert.match(css, /\.cvm__btn:hover \{\s*border-color: var\(--color-accent\);\s*color: var\(--cvm-ink-strong\);/);
  assert.match(css, /\.cvm__btn \{[^}]*transition:\s*border-color 160ms ease,\s*color 160ms ease,\s*transform 160ms ease;/);
});

test('the strong ink is white in dark and black in light, so the hover reads on both', () => {
  assert.match(css, /\.cvm \{[^}]*--cvm-ink-strong: #000;/);
  assert.match(css, /:root\[data-theme='dark'\] \.cvm \{\s*--cvm-ink-strong: #fff;/);
});
