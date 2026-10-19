/**
 * Hero v2 (2026-10-20): a read hold before the intro clears, the header only
 * after the clear, and the phone hero (large CHRYS, compact ledger, pill
 * pair). Checked at the source, since node:test cannot render JSX.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) =>
  readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const hero = read('components/hero/MastheadHero.tsx');
const actions = read('components/ui/HeroActions.tsx');
const css = read('app/globals.css');

/* ----- read hold ------------------------------------------------------------ */

test('the reveal ends at 0.45 and a read hold runs to 0.68', () => {
  assert.match(hero, /const REVEAL_AT = 0\.45;/);
  assert.match(hero, /const READ_END = 0\.68;/);
});

test('the read hold is a flat piece at SETTLE in fromScroll', () => {
  assert.match(
    hero,
    /: raw <= READ_END\s*\? SETTLE\s*: SETTLE \+ \(1 - SETTLE\) \* \(\(raw - READ_END\) \/ \(1 - READ_END\)\);/,
  );
});

test('toScroll lands SETTLE on the start of the plateau', () => {
  assert.match(hero, /: READ_END \+ \(1 - READ_END\) \* \(\(p - SETTLE\) \/ \(1 - SETTLE\)\);/);
});

test('the tracks are 280svh, 240svh on a phone, with --hero-pull recomputed', () => {
  assert.match(hero, /className="h-\[280svh\] max-md:h-\[240svh\] relative"/);
  assert.match(css, /--hero-pull: -104\.4svh;/);
  assert.match(css, /--hero-pull: -103\.4svh;/);
});

test('the header takes over only once the body has cleared', () => {
  assert.match(hero, /root\.dataset\.heroHandoff = p >= HANDOVER_TO \? 'on' : 'off';/);
  assert.doesNotMatch(hero, /heroHandoff = handover/);
});

/* ----- phone masthead -------------------------------------------------------- */

test('on a phone CHRYS settles at 0.75 and holds until the clear', () => {
  assert.match(hero, /const PHONE_MAST_SCALE = 0\.75;/);
  assert.match(hero, /: atB \+ \(1 - atB\) \* ease\(span\(p, CLEAR_FROM, DOCK_END\)\);/);
  assert.match(hero, /const curve = g\.phone \? phoneStage : stage;/);
});

test('on a phone the letters stay spread edge to edge at the reduced size', () => {
  assert.match(
    hero,
    /const phoneGap = n > 1 \? g\.spread \+ \(g\.width \* \(1 \/ scale - 1\)\) \/ \(n - 1\) : 0;/,
  );
  assert.match(hero, /translate3d\(\$\{phoneGap \* i \* phoneOpen\}px, 0, 0\)/);
});

/* ----- phone layout ------------------------------------------------------------ */

test('phone: intro 19px in 20ch, one 14px note in 36ch', () => {
  assert.match(css, /\.intro__line > span \{\s*max-width: 20ch;\s*font-size: 1\.1875rem;/);
  assert.match(css, /\.intro__note \{\s*margin-top: 10px;\s*max-width: 36ch;/);
  assert.match(css, /\.intro__note \+ \.intro__note \{\s*display: none;/);
});

test('phone: the ledger is a one-column list of four rows (96px labels)', () => {
  assert.doesNotMatch(css, /\.facts__row \{\s*display: none;\s*\}/);
  assert.match(css, /\.facts__row:nth-child\(n \+ 5\) \{\s*display: none;/);
  assert.match(css, /\.facts__row > dt \{\s*width: 96px;/);
});

test('short phone: no note and two ledger rows', () => {
  assert.match(
    css,
    /@media \(max-width: 767px\) and \(max-height: 700px\) \{\s*\.intro__note \{\s*display: none;\s*\}\s*\.facts__row:nth-child\(n \+ 3\) \{\s*display: none;/,
  );
});

test('phone: CHRYS is not shrunk by the short-height rule', () => {
  assert.match(css, /\.masthead \{\s*font-size: clamp\(76px, 23\.5vw, 120px\);/);
});

/* ----- the button pair ----------------------------------------------------------- */

test('the buttons are a pill pair at every width; option D is gone', () => {
  assert.match(actions, /<div className="hero-actions__pair">/);
  assert.doesNotMatch(actions, /hero-actions__link/);
  assert.doesNotMatch(css, /hero-actions__link|hero-link-nudge/);
});

test('phone: a two-column grid at 48px over a rule, "My work", no CV icon', () => {
  assert.match(
    css,
    /\.hero-actions__pair \{\s*display: grid;\s*grid-template-columns: 1fr 1fr;\s*gap: 10px;\s*padding-top: 18px;\s*border-top: 1px solid var\(--color-rule\);/,
  );
  assert.match(css, /\.hero-actions \.button \{\s*min-height: 48px;/);
  assert.match(actions, /<span className="hero-actions__short">My work<\/span>/);
  assert.match(css, /\.hero-actions__long,\s*\.hero-actions__cv-icon \{\s*display: none;/);
});

test('the CV date is a mono line below the pair', () => {
  assert.match(actions, /<p className="hero-actions__stamp">CV updated \{updated\}<\/p>/);
  assert.match(
    css,
    /\.hero-actions__stamp \{\s*margin: 12px 0 0;\s*font-family: var\(--font-mono\);/,
  );
});

test('press and focus states: scale .97 at 160ms, 2px ink outline', () => {
  assert.match(
    css,
    /\.hero-actions \.button:active \{\s*transform: scale\(0\.97\);\s*transition-duration: 160ms;/,
  );
  assert.match(
    css,
    /\.hero-actions \.button:focus-visible \{\s*outline: 2px solid var\(--color-ink\);\s*outline-offset: 3px;/,
  );
});

test('phone: the underlined phrase stays whole on its line', () => {
  assert.match(css, /@media \(max-width: 767px\) \{\s*\.mark \{\s*display: inline-block;\s*\}/);
});
