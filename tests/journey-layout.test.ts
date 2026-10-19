/**
 * The compact journey (below 1024 and short landscape, approved v6), checked
 * at the source: the engine draws into a shadow root that node:test cannot
 * render. The browser check is in the handoff.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const engine = read('components/work/journey-engine.mjs');
const css = read('app/journey.css');
const compact = engine.slice(engine.indexOf('const COMPACT_Q='), engine.indexOf('export function mountJourney'));
const CSS_C = compact.slice(compact.indexOf('const CSS_C = `'), compact.indexOf('`;', compact.indexOf('const CSS_C = `')));
const head = compact.slice(compact.indexOf('<div class="head">'), compact.indexOf('<div class="jbar">'));

test('the compact intro has its own copy and no ladder words', () => {
  assert.match(engine, /const C_TITLE='My career, one stop at a time\.';/);
  assert.match(engine, /const cLedeOf=N=>`From college to senior roles\. \$\{stopsWord\(N\)\} so far, and I’m still moving forward\.`;/);
  assert.match(engine, /const C_HOW='Scroll, or use <kbd>↑<\/kbd> <kbd>↓<\/kbd>, to go through each role/);
  assert.match(head, /\$\{C_TITLE\}[\s\S]*\$\{esc\(cLedeOf\(N\)\)\}[\s\S]*\$\{C_HOW\}/);
  for (const word of [/ladder/i, /rung/i]) {
    assert.doesNotMatch(head, word);
    assert.doesNotMatch(engine.match(/const C_TITLE=[\s\S]*?const C_HOW=.*$/m)![0], word);
  }
});

test('the desktop intro keeps the ladder copy', () => {
  assert.match(engine, /<h2 class="intro-t">This ladder is my career\.<\/h2>/);
  assert.match(engine, /const ledeOf=N=>`College at the bottom, every job a rung above it/);
});

test('no ladder, figure or pinned stage in compact', () => {
  for (const gone of ['RIG', 'RAIL_DEFS', 'jtrack', 'jstage', 'pose(']) {
    assert.ok(!compact.includes(gone), `compact still has ${gone}`);
  }
  assert.doesNotMatch(CSS_C, /\.jstage|\.rail\b|\.rig\b/);
});

test('the strip: ↑ previous first, then ↓ next, with their names', () => {
  const up = compact.indexOf('aria-label="Previous stop (scroll up)"');
  const down = compact.indexOf('aria-label="Next stop (scroll down)"');
  assert.ok(up > 0 && down > up);
  assert.match(compact, /id="jUp" aria-label="Previous stop \(scroll up\)"><span>\$\{UP_ARROW\}/);
  assert.match(compact, /id="jDown" aria-label="Next stop \(scroll down\)"><span>\$\{DOWN_ARROW\}/);
  assert.match(compact, /up\.onclick=\(\)=>goTo\(shown-1\);/);
  // From the intro ↓ goes to stop 1, then one stop on each press.
  assert.match(compact, /down\.onclick=\(\)=>goTo\(inIntro\?0:shown\+1\);/);
  assert.match(compact, /up\.disabled=k===0;down\.disabled=k===M-1;/);
});

test('the strip sits under the header: 52px, sticky, 44px buttons', () => {
  assert.match(compact, /const BAR_H=52;/);
  assert.match(CSS_C, /\.jbar\{position:sticky;top:var\(--hh\);/);
  assert.match(CSS_C, /\.ibtn\{width:44px;height:44px;/);
  assert.match(CSS_C, /\.ibtn:disabled\{opacity:\.35;/);
  assert.match(CSS_C, /\.ibtn:focus-visible span\{outline:2px solid var\(--accent\)/);
  assert.match(CSS_C, /\.ticks\{[^}]*height:3px;max-width:220px\}/);
});

test('one stop per screen, settling on a stop without holding the wheel', () => {
  assert.match(CSS_C, /\.stop\{height:calc\(100svh - var\(--hh\) - var\(--bar-h\)\);/);
  assert.match(CSS_C, /scroll-snap-align:start;scroll-snap-stop:always;/);
  assert.match(css, /html\.jw-snap \{\s*scroll-snap-type: y proximity;\s*scroll-padding-top: calc\(var\(--header-h, 72px\) \+ 52px\);/);
  assert.match(css, /html:has\(\.jw-host\):not\(\.jw-snap\) \{\s*scroll-snap-type: none;/);
});

test('the snap is on only inside the journey, and comes off on unmount', () => {
  assert.match(compact, /html\.classList\.toggle\(SNAP_CLASS,y>=from&&y<=to\);/);
  assert.match(compact, /html\.classList\.remove\(SNAP_CLASS\);/);
  // mountJourney remounts (and so runs that cleanup) when COMPACT_Q changes.
  assert.match(engine, /cq\.addEventListener\('change', mount\);/);
  assert.match(engine, /stop\?\.\(\);\s*stop = \(cq\.matches \? mountCompact : mountLadder\)/);
});

test('each stop fits itself, one step at a time', () => {
  assert.match(compact, /for\(let n=1;n<=4;n\+\+\)s\.classList\.toggle\('f'\+n,n<=lv\);/);
  for (const n of [1, 2, 3, 4]) assert.match(CSS_C, new RegExp(`\\.stop\\.f${n} `));
  assert.doesNotMatch(compact, /data-fit/);
});

test('stops fade and drift with the scroll; reduced motion only fades', () => {
  assert.match(compact, /el\.style\.opacity=\(1-clamp\(a\/\.7\)\)\.toFixed\(3\);/);
  assert.match(compact, /el\.style\.transform=rm\?'none':`translate3d\(0,\$\{\(d\*28\)\.toFixed\(1\)\}px,0\) scale\(\$\{\(1-\.03\*clamp\(a\)\)\.toFixed\(4\)\}\)`;/);
  assert.match(compact, /if\(a>1\.2\)\{el\.style\.opacity='0';return\}/);
  assert.match(compact, /behavior:rm\?'auto':'smooth'/);
  assert.match(CSS_C, /:host\(\[data-reduce=true\]\) \.ticks i::after\{transition:none\}/);
});

test('only the current stop is interactive, and it is announced', () => {
  assert.match(compact, /ins\.forEach\(\(el,j\)=>\{el\.inert=j!==k\}\);/);
  assert.match(compact, /live\.textContent=`Stop \$\{k\+1\} of \$\{M\}: \$\{titles\[k\]\}`;/);
  assert.match(compact, /role="status"/);
});

test('the last stop lists the climb so far and offers Send a message', () => {
  assert.match(compact, /The climb so far/);
  assert.match(compact, /S\.map\(s=>\(\{p:plateText\(s\),t:s\.title\}\)\)\.reverse\(\)/);
  assert.match(compact, /<a class="btn-ink" href="\/contact" data-nav>/);
  assert.match(compact, /\$\{END_KIND\}<\/p><h3>\$\{END_TITLE\}<\/h3>/);
});

test('View more still opens the details modal', () => {
  assert.match(compact, /const more=e\.target\.closest\('button\[data-more\]'\);\s*if\(more\)\{options\.onMore\?\.\(Number\(more\.dataset\.more\),more\);return\}/);
});

test('facts stack on narrow phones; two columns from 600px or in landscape', () => {
  assert.match(CSS_C, /@media \(max-width:419px\)\{\.facts\{grid-template-columns:1fr;/);
  assert.match(CSS_C, /@media \(min-width:600px\),\(orientation:landscape\)\{\s*\.stop-in\{display:grid;grid-template-columns:clamp\(140px,22vw,200px\) minmax\(0,1fr\);/);
});
