/**
 * Fetches the stack section's Simple Icons logos into public/logos/.
 *
 *   node scripts/generate-tech-icons.mjs           # only the missing files
 *   node scripts/generate-tech-icons.mjs --force   # every file again
 *
 * Pinned to one simple-icons release (CC0) and committed, so the package is
 * never a dependency of the site (CLAUDE.md rule 4). The slugs are every
 * `logo` in content/site.ts that is not a drawn mark (`drawnLogos`): those
 * have no Simple Icons file and are drawn by hand in public/logos/.
 */
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '16.35.0';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

const { skillGroups, drawnLogos } = await import(
  new URL('../content/site.ts', import.meta.url).href
);

const slugs = [
  ...new Set(
    skillGroups
      .flatMap((group) => group.items)
      .map((item) => item.logo)
      .filter((slug) => slug && !drawnLogos.has(slug)),
  ),
];

let written = 0;
const failed = [];

for (const slug of slugs) {
  const file = path.join(ROOT, 'public/logos', `${slug}.svg`);
  if (existsSync(file) && !force) continue;

  const response = await fetch(
    `https://cdn.jsdelivr.net/npm/simple-icons@${VERSION}/icons/${slug}.svg`,
  );
  if (!response.ok) {
    failed.push(`${slug} (${response.status})`);
    continue;
  }

  writeFileSync(file, await response.text(), 'utf8');
  written += 1;
}

console.log(`written: ${written} of ${slugs.length} logos`);
if (failed.length) {
  console.error(`failed: ${failed.join(', ')}`);
  process.exitCode = 1;
}
