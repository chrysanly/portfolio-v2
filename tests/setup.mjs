/**
 * Lets `node --test` load the site's TypeScript as it is written.
 *
 * Node strips the types itself (22.18+), but its ESM loader wants a file
 * extension on every relative import and knows nothing about the `@/` alias —
 * both of which Next's bundler resolves for the app. This hook does the same
 * two things and nothing else, so the tests need no extra dependency
 * (CLAUDE.md rule 4).
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANDIDATES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function toFile(specifier, parentURL) {
  if (specifier.startsWith('@/')) return path.join(ROOT, specifier.slice(2));
  if (specifier.startsWith('.') && parentURL) {
    return fileURLToPath(new URL(specifier, parentURL));
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const file = toFile(specifier, context.parentURL);

    if (file && !path.extname(file)) {
      const hit = CANDIDATES.map((ext) => file + ext).find((candidate) =>
        existsSync(candidate),
      );
      if (hit) return nextResolve(pathToFileURL(hit).href, context);
    }

    if (file && specifier.startsWith('@/')) {
      return nextResolve(pathToFileURL(file).href, context);
    }

    return nextResolve(specifier, context);
  },
});
