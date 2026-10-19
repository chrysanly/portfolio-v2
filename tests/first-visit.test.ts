/**
 * First-visit tour and lag notice. The pure parts (frame median, card
 * placement) are imported and run; the JSX and CSS are checked at the source,
 * since node:test cannot render them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');

/*
 * Loaded by file URL with the extension, so the test runs under plain
 * `node --test` as well as `npm test` (whose setup.mjs adds the `@/` alias).
 * Both modules import nothing, so Node's own type stripping is enough.
 */
const lib = (file: string) => new URL(`../lib/${file}`, import.meta.url).href;
const { isSlow, median, SLOW_MS } = (await import(
  lib('frame-watch.ts')
)) as typeof import('../lib/frame-watch');
const { placeCard } = (await import(lib('tour.ts'))) as typeof import('../lib/tour');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const guide = read('components/ui/FirstVisitGuide.tsx');
const picker = read('components/ui/AccentPicker.tsx');
const texture = read('lib/texture.ts');
const layout = read('app/layout.tsx');
const page = read('app/page.tsx');
const css = read('app/guide.css');

const desktop = { width: 1440, height: 900 };
const phone = { width: 393, height: 852 };
const card = { width: 320, height: 200 };

/* ----- frame watch -------------------------------------------------------- */

test('median handles odd, even and empty samples', () => {
  assert.equal(median([30, 10, 20]), 20);
  assert.equal(median([10, 20, 30, 40]), 25);
  assert.equal(median([]), 0);
});

test('a median above 28ms reads as slow, one long frame does not', () => {
  assert.equal(SLOW_MS, 28);
  assert.equal(isSlow([33, 33, 34, 35, 16]), true);
  assert.equal(isSlow([16, 17, 16, 120, 16]), false);
  assert.equal(isSlow([28, 28, 28]), false);
});

test('hidden-tab gaps are ignored, not counted as slow frames', () => {
  assert.equal(isSlow([16, 16, 16, 900, 1200, 2000]), false);
});

/* ----- placement ---------------------------------------------------------- */

test('desktop: the card sits 24px above a "top" target, centred on it', () => {
  const at = placeCard({ left: 700, top: 800, right: 740, bottom: 860 }, 'top', card, desktop);
  assert.equal(at.y, 800 - 200 - 24);
  assert.equal(at.x, 720 - 160);
  assert.equal(at.fromY, 8);
});

test('desktop: a "left" card sits 16px left of the target and enters from it', () => {
  const at = placeCard({ left: 1300, top: 600, right: 1430, bottom: 890 }, 'left', card, desktop);
  assert.equal(at.x, 1300 - 320 - 16);
  assert.equal(at.fromX, 8);
});

test('desktop: a "bottom" card is right-aligned below and clamped 16px inside', () => {
  const at = placeCard({ left: 1360, top: 12, right: 1436, bottom: 44 }, 'bottom', card, desktop);
  assert.equal(at.y, 44 + 16);
  assert.equal(at.x, 1440 - 320 - 16);
  assert.equal(at.fromY, -8);
});

test('phone: docks to the top for a low target, the bottom for a high one', () => {
  const low = placeCard({ left: 150, top: 780, right: 240, bottom: 840 }, 'top', card, phone);
  assert.deepEqual([low.x, low.y], [16, 16]);
  const high = placeCard({ left: 300, top: 10, right: 380, bottom: 40 }, 'bottom', card, phone);
  assert.deepEqual([high.x, high.y], [16, 852 - 200 - 16]);
});

/* ----- texture ------------------------------------------------------------ */

