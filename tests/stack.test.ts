/**
 * "What I build with": the resume's stack with logos. The data is imported
 * and checked for real; the markup and CSS are checked at the source, since
 * node:test cannot render JSX.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file: string) =>
  readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const { skillGroups, logoBrand, drawnLogos } = await import(
  new URL('../content/site.ts', import.meta.url).href
);
const stack = await import(new URL('../lib/stack.ts', import.meta.url).href);
type Item = { name: string; logo?: string; concept?: true };
type Group = { key: string; label: string; short: string; items: Item[] };
const groups = skillGroups as Group[];
const items = groups.flatMap((g) => g.items);

const section = read('components/ui/StackSection.tsx');
const tools = read('components/work/StackTools.tsx');
const css = read('app/stack.css');
const docs = read('docs/07-SOURCE-CONTENT.md');

test('every logo has its file in public/logos', () => {
  for (const item of items.filter((i) => i.logo)) {
    assert.ok(
      existsSync(path.join(ROOT, 'public/logos', `${item.logo}.svg`)),
      `${item.name}: no ${item.logo}.svg`,
    );
  }
});

test('every logo file is a 24x24 SVG, nothing scripted or linked', () => {
  for (const slug of new Set(items.filter((i) => i.logo).map((i) => i.logo!))) {
    const svg = read(`public/logos/${slug}.svg`);
    assert.match(svg, /^<svg role="img" viewBox="0 0 24 24"/);
    assert.doesNotMatch(svg, /<script|on\w+=|href=/i);
  }
});

test('a brand hover colour is only kept where it holds 3:1 on that ground', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  for (const [slug, [light, dark]] of Object.entries(
    logoBrand as Record<string, [string | null, string | null]>,
  )) {
    if (light) assert.ok(ratio(light, '#f7f6f2') >= 3, `${slug} light`);
    if (dark) assert.ok(ratio(dark, '#14130f') >= 3, `${slug} dark`);
  }
  for (const slug of new Set(
    items.filter((i) => i.logo && !drawnLogos.has(i.logo)).map((i) => i.logo!),
  )) {
    assert.ok(slug in logoBrand, `${slug} has no brand entry`);
  }
});

test('the list is docs/07 §3, group by group', () => {
  const s3 = docs.slice(docs.indexOf('## 3. Skills'), docs.indexOf('## 4.'));
  for (const g of groups) {
    assert.ok(s3.includes(`**${g.label}**`), `docs/07 lacks group ${g.label}`);
    for (const item of g.items) {
      assert.ok(
        s3.replace(/\s+/g, ' ').toLowerCase().includes(item.name.toLowerCase()),
        `docs/07 lacks ${item.name}`,
      );
    }
  }
});

test('the AI the resume names is there, with logos where they exist', () => {
  const ai = groups.find((g) => g.label === 'AI & agentic engineering')!;
  assert.deepEqual(
    ai.items.filter((i) => i.logo).map((i) => i.logo),
    ['claude', 'modelcontextprotocol', 'groq'],
  );
});

test('nothing from the resume that must stay off the site', () => {
  const site = read('content/site.ts');
  const stackData = site.slice(
    site.indexOf('export type StackItem'),
    site.indexOf('export const logoBrand'),
  );
  for (const source of [
    stackData,
    section,
    docs.slice(docs.indexOf('## 3. Skills'), docs.indexOf('## 4.')),
  ]) {
    assert.doesNotMatch(source, /June 24|1997|Civil Status: Single|925 8013/);
  }
});

test('no tool appears twice in a group', () => {
  for (const g of groups) {
    const names = g.items.map((i) => i.name);
    assert.equal(new Set(names).size, names.length, g.label);
  }
});

test('the home page shows the section after the journey, before contact', () => {
  const home = read('app/page.tsx');
  const j = home.indexOf('id="journey"');
  const s = home.indexOf('<StackSection />');
  const c = home.indexOf('id="contact"');
  assert.ok(j > 0 && s > j && c > s);
  assert.match(home, /<div id="stack" data-section="Stack">/);
});

test('Simple Icons logos are masks in their brand colour on a light badge', () => {
  assert.match(
    css,
    /\.stack-pill__logo \{[^}]*background-color: var\(--logo-ink\);[^}]*mask: var\(--logo\) center \/ contain no-repeat;/,
  );
  assert.match(css, /\.stack-pill__badge \{[^}]*background: var\(--stack-badge\);/);
});

test('logos are decorative; the name is the text', () => {
  assert.match(
    tools,
    /<li className="stack-pill"[^>]*>\s*<Badge tool=\{tool\} \/>\s*\{tool\.name\}/,
  );
  assert.equal(
    (tools.match(/className="stack-pill__badge[^"]*" aria-hidden="true"/g) ?? []).length,
    3,
  );
});

test('every tool has a logo; only practices go without', () => {
  for (const item of items.filter((i) => !i.concept))
    assert.ok(item.logo, `${item.name} has no logo`);
});

test('the tools asked for on 2026-10-19 are there, with logos', () => {
  const byName = new Map(items.map((i) => [i.name, i]));
  for (const name of [
    'Tamara',
    'Tabby',
    'Etisalat',
    'Next.js',
    'Render',
    'Cloudinary',
    'Neon Postgres',
  ]) {
    assert.ok(byName.get(name)?.logo, `${name} missing or without a logo`);
  }
});

test('no version numbers on the tools', () => {
  for (const item of items)
    assert.doesNotMatch(item.name, /\d+[–-]\d+|\b(Laravel|Vue|Angular|Ionic) \d/, item.name);
});

test('All mixes the groups in turn and lists a shared tool once', () => {
  const groups: Group[] = [
    { key: 'a', label: 'A', short: 'A', items: [{ name: 'One' }, { name: 'Shared' }] },
    {
      key: 'b',
      label: 'B',
      short: 'B',
      items: [{ name: 'Two' }, { name: 'Shared' }, { name: 'Three' }],
    },
  ];
  assert.deepEqual(
    stack.mixAll(groups).map((t: Item) => t.name),
    ['One', 'Two', 'Shared', 'Three'],
  );
});

test('logos come first, each half keeping its order', () => {
  const list = [
    { name: 'a', group: 'x' },
    { name: 'b', logo: 'b', group: 'x' },
    { name: 'c', group: 'x' },
    { name: 'd', logo: 'd', group: 'x' },
  ];
  assert.deepEqual(
    stack.logoFirst(list).map((t: Item) => t.name),
    ['b', 'd', 'a', 'c'],
  );
});

test('the tabs are All plus one per group, with honest counts', () => {
  const tabs = stack.buildTabs(groups) as { key: string; label: string; tools: Item[] }[];
  assert.equal(tabs[0].key, 'all');
  assert.equal(tabs.length, groups.length + 1);
  assert.equal(tabs[0].tools.length, new Set(items.map((i) => i.name)).size);
  groups.forEach((g, i) => assert.equal(tabs[i + 1].tools.length, g.items.length));
});

test('neighbours wrap, so the last tab sits next to All', () => {
  assert.equal(stack.neighbour(10, 9, 1), 0);
  assert.equal(stack.neighbour(10, 0, -1), 9);
  assert.equal(stack.neighbour(10, 3, 1), 4);
});

test('View more reveals what is past the limit, never a negative', () => {
  assert.equal(stack.hiddenCount(78, 10), 68);
  assert.equal(stack.hiddenCount(6, 10), 0);
});

test('the cloud follows the finger, then resists past 40% of its width', () => {
  assert.equal(stack.resist(100, 400), 100);
  assert.equal(stack.resist(260, 400), 160 + 100 * 0.3);
  assert.equal(stack.resist(-260, 400), -(160 + 100 * 0.3));
});

test('the cloud fades as it is pulled, never below half', () => {
  assert.equal(stack.dragOpacity(0, 400), 1);
  assert.equal(stack.dragOpacity(400, 400), 0.5);
});

test('a drag opens the next tab only from 72px', () => {
  assert.equal(stack.isArmed(71), false);
  assert.equal(stack.isArmed(-72), true);
});

test('the axis locks after 6px, and a vertical move is left to the page', () => {
  assert.equal(stack.lockAxis(5, 5), null);
  assert.equal(stack.lockAxis(10, 3), 'x');
  assert.equal(stack.lockAxis(3, 10), 'y');
});

test('which pills hide behind View more is CSS, per breakpoint', () => {
  assert.ok(/max-width: 699px/.test(css) && css.includes('nth-child(n + 11)'));
  assert.ok(/max-width: 1099px/.test(css) && css.includes('nth-child(n + 19)'));
  assert.ok(/min-width: 1100px/.test(css) && css.includes('nth-child(n + 29)'));
});

test('reduced motion stops the nudge and the rise-in', () => {
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reduced, /\.stack-grab\.is-nudging \{\s*animation: none;/);
});

test('a soft accent spotlight follows the pointer inside a pill', () => {
  assert.match(css, /\.stack-pill::before \{[^}]*radial-gradient\(120px circle at var\(--mx\) var\(--my\)/);
  assert.match(css, /\.stack-pill:hover::before \{\s*opacity: 1;/);
});

test('the spotlight is one rAF-throttled, mouse-only pointermove on the cloud', () => {
  assert.match(tools, /if \(e\.pointerType !== 'mouse'\) return;/);
  assert.match(tools, /spotFrame\.current = requestAnimationFrame\(/);
  assert.match(tools, /style\.setProperty\('--mx'/);
  assert.doesNotMatch(tools, /<li className="stack-pill"[^>]*onPointer/);
});

test('a press scales the pill and springs back, never mid-drag', () => {
  assert.match(css, /\.stack-pill:active \{\s*transform: translateY\(-1px\) scale\(0\.97\);/);
  assert.match(css, /transform 320ms cubic-bezier\(0\.34, 1\.4, 0\.64, 1\)/);
  assert.match(css, /\.stack-cloud\[data-dragging\] \.stack-pill:active \{\s*transform: none;/);
});

test('pills rise in once on first view, and stay visible without JS', () => {
  assert.match(tools, /new IntersectionObserver\([\s\S]*threshold: 0\.2/);
  assert.match(tools, /data-seen=\{seen \? '' : undefined\}/);
  assert.match(tools, /data-watch=\{watching \? '' : undefined\}/);
  assert.match(css, /\.stack-cloud\[data-watch\]:not\(\[data-seen\]\) \.stack-pill \{\s*opacity: 0;/);
});

test('reduced motion drops the rise-in, spotlight and press, and shows pills at once', () => {
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(reduced, /\.stack-cloud\[data-animate\] \.stack-pill,[^{]*\{\s*animation: none;/);
  assert.match(reduced, /\.stack-cloud\[data-watch\]:not\(\[data-seen\]\) \.stack-pill \{\s*opacity: 1;/);
  assert.match(reduced, /\.stack-pill::before \{\s*display: none;/);
  assert.match(reduced, /\.stack-pill:active,/);
});

test('the chip clones are hidden from assistive tech and the tab order', () => {
  assert.match(tools, /'data-clone': '', tabIndex: -1, 'aria-hidden': true/);
});
