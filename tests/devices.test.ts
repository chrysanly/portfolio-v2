/**
 * Which device frames a project shows (lib/devices.ts): run, not read.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { devicesFor, devicesAttr, shotsFor, hasUrl } = (await import(
  new URL('../lib/devices.ts', import.meta.url).href
)) as typeof import('../lib/devices');

const img = (device: string, src: string | null = `https://x.test/${device}.png`) => ({ device, src });

test('a project with all three gets laptop, mobile, tablet in that order', () => {
  assert.deepEqual(devicesFor({ images: [img('tablet'), img('mobile'), img('laptop')] }), [
    'laptop',
    'mobile',
    'tablet',
  ]);
});

test('no mobile upload means no mobile frame', () => {
  assert.deepEqual(devicesFor({ images: [img('laptop'), img('tablet')] }), ['laptop', 'tablet']);
});

test('an empty or whitespace URL is no image', () => {
  assert.deepEqual(devicesFor({ images: [img('laptop'), img('mobile', ''), img('tablet', '   ')] }), ['laptop']);
});

test('a null URL is no image', () => {
  assert.equal(hasUrl(img('mobile', null)), false);
  assert.deepEqual(devicesFor({ images: [img('mobile', null)] }), []);
});

test('no images, or no images list, means no frames', () => {
  assert.deepEqual(devicesFor({ images: [] }), []);
  assert.deepEqual(devicesFor({}), []);
  assert.equal(devicesAttr([]), '');
});

test('the rig attribute is the devices, space-joined', () => {
  assert.equal(devicesAttr(['laptop', 'mobile']), 'laptop mobile');
});

test("a device's shots are only its own, never another device's", () => {
  const images = [img('laptop', 'a'), img('mobile', 'b'), img('laptop', 'c'), img('laptop', ' ')];
  assert.deepEqual(
    shotsFor(images, 'laptop').map((i) => i.src),
    ['a', 'c'],
  );
  assert.deepEqual(shotsFor(images, 'tablet'), []);
});

const { nextSlide, isSlideshow, slideAlt, shouldAutoplay, SLIDE_MS } = (await import(
  new URL('../lib/devices.ts', import.meta.url).href
)) as typeof import('../lib/devices');

test('slides wrap forward and back, and one shot never moves', () => {
  assert.equal(nextSlide(2, 3, 1), 0);
  assert.equal(nextSlide(0, 3, -1), 2);
  assert.equal(nextSlide(0, 1, 1), 0);
  assert.equal(nextSlide(0, 0, -1), 0);
});

test('only two or more shots make a slideshow', () => {
  assert.equal(isSlideshow(1), false);
  assert.equal(isSlideshow(0), false);
  assert.equal(isSlideshow(2), true);
});

test('alt text ends "n of N" only for a slideshow', () => {
  assert.equal(slideAlt('Dashboard', 0, 3), 'Dashboard, 1 of 3');
  assert.equal(slideAlt('Dashboard', 0, 1), 'Dashboard');
});

test('autoplay is 4s and stops for hover, focus, a hidden tab, off-screen and reduced motion', () => {
  assert.equal(SLIDE_MS, 4000);
  const on = { count: 3, held: false, hidden: false, inView: true, reduced: false };
  assert.equal(shouldAutoplay(on), true);
  assert.equal(shouldAutoplay({ ...on, held: true }), false);
  assert.equal(shouldAutoplay({ ...on, hidden: true }), false);
  assert.equal(shouldAutoplay({ ...on, inView: false }), false);
  assert.equal(shouldAutoplay({ ...on, reduced: true }), false);
  assert.equal(shouldAutoplay({ ...on, count: 1 }), false);
});
