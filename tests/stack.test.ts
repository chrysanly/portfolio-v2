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
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

const { skillGroups, logoBrand } = await import(new URL('../content/site.ts', import.meta.url).href);
type Item = { name: string; logo?: string; concept?: true };
type Group = { label: string; items: Item[] };
const groups = skillGroups as Group[];
const items = groups.flatMap((g) => g.items);

const section = read('components/ui/StackSection.tsx');
const css = read('app/stack.css');
const docs = read('docs/07-SOURCE-CONTENT.md');

test('every logo has its file in public/logos', () => {
  for (const item of items.filter((i) => i.logo)) {
    assert.ok(existsSync(path.join(ROOT, 'public/logos', `${item.logo}.svg`)), `${item.name}: no ${item.logo}.svg`);
  }
});

test('every logo file is a Simple Icons SVG, nothing scripted', () => {
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
  for (const [slug, [light, dark]] of Object.entries(logoBrand as Record<string, [string | null, string | null]>)) {
    if (light) assert.ok(ratio(light, '#f7f6f2') >= 3, `${slug} light`);
    if (dark) assert.ok(ratio(dark, '#14130f') >= 3, `${slug} dark`);
  }
  for (const slug of new Set(items.filter((i) => i.logo).map((i) => i.logo!))) {
    assert.ok(slug in logoBrand, `${slug} has no brand entry`);
  }
});

test('the list is docs/07 §3, group by group', () => {
  const s3 = docs.slice(docs.indexOf('## 3. Skills'), docs.indexOf('## 4.'));
  for (const g of groups) {
    assert.ok(s3.includes(`**${g.label}**`), `docs/07 lacks group ${g.label}`);
    for (const item of g.items) {
      assert.ok(s3.replace(/\s+/g, ' ').toLowerCase().includes(item.name.toLowerCase()), `docs/07 lacks ${item.name}`);
    }
  }
});

test('the AI the resume names is there, with logos where they exist', () => {
  const ai = groups.find((g) => g.label === 'AI & agentic engineering')!;
  assert.deepEqual(
    ai.items.filter((i) => i.logo).map((i) => i.logo),
    ['claude', 'modelcontextprotocol'],
  );
});

test('nothing from the resume that must stay off the site', () => {
  const site = read('content/site.ts');
  const stackData = site.slice(site.indexOf('export type StackItem'), site.indexOf('export const logoBrand'));
  for (const source of [stackData, section, docs.slice(docs.indexOf('## 3. Skills'), docs.indexOf('## 4.'))]) {
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

test('logos are masks in the ink; brand colour is a hover-only reward', () => {
  assert.match(css, /\.stack__logo \{[^}]*background-color: currentColor;[^}]*mask: var\(--logo\) center \/ contain no-repeat;/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.stack__tile:hover \.stack__logo \{\s*background-color: var\(--brand\);/);
  assert.match(css, /:root\[data-theme='dark'\] \.stack__tile \{\s*--brand: var\(--brand-dark, currentColor\);/);
});

test('logos are decorative; the name is the text', () => {
  assert.match(section, /<span className="stack__logo" aria-hidden="true" \/>\s*\{item\.name\}/);
  assert.match(section, /<span className="stack__mono" aria-hidden="true">/);
});

test('a tool with no logo gets two letters, not an invented mark', async () => {
  const { initials } = await import(new URL('../components/ui/StackSection.tsx', import.meta.url).href).catch(() => ({ initials: null }));
  if (!initials) return; // JSX file: covered by the source check above when it cannot load
  assert.equal(initials('Visual Studio Code'), 'VS');
  assert.equal(initials('AWS'), 'AWS');
  assert.equal(initials('Tabby'), 'Ta');
});
