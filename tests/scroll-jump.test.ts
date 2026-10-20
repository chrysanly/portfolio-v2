/**
 * Deliberate scroll jumps (the section pager) stay inside the 150–400ms
 * motion budget and ease out. Checked at the source for the pager, since
 * node:test cannot render JSX.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

const { easeOutCubic, animateScrollTo, isJumping } = await import(
  new URL('../lib/scrollJump.ts', import.meta.url).href
);

/** A window that scrolls, with a frame queue the test steps by hand. */
function fakeWindow(reduced: boolean) {
  const frames: ((now: number) => void)[] = [];
  const win = Object.assign(new EventTarget(), {
    scrollY: 0,
    scrollTo(_x: number, y: number) {
      win.scrollY = y;
    },
    matchMedia: () => ({ matches: reduced }),
  });
  Object.assign(globalThis, {
    window: win,
    requestAnimationFrame: (fn: (now: number) => void) => frames.push(fn),
  });
  const frame = (now: number) => frames.splice(0).forEach((fn) => fn(now));
  return { win, frame, pending: () => frames.length };
}

test('the pager jumps in 380ms, inside the 150–400ms budget', () => {
  const pager = read('components/ui/SectionPager.tsx');
  const ms = Number(/const JUMP_MS = (\d+);/.exec(pager)?.[1]);
  assert.equal(ms, 380);
  assert.ok(ms >= 150 && ms <= 400);
});

test('animateScrollTo defaults to 380ms with an ease-out', () => {
  const src = read('lib/scrollJump.ts');
  assert.match(src, /ms = 380,\s*easing: \(t: number\) => number = easeOutCubic,/);
});

test('the ease-out starts fast and lands softly', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);
});

test('reduced motion lands on the target at once, with no frames', async () => {
  const { win, pending } = fakeWindow(true);
  await animateScrollTo(900, 1000);
  assert.equal(win.scrollY, 900);
  assert.equal(pending(), 0);
  assert.equal(isJumping(), false);
});

test('without reduced motion the jump runs over frames to the target', async () => {
  const { win, frame } = fakeWindow(false);
  const done = animateScrollTo(1000, 400);
  const t0 = performance.now();
  frame(t0 + 200);
  assert.ok(win.scrollY > 0 && win.scrollY < 1000);
  assert.equal(isJumping(), true);
  frame(t0 + 1000);
  await done;
  assert.equal(win.scrollY, 1000);
  assert.equal(isJumping(), false);
});

for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
  test(`a ${type} during the jump stops it where it is`, async () => {
    const { win, frame } = fakeWindow(false);
    const done = animateScrollTo(1000, 1000);
    const t0 = performance.now();
    frame(t0 + 300);
    const at = win.scrollY;
    win.dispatchEvent(new Event(type));
    await done;
    assert.equal(isJumping(), false);
    frame(t0 + 600);
    assert.equal(win.scrollY, at);
  });
}

test('a finished jump leaves no listeners behind', async () => {
  const { win, frame } = fakeWindow(false);
  const done = animateScrollTo(500, 100);
  frame(performance.now() + 500);
  await done;
  const next = animateScrollTo(0, 1000);
  frame(performance.now() + 10);
  win.dispatchEvent(new Event('wheel'));
  await next;
  assert.equal(isJumping(), false);
});
