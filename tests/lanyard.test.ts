/**
 * The ID badge: lib/lanyard.ts is run; IdCard.tsx and its CSS are checked at
 * the source, since node:test cannot render them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { dragBounds, clampPoint, stepsFor, canSleep, maxSpeed, STEP_MS, MAX_STEPS, EDGE_PAD, QUIET_MS } =
  (await import(new URL('../lib/lanyard.ts', import.meta.url).href)) as typeof import('../lib/lanyard');

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
const card = read('components/hero/IdCard.tsx');
const css = read('app/id-card.css');

// A 1920-wide hero; the badge stage starts 500px in from the left, 80px down.
const hero = { left: 0, right: 1920, top: 0, bottom: 1000 };
const stage = { left: 500, top: 80 };

test('the card is kept inside the hero, left and right', () => {
  const b = dragBounds(hero, stage, 1920, 250, 300);
  assert.equal(b.minX, -500 + 125 + EDGE_PAD);
  assert.equal(b.maxX, 1420 - 125 - EDGE_PAD);
});

test('a hero wider than the window is clamped to the window', () => {
  const b = dragBounds({ ...hero, right: 2400 }, stage, 1366, 250, 300);
  assert.equal(b.maxX, 1366 - 500 - 125 - EDGE_PAD);
});

test('the card stays above the bottom of the hero', () => {
  const b = dragBounds(hero, stage, 1920, 250, 300);
  assert.equal(b.maxY, 1000 - 80 - 300 - EDGE_PAD);
});

test('a room narrower than the card pins it to the middle, never inverted', () => {
  const b = dragBounds({ left: 0, right: 200, top: 0, bottom: 1000 }, { left: 0, top: 0 }, 200, 250, 300);
  assert.equal(b.minX, b.maxX);
  assert.equal(b.minX, 100);
});

test('a point thrown past the edge stops there with no sideways speed', () => {
  const p = { x: -40, y: 50, px: -10, py: 48 };
  clampPoint(p, 0, 500);
  assert.deepEqual(p, { x: 0, y: 50, px: 0, py: 48 });
});

test('a point inside the bounds is left alone', () => {
  const p = { x: 20, y: 50, px: 18, py: 48 };
  clampPoint(p, 0, 500, 0, 900);
  assert.deepEqual(p, { x: 20, y: 50, px: 18, py: 48 });
});

test('one 60fps frame is one step; a 120Hz frame carries over', () => {
  assert.equal(stepsFor(0, STEP_MS).steps, 1);
  const half = stepsFor(0, STEP_MS / 2);
  assert.equal(half.steps, 0);
  assert.equal(stepsFor(half.carry, STEP_MS / 2).steps, 1);
});

test('a slow frame is capped, so the card never leaps', () => {
  const r = stepsFor(0, 2000);
  assert.equal(r.steps, MAX_STEPS);
  assert.ok(r.carry < STEP_MS);
});

test('the loop sleeps only when let go, quiet and still', () => {
  assert.equal(canSleep(false, QUIET_MS, 0.01, 0), true);
  assert.equal(canSleep(true, QUIET_MS, 0, 0), false, 'held');
  assert.equal(canSleep(false, QUIET_MS - 1, 0, 0), false, 'just jogged');
  assert.equal(canSleep(false, QUIET_MS, 0.5, 0), false, 'still swinging');
  assert.equal(maxSpeed([{ x: 3, y: 0, px: 1, py: 0.5 }]), 2);
});

test('the frame loop reads no layout and writes the card by transform only', () => {
  const tick = card.slice(card.indexOf('const tick = '), card.indexOf('const ready = '));
  const move = card.slice(card.indexOf('const onMove = '), card.indexOf('const onUp = '));
  for (const [name, src] of [['tick', tick], ['onMove', move]] as const) {
    assert.doesNotMatch(src, /getBoundingClientRect|offsetWidth|offsetHeight|getComputedStyle/, name);
  }
  assert.match(card, /card\.style\.transform =/);
  assert.doesNotMatch(card, /card\.style\.(left|top|width|height) =/);
});

test('drag and throw are clamped to the hero', () => {
  assert.match(card, /closest<HTMLElement>\('\.hero'\)/);
  assert.match(card, /clampPoint\(slot\(\)/);
  assert.match(card, /clampPoint\(foot\(\)/);
});

test('the loop sleeps when idle or off-screen and wakes on touch, scroll and resize', () => {
  assert.match(card, /canSleep\(/);
  assert.match(card, /entry\.isIntersecting \? start\(\) : stop\(\)/);
  for (const fn of ['onDown', 'onScroll', 'onResize']) {
    const body = card.slice(card.indexOf(`const ${fn} = `), card.indexOf('};', card.indexOf(`const ${fn} = `)));
    assert.match(body, /wake\(\)/, `${fn} wakes the loop`);
  }
});

test('the portrait is cropped to the face, larger, and framed', () => {
  assert.match(card, /import '@\/app\/id-card\.css';/);
  assert.match(css, /\.lanyard \.lanyard__photo img \{[^}]*object-fit: cover;[^}]*object-position: 50% 22%;/);
  assert.match(css, /grid-template-columns: 84px minmax\(0, 1fr\);/);
  assert.match(card, /<img[^>]*decoding="async"/);
});

test('the portrait ring is an inset 1px line drawn over the photo, not an outside outline', () => {
  assert.match(css, /\.lanyard \.lanyard__photo \{[^}]*outline: none;/);
  assert.doesNotMatch(css, /\.lanyard \.lanyard__photo \{[^}]*outline-offset/);
  assert.match(
    css,
    /\.lanyard \.lanyard__photo::after \{[^}]*inset: 0;[^}]*box-shadow: inset 0 0 0 1px color-mix\(in srgb, var\(--color-ground\) 22%, transparent\);[^}]*pointer-events: none;/,
  );
});

test('the focus ring still shows on the photo button', () => {
  assert.match(css, /\.lanyard \.lanyard__photo:focus-visible \{\s*outline: 2px solid var\(--color-accent\);/);
});