test('texture on/off lives in lib/texture.ts and announces each change', () => {
  assert.match(texture, /export function setTexture\(on: boolean\)/);
  assert.match(texture, /root\.dataset\.texture = 'off'/);
  assert.match(texture, /dispatchEvent\(new CustomEvent<boolean>\(TEXTURE_EVENT/);
});

test('AccentPicker uses the shared switch and listens for outside changes', () => {
  assert.match(picker, /from '@\/lib\/texture'/);
  assert.match(picker, /return onTextureChange\(setTexture\)/);
  assert.doesNotMatch(picker, /localStorage\.setItem\('texture'/);
});

test('while the tour owns the menu, the trigger does not toggle it', () => {
  assert.match(picker, /addEventListener\(TOUR_MENU_EVENT/);
  assert.match(picker, /if \(!owned\) setOpen\(\(was\) => !was\)/);
  assert.match(picker, /if \(!open \|\| owned\) return;/);
});

/* ----- tour --------------------------------------------------------------- */

test('the tour has four steps in order: Scroll, Colour, Texture, How?', () => {
  const ids = [...guide.matchAll(/id: '(\w+)',/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['scroll', 'colour', 'texture', 'how']);
  assert.doesNotMatch(guide, /theme-toggle|Dark mode/);
});

test('step 1 says Swipe up on coarse pointers, Scroll otherwise', () => {
  assert.match(guide, /coarse \? 'Swipe up to begin\.' : 'Scroll to begin\.'/);
  assert.match(guide, /matchMedia\('\(pointer: coarse\)'\)/);
});

test('it starts 900ms after load, only when guide-seen is unset', () => {
  assert.match(guide, /START_MS = 900/);
  assert.match(guide, /getItem\(GUIDE_SEEN_KEY\)/);
  assert.match(guide, /setItem\(GUIDE_SEEN_KEY, '1'\)/);
});

test('Esc, Skip, Done, Open How? and the real pill all end it', () => {
  assert.match(guide, /event\.key === 'Escape'\) end\(\)/);
  assert.match(guide, /className="tour-skip" onClick=\{end\}/);
  assert.match(guide, /last \? end\(\) : go\(index \+ 1\)/);
  assert.match(guide, /closest\('\.how-btn'\)\) end\(\)/);
  assert.match(guide, /end\(\);\n\s*document\.querySelector<HTMLButtonElement>\('\.how-btn'\)\?\.click\(\)/);
});

test('the card is a non-modal dialog that announces each step', () => {
  assert.match(guide, /role="dialog"\n\s*aria-modal="false"/);
  assert.match(guide, /className="tour-card__body" id=\{bodyId\} aria-live="polite"/);
  assert.match(guide, /primaryRef\.current\?\.focus/);
});

test('picks and texture flips add a live line on their steps', () => {
  assert.match(guide, /it is\. Next: the texture\./);
  assert.match(guide, /'Texture off\. Flip it back any time\.'/);
});

test('a card above its target points down at it, never on a phone', () => {
  assert.match(guide, /step\.side === 'top' && window\.innerWidth > PHONE_MAX/);
  assert.match(guide, /toggleAttribute\('data-arrow', arrow\)/);
  assert.match(css, /\.tour-card\[data-arrow\]::after \{[\s\S]*?left: var\(--arrow-x, 50%\)/);
});

test('the tour card uses --radius-lg', () => {
  const card = css.slice(css.indexOf('\n.tour-card {'), css.indexOf('}', css.indexOf('\n.tour-card {')));
  assert.match(card, /border-radius: var\(--radius-lg/);
});

test('a target that is not rendered drops its step', () => {
  assert.match(guide, /getClientRects\(\)\.length \?\? 0\) > 0/);
});

test('the ring never takes a click and only fades', () => {
  const ring = css.slice(css.indexOf('.tour-ring {'), css.indexOf('}', css.indexOf('.tour-ring {')));
  assert.match(ring, /pointer-events: none/);
  assert.match(ring, /0 0 0 200vmax/);
  assert.match(ring, /transition: opacity 200ms/);
});

test('steps swap out in 140ms and in over 260ms; reduced motion is opacity only', () => {
  assert.match(guide, /OUT_MS = 140/);
  assert.match(css, /opacity 260ms cubic-bezier\(0\.32, 0\.72, 0, 1\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.tour-card,[\s\S]*?transform: none;\s*transition:\s*opacity 200ms linear/);
});

/* ----- lag notice --------------------------------------------------------- */

test('the lag watch starts only after the tour, with texture and motion on', () => {
  assert.match(guide, /setIndex\(-1\);\n\s*setLagWatching\(true\)/);
  assert.match(guide, /if \(!motionOn\(\) \|\| !isTextureOn\(\)/);
});

test('the lag notice shows once per visit with Keep it / Switch off texture', () => {
  assert.match(guide, /sessionStorage/);
  assert.match(guide, /setItem\(LAG_ASKED_KEY, '1'\)/);
  assert.match(guide, /Feeling slow\? Switch off the texture\./);
  assert.match(guide, />\s*Keep it\s*</);
  assert.match(guide, />\s*Switch off texture\s*</);
  assert.match(guide, /setTexture\(false\);\n\s*setLag\('done'\)/);
});

test('the lag notice is a top-centre pill that slides down in 320ms', () => {
  // The last top-level rule: the first is shared with .tour-card.
  const at = css.lastIndexOf('\n.lag-notice {');
  const bar = css.slice(at, css.indexOf('}', at));
  assert.match(bar, /top: 16px/);
  assert.match(bar, /border-radius: var\(--radius-pill/);
  assert.match(bar, /backdrop-filter: blur\(8px\)/);
  assert.match(bar, /transform: translateY\(-140%\)/);
  assert.match(css, /\.lag-notice\[data-open\] \{[\s\S]*?opacity 320ms/);
});

test('narrow, the lag notice wraps into a --radius-lg card with 44px buttons', () => {
  assert.match(css, /@media \(max-width: 859px\), \(pointer: coarse\) \{\s*\.lag-notice__actions \.tour-btn \{\s*min-height: 44px;/);
  assert.match(css, /@media \(max-width: 859px\) \{\s*\.lag-notice \{[\s\S]*?border-radius: var\(--radius-lg/);
});

test('the tour and lag buttons are pills', () => {
  const btn = css.slice(css.indexOf('\n.tour-btn {'), css.indexOf('}', css.indexOf('\n.tour-btn {')));
  assert.match(btn, /border-radius: var\(--radius-pill/);
});

/* ----- wiring ------------------------------------------------------------- */

test('the layout mounts the guide and its stylesheet', () => {
  assert.match(layout, /import '\.\/guide\.css';/);
  assert.match(layout, /<FirstVisitGuide \/>/);
});

test('the home page no longer mounts the section pager', () => {
  assert.doesNotMatch(page, /SectionPager/);
});
