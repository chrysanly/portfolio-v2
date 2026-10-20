/**
 * The read hold: a fast scroll down through the hero's details is held on
 * the plateau for HOLD_MS once the details are on screen, then let go.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { holdTarget, freshHold } = await import(
  new URL('../lib/readHold.ts', import.meta.url).href
);

const OPTS = { from: 0.45, to: 0.68, ms: 700, bail: 0.97 };

/** A hold that has seen the top of the hero, as on a normal first load. */
const fromTop = () => {
  const s = freshHold();
  holdTarget(s, 0, 0, 0, OPTS);
  return s;
};

test('below the plateau the target is the scroll itself', () => {
  const r = holdTarget(fromTop(), 0.3, 0.3, 0, OPTS);
  assert.equal(r.target, 0.3);
  assert.equal(r.wakeIn, null);
});

test('a fling past the plateau is capped before the details are shown', () => {
  const r = holdTarget(fromTop(), 0.9, 0.2, 10, OPTS);
  assert.equal(r.target, 0.68);
});

test('once shown, the cap holds for the hold time and says when to wake', () => {
  const s = fromTop();
  holdTarget(s, 0.9, 0.5, 1000, OPTS);
  const r = holdTarget(s, 0.9, 0.6, 1300, OPTS);
  assert.equal(r.target, 0.68);
  assert.equal(r.wakeIn, 400);
});

test('after the hold the target lets go to the scroll', () => {
  const s = fromTop();
  holdTarget(s, 0.9, 0.5, 1000, OPTS);
  const r = holdTarget(s, 0.9, 0.68, 1700, OPTS);
  assert.equal(r.target, 0.9);
  assert.equal(r.wakeIn, null);
});

test('it holds once: scrolling on after the hold is not held again', () => {
  const s = fromTop();
  holdTarget(s, 0.9, 0.5, 1000, OPTS);
  holdTarget(s, 0.9, 0.68, 1700, OPTS);
  assert.equal(holdTarget(s, 0.6, 0.6, 1800, OPTS).target, 0.6);
  assert.equal(holdTarget(s, 0.9, 0.6, 1900, OPTS).target, 0.9);
});

test('going back above the plateau arms it again', () => {
  const s = fromTop();
  holdTarget(s, 0.9, 0.5, 1000, OPTS);
  holdTarget(s, 0.9, 0.68, 1700, OPTS);
  holdTarget(s, 0.2, 0.2, 2000, OPTS);
  assert.equal(holdTarget(s, 0.9, 0.3, 2100, OPTS).target, 0.68);
});

test('a visitor who already read for longer than the hold is not held', () => {
  const s = fromTop();
  holdTarget(s, 0.5, 0.5, 1000, OPTS);
  assert.equal(holdTarget(s, 0.8, 0.6, 3000, OPTS).target, 0.8);
});

test('near the end of the track it lets go at once, so the stage never scrolls off painted', () => {
  const r = holdTarget(fromTop(), 0.98, 0.5, 10, OPTS);
  assert.equal(r.target, 0.98);
});

test('scrolling up into the hero is never held', () => {
  const s = freshHold();
  holdTarget(s, 0.99, 0.99, 0, OPTS);
  assert.equal(holdTarget(s, 0.9, 0.99, 10, OPTS).target, 0.9);
});
