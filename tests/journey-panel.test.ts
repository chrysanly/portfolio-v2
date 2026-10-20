/**
 * The desktop journey panel (approved JourneyTimeline v1): the plate label
 * and the stop's full details inline. plateText and panelHTML are pure
 * string builders, so they run here; the layout itself is checked in a
 * real browser (see the handoff).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { plateText, panelHTML, capDid } = await import(
  new URL('../components/work/journey-engine.mjs', import.meta.url).href
);

const ROOT = path.resolve(import.meta.dirname, '..');
const engine = readFileSync(path.join(ROOT, 'components/work/journey-engine.mjs'), 'utf8').replace(/\r\n/g, '\n');
const ladderCSS = engine.slice(engine.indexOf('const CSS = `'), engine.indexOf('`;', engine.indexOf('const CSS = `')));

const stop = {
  kind: 'work',
  title: 'Senior Full-Stack Developer',
  org: 'Almutakamela',
  loc: 'Dubai, UAE',
  period: 'Nov 2025 – present',
  learned: '[what I learned here]',
  learnedIsHtml: false,
  say: '',
  projects: [
    { title: 'Registration ERP', href: '/work/erp', confidential: true },
    { title: 'Open tool', href: '/work/tool', confidential: false },
  ],
  sector: 'Vehicle testing',
  short: 'Building the systems behind vehicle testing.',
  did: ['One', 'Two', 'Three', 'Four', 'Five'],
  tools: ['Laravel', 'PHP', 'React', 'Vue.js', 'MySQL', 'Sanctum'],
};

test('a stop held now reads "2025 – Present"', () => {
  assert.equal(plateText({ period: 'Nov 2025 – present' }), '2025 – Present');
  assert.equal(plateText({ period: 'Present' }), 'Present');
});

test('a range reads "2022 – 2025" and a single year stays', () => {
  assert.equal(plateText({ period: 'Nov 2022 – Feb 2025' }), '2022 – 2025');
  assert.equal(plateText({ period: 'Mar 2025 – Oct 2025' }), '2025');
  assert.equal(plateText({ period: '2020' }), '2020');
});

test('the panel lists every "What I did" item and every tool', () => {
  const html = panelHTML(stop);
  assert.equal(html.match(/<li>(One|Two|Three|Four|Five)<\/li>/g)?.length, 5);
  for (const t of stop.tools) assert.ok(html.includes(`<li>${t}</li>`), `missing tool ${t}`);
  assert.ok(html.includes('<p class="short">Building the systems'), 'summary is inline and unclamped');
});

test('the panel has a View more for its stop that starts hidden', () => {
  const html = panelHTML(stop, 2);
  assert.match(html, /<button type="button" class="more" data-more="2" aria-haspopup="dialog" aria-label="View more about Senior Full-Stack Developer at Almutakamela" hidden>/);
  assert.match(html, /<li class="did-rest" hidden><\/li><\/ul>/);
});

test('capDid shows the first items and a "+N more" line', () => {
  const li = (cls = '') => ({ hidden: false, textContent: '', cls });
  const items = [li(), li(), li(), li(), li(), li(), li()];
  const tail = li('did-rest');
  const list = { querySelectorAll: () => items, querySelector: () => tail };
  assert.equal(capDid(list, 5), 2);
  assert.deepEqual(items.map((i) => i.hidden), [false, false, false, false, false, true, true]);
  assert.equal(tail.hidden, false);
  assert.equal(tail.textContent, '+2 more');
});

test('capDid hides the "+N more" line when nothing is cut', () => {
  const tail = { hidden: false, textContent: 'x' };
  const list = { querySelectorAll: () => [{ hidden: true }], querySelector: () => tail };
  assert.equal(capDid(list, 5), 0);
  assert.equal(tail.hidden, true);
  assert.equal(capDid(null, 5), 0);
});

test('"What I took from it" is clamped to 5, 4 and 3 lines and fades only when cut', () => {
  assert.match(ladderCSS, /\.took\{--lines:5;[^}]*max-height:calc\(1\.6em \* var\(--lines\)\);overflow:hidden\}/);
  assert.match(ladderCSS, /\.took\[data-clamped\]\{[^}]*mask-image:linear-gradient/);
  assert.match(ladderCSS, /@media \(max-height:760px\)\{\.took\{--lines:4\}\}/);
  assert.match(ladderCSS, /@media \(max-height:700px\)\{\.took\{--lines:3\}/);
});

test('View more is a 44px target, hidden by attribute, still under reduced motion', () => {
  assert.match(ladderCSS, /\.more\{[^}]*min-height:44px/);
  assert.match(ladderCSS, /\.more\[hidden\]\{display:none\}/);
  assert.match(ladderCSS, /:host\(\[data-reduce=true\]\) \.more,:host\(\[data-reduce=true\]\) \.more svg\{transition:none\}/);
});

test('the panel is fitted once per card and per resize, not per frame', () => {
  assert.match(engine, /\$\('body'\)\.innerHTML=cardHTML\(k\);\$\('nav'\)\.hidden=k===INTRO;fitPanel\(\);/);
  assert.match(engine, /fit\(\);fitPanel\(\);/);
  const tick = engine.slice(engine.indexOf('function tick('), engine.indexOf('function measurePage('));
  assert.doesNotMatch(tick, /fitPanel/);
});

test('past f4 tools and Built here, then What I did, then the columns step out, and View more shows', () => {
  assert.match(engine, /const FIT=7,/);
  assert.match(engine, /\.side\.f5 \.blk-tools,\.side\.f5 \.blk-built\{display:none\}/);
  assert.match(engine, /\.side\.f6 \.blk-did\{display:none\}/);
  assert.match(engine, /\.side\.f7 \.cols\{display:none\}/);
  assert.match(engine, /more\.hidden=!cut&&rest===0&&!dropped;/);
});

test('the panel is fitted again once the web fonts have loaded', () => {
  assert.match(engine, /document\.fonts\?\.ready\.then\(\(\)=>\{if\(alive\)fitPanel\(\)\}\);/);
});

test('the learned placeholder ships verbatim and HTML is kept as HTML', () => {
  assert.match(panelHTML(stop), /What I took from it<\/p><div class="took"><p>\[what I learned here\]<\/p>/);
  const html = panelHTML({ ...stop, learned: '<p>Ship <em>small</em></p>', learnedIsHtml: true });
  assert.ok(html.includes('<div class="took"><p>Ship <em>small</em></p></div>'));
});

test('"Built here" links route in-app and mark NDA work as Confidential', () => {
  const html = panelHTML(stop);
  assert.match(html, /<a href="\/work\/erp" data-nav><span>Registration ERP <small>Confidential<\/small><\/span>/);
  assert.match(html, /<a href="\/work\/tool" data-nav><span>Open tool<\/span>/);
});

test('an empty block is left out, never an empty label', () => {
  const html = panelHTML({ ...stop, learned: null, projects: [], did: [], tools: [], short: undefined });
  for (const label of ['What I did', 'Tools', 'What I took from it', 'Built here']) {
    assert.ok(!html.includes(label), `${label} shown with no data`);
  }
  assert.doesNotMatch(html, /class="cols/);
});

test('text from the API is escaped', () => {
  const html = panelHTML({ ...stop, title: '<img src=x>', did: ['<b>x</b>'] });
  assert.ok(!html.includes('<img src=x>') && !html.includes('<b>x</b>'));
});

test('the panel is top-aligned, 720px wide and never scrolls', () => {
  assert.match(ladderCSS, /\.side\{[^}]*align-items:start/);
  assert.match(ladderCSS, /\.side\{[^}]*overflow:hidden\}/);
  assert.doesNotMatch(ladderCSS, /overflow-y:auto/);
  assert.match(ladderCSS, /\.card\{width:min\(720px,100%\)\}/);
  assert.match(ladderCSS, /@media \(max-width:1279px\)\{\.cols\{grid-template-columns:1fr\}/);
});

test('reduced motion swaps the card entrance for a short fade', () => {
  assert.match(ladderCSS, /:host\(\[data-reduce=true\]\) \.card__body\{transition:opacity 150ms linear;transform:none!important\}/);
});

test('"+N more" keeps the list size, in --faint, with its dot in --rule', () => {
  assert.match(engine, /\.did \.did-rest\{color:var\(--faint\)\}/);
  assert.match(engine, /\.did \.did-rest::before\{background:var\(--rule\)\}/);
  assert.doesNotMatch(engine, /\.did-rest\{[^}]*font-size/);
});
